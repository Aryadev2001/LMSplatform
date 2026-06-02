/**
 * Transactional email. Wired to Resend via its REST API (no SDK dependency).
 *
 * Behaviour:
 *  - RESEND_API_KEY set  → sends a real branded email through Resend.
 *  - RESEND_API_KEY unset → logs structured, greppable output (local/preview),
 *    so dev keeps working exactly as before.
 *  - Never throws. Email is non-critical; a provider hiccup must not break the
 *    enrollment / referral / billing flow that triggered it.
 *
 * Env:
 *  - RESEND_API_KEY   — Resend API key (server-only secret).
 *  - EMAIL_FROM       — verified sender, e.g. "eurodigital.coach <noreply@eurodigital.coach>".
 *                       The domain must be verified in Resend (SPF/DKIM) or sends 403.
 */
export type EmailTemplate =
  | "referral_activated"
  | "tier_upgraded"
  | "points_expiring"
  | "tenant_invite"
  | "domain_configured"
  /** Sent the first time a learner pays for any course. Confirms dashboard
   *  access is unlocked. Data: { learnerName, courseName, courseUrl,
   *  dashboardUrl, orderRef }. */
  | "dashboard_unlocked";

export interface SendEmailInput {
  to: string;
  template: EmailTemplate;
  data: Record<string, unknown>;
}

const DEFAULT_FROM = "eurodigital.coach <noreply@eurodigital.coach>";
const BRAND = { ink: "#0e1e2b", blue: "#1AADE0", green: "#6fa62a", mute: "#6b7a8b", line: "#e3e9f0" };

const s = (v: unknown, fallback = ""): string =>
  typeof v === "string" && v.trim() ? v : typeof v === "number" ? String(v) : fallback;

/** Shared, email-client-safe shell (inline styles only). */
function layout(opts: { heading: string; body: string; cta?: { label: string; url: string } }): string {
  const { heading, body, cta } = opts;
  return `<!doctype html><html><body style="margin:0;background:#f5f8fb;padding:24px;font-family:-apple-system,Segoe UI,Roboto,Helvetica,Arial,sans-serif;color:${BRAND.ink}">
  <div style="max-width:520px;margin:0 auto;background:#ffffff;border:1px solid ${BRAND.line};border-radius:14px;overflow:hidden">
    <div style="height:4px;background:linear-gradient(90deg,${BRAND.green},${BRAND.blue})"></div>
    <div style="padding:28px 28px 8px">
      <div style="font-weight:800;font-size:14px;letter-spacing:.06em;color:${BRAND.blue};text-transform:uppercase">eurodigital.coach</div>
      <h1 style="margin:14px 0 10px;font-size:20px;line-height:1.3;color:${BRAND.ink}">${heading}</h1>
      <div style="font-size:14px;line-height:1.6;color:#243447">${body}</div>
      ${
        cta
          ? `<div style="margin:22px 0 6px"><a href="${cta.url}" style="display:inline-block;background:${BRAND.blue};color:#fff;text-decoration:none;font-weight:700;font-size:14px;padding:11px 20px;border-radius:10px">${cta.label}</a></div>`
          : ""
      }
    </div>
    <div style="padding:18px 28px 26px;border-top:1px solid ${BRAND.line};margin-top:18px;font-size:11px;color:${BRAND.mute}">
      You're receiving this because you have an account on eurodigital.coach.
    </div>
  </div></body></html>`;
}

/** Render a template to { subject, html }. Defensive on data fields so a
 *  future caller with a slightly different payload still produces sane mail. */
function render(template: EmailTemplate, data: Record<string, unknown>): { subject: string; html: string } {
  switch (template) {
    case "dashboard_unlocked": {
      const name = s(data.learnerName, "there");
      const course = s(data.courseName, "your course");
      const dashboardUrl = s(data.dashboardUrl, "https://eurodigital.coach/student");
      const courseUrl = s(data.courseUrl);
      const orderRef = s(data.orderRef);
      return {
        subject: `You're enrolled in ${course} 🎉`,
        html: layout({
          heading: `Welcome aboard, ${name}!`,
          body: `Your enrollment in <strong>${course}</strong> is confirmed and your learning dashboard is now unlocked.${
            courseUrl ? ` You can also <a href="${courseUrl}" style="color:${BRAND.blue}">view the course page</a>.` : ""
          }${orderRef ? `<br/><br/><span style="color:${BRAND.mute}">Order ref: ${orderRef}</span>` : ""}`,
          cta: { label: "Go to your dashboard", url: dashboardUrl },
        }),
      };
    }
    case "referral_activated": {
      const points = s(data.points, "0");
      return {
        subject: `You earned ${points} reward points`,
        html: layout({
          heading: `Your referral just paid off`,
          body: `A learner you referred enrolled in a paid course, so you've earned <strong>${points} reward points</strong> (1 point = ₹1). Redeem them at your next checkout.`,
          cta: { label: "View your points", url: "https://eurodigital.coach/student/points" },
        }),
      };
    }
    case "tier_upgraded": {
      const tier = s(data.tier, "a new tier");
      return {
        subject: `You've reached ${tier}`,
        html: layout({
          heading: `Congrats — you've reached ${tier}!`,
          body: `Your referrals pushed you up to <strong>${tier}</strong>. Keep sharing your courses to unlock the next reward.`,
          cta: { label: "See your rewards", url: "https://eurodigital.coach/student/referrals" },
        }),
      };
    }
    case "points_expiring": {
      const points = s(data.points, "Some");
      const on = s(data.expiresOn);
      return {
        subject: `Your reward points are expiring soon`,
        html: layout({
          heading: `Use your points before they expire`,
          body: `You have <strong>${points} reward points</strong>${on ? ` expiring on <strong>${on}</strong>` : " expiring soon"}. Apply them at checkout so they don't go to waste.`,
          cta: { label: "Browse courses", url: "https://eurodigital.coach/explore" },
        }),
      };
    }
    case "tenant_invite": {
      const tenantName = s(data.tenantName, "a workspace");
      const inviteUrl = s(data.inviteUrl, "https://eurodigital.coach/accept-invite");
      return {
        subject: `You've been invited to ${tenantName} on eurodigital.coach`,
        html: layout({
          heading: `You've been invited to ${tenantName}`,
          body: `You've been added to <strong>${tenantName}</strong> on eurodigital.coach. Click below to accept and sign in — no password needed.`,
          cta: { label: "Accept invitation", url: inviteUrl },
        }),
      };
    }
    case "domain_configured": {
      const domain = s(data.domain, "your custom domain");
      return {
        subject: `Your custom domain is live`,
        html: layout({
          heading: `${domain} is now live`,
          body: `Your storefront is now served on <strong>${domain}</strong>. Students can reach your courses there directly.`,
        }),
      };
    }
  }
}

export async function sendEmail({ to, template, data }: SendEmailInput): Promise<void> {
  if (!to) return;

  const apiKey = process.env.RESEND_API_KEY;
  const from = process.env.EMAIL_FROM || DEFAULT_FROM;

  // No provider configured (local / preview) — keep the structured, greppable
  // log so nothing silently disappears in dev.
  if (!apiKey) {
    console.info(`[email:${template}] → ${to} ${JSON.stringify(data)} (RESEND_API_KEY unset — not sent)`);
    return;
  }

  let subject: string;
  let html: string;
  try {
    ({ subject, html } = render(template, data));
  } catch (e) {
    console.error(`[email:${template}] render failed:`, e);
    return;
  }

  try {
    const res = await fetch("https://api.resend.com/emails", {
      method: "POST",
      headers: {
        Authorization: `Bearer ${apiKey}`,
        "Content-Type": "application/json",
      },
      body: JSON.stringify({ from, to: [to], subject, html }),
      // Never hang a request flow on the mail provider.
      signal: AbortSignal.timeout(10_000),
    });
    if (!res.ok) {
      const detail = await res.text().catch(() => "");
      console.error(`[email:${template}] Resend ${res.status}: ${detail.slice(0, 300)}`);
    }
  } catch (e) {
    // Swallow — email is non-critical and must not break the caller.
    console.error(`[email:${template}] send error:`, e instanceof Error ? e.message : e);
  }
}
