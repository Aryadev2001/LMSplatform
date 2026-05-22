/**
 * Email seam. There is no email provider wired yet (Clerk sends its own auth
 * mail only) — exactly like Stripe/Razorpay are mocked. This logs structured
 * output now; swap the body for Resend/SES later WITHOUT touching any caller.
 *
 * In-scope templates this phase (spec §out-of-scope keeps only these):
 * referral_activated, tier_upgraded, points_expiring,
 * tenant_invite, domain_configured.
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

export async function sendEmail({ to, template, data }: SendEmailInput): Promise<void> {
  if (!to) return;
  // Structured + greppable. Replace with a real provider call later.
  console.info(
    `[email:${template}] → ${to} ${JSON.stringify(data)}`,
  );
}
