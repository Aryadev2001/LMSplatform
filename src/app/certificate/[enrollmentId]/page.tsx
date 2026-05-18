import Link from "next/link";
import { notFound } from "next/navigation";
import { headers } from "next/headers";
import { Trophy, ShieldCheck, Gift, Lock, ArrowRight } from "lucide-react";
import { getCertificate } from "@/lib/certificate";
import { getRelatedCourses } from "@/lib/marketplace";
import { EuroNav } from "@/components/euro/euro-nav";
import { EuroFooter } from "@/components/euro/euro-footer";
import { EuroCourseCard } from "@/components/euro/course-card";
import { CertActions } from "./cert-actions";

export const dynamic = "force-dynamic";

export const metadata = {
  title: "Certificate — eurodigital.coach",
  robots: "noindex",
};

export default async function CertificatePage({
  params,
}: {
  params: Promise<{ enrollmentId: string }>;
}) {
  const { enrollmentId } = await params;
  const cert = await getCertificate(enrollmentId);
  if (!cert) notFound();

  const h = await headers();
  const base =
    process.env.NEXT_PUBLIC_APP_URL ??
    `${h.get("x-forwarded-proto") ?? "https"}://${h.get("host") ?? "localhost:3000"}`;
  const verifyUrl = `${base}/verify/${cert.enrollmentId}`;
  const firstName = cert.name.split(" ")[0];

  if (!cert.completed) {
    return (
      <div style={{ background: "var(--ed-bg)" }} className="min-h-screen">
        <EuroNav />
        <main className="mx-auto max-w-lg px-6 py-20 text-center">
          <div className="rounded-3xl border bg-white p-10" style={{ borderColor: "var(--ed-line)" }}>
            <Lock className="mx-auto size-9" style={{ color: "var(--ed-mute)" }} />
            <h1 className="mt-4 text-xl font-extrabold" style={{ color: "var(--ed-ink)" }}>
              Certificate locked
            </h1>
            <p className="mt-2 text-sm" style={{ color: "var(--ed-mute)" }}>
              Complete <strong>{cert.courseTitle}</strong> to unlock your
              certificate. You&apos;re {cert.percent}% there.
            </p>
            {cert.courseSlug && (
              <Link
                href={`/student/courses/${cert.courseSlug}`}
                className="mt-5 inline-flex items-center gap-2 rounded-xl px-5 py-3 text-sm font-bold text-white"
                style={{ background: "var(--ed-gradient)" }}
              >
                Resume course <ArrowRight className="size-4" />
              </Link>
            )}
          </div>
        </main>
        <EuroFooter />
      </div>
    );
  }

  const related = cert.tenantId
    ? await getRelatedCourses(cert.tenantId, cert.programId, 3)
    : [];

  return (
    <div style={{ background: "var(--ed-bg)" }} className="min-h-screen">
      <style>{`@media print{.no-print{display:none!important}body *{visibility:hidden}#certificate,#certificate *{visibility:visible}#certificate{position:absolute;left:0;top:0;width:100%}}`}</style>
      <div className="no-print">
        <EuroNav />
      </div>

      <main className="mx-auto max-w-3xl px-6 py-14">
        {/* Celebration */}
        <div className="no-print text-center">
          <span
            className="inline-block rounded-full px-4 py-1.5 text-xs font-bold uppercase tracking-widest text-white"
            style={{ background: "var(--ed-green-dark)" }}
          >
            Congratulations, {firstName}! 🎉
          </span>
          <h1
            className="mt-4 text-3xl font-extrabold tracking-tight md:text-4xl"
            style={{ color: "var(--ed-ink)" }}
          >
            You did it. Certificate unlocked.
          </h1>
          <p className="mt-2 text-sm" style={{ color: "var(--ed-mute)" }}>
            You completed {cert.courseTitle}. Cert ID:{" "}
            <span className="font-mono font-semibold">{cert.certId}</span>
          </p>
        </div>

        {/* The certificate */}
        <div
          id="certificate"
          className="mt-8 overflow-hidden rounded-2xl border bg-white shadow-sm"
          style={{ borderColor: "var(--ed-line)" }}
        >
          <div className="h-2.5 w-full" style={{ background: "var(--ed-gradient)" }} />
          <div className="relative px-10 py-12 text-center">
            <div className="absolute inset-0 opacity-[0.05]" style={{ background: "var(--ed-halftone)" }} />
            <div className="relative">
              <Trophy className="mx-auto size-10" style={{ color: "var(--ed-warn)" }} />
              <div
                className="mt-4 text-xs font-bold uppercase tracking-[0.3em]"
                style={{ color: "var(--ed-mute)" }}
              >
                Certificate of Completion
              </div>
              <p className="mt-6 text-xs" style={{ color: "var(--ed-mute)" }}>
                This is to certify that
              </p>
              <div
                className="mt-2 text-4xl italic"
                style={{ fontFamily: 'Georgia, "Times New Roman", serif', color: "var(--ed-ink)" }}
              >
                {cert.name}
              </div>
              <p className="mt-5 text-sm" style={{ color: "var(--ed-ink-2)" }}>
                has successfully completed all modules of
              </p>
              <div className="mt-2 text-xl font-extrabold" style={{ color: "var(--ed-ink)" }}>
                {cert.courseTitle}
              </div>
              <p className="mt-2 text-xs" style={{ color: "var(--ed-mute)" }}>
                Issued by {cert.instituteName} on eurodigital.coach
              </p>

              <div className="mt-8 flex items-center justify-center gap-10 text-left text-xs">
                <div>
                  <div className="font-bold uppercase tracking-widest" style={{ color: "var(--ed-mute)" }}>
                    Date
                  </div>
                  <div style={{ color: "var(--ed-ink)" }}>
                    {cert.issuedAt.toISOString().slice(0, 10)}
                  </div>
                </div>
                <div>
                  <div className="font-bold uppercase tracking-widest" style={{ color: "var(--ed-mute)" }}>
                    Status
                  </div>
                  <div style={{ color: "var(--ed-green-dark)" }}>Completed</div>
                </div>
                <div className="flex items-center gap-1.5" style={{ color: "var(--ed-blue)" }}>
                  <ShieldCheck className="size-4" />
                  <span className="font-bold">Blockchain-verifiable</span>
                </div>
              </div>

              <div
                className="mx-auto mt-6 max-w-md break-all border-t pt-3 text-[10px]"
                style={{ borderColor: "var(--ed-line)", color: "var(--ed-mute)" }}
              >
                SHA-256: {cert.anchorHash}
              </div>
            </div>
          </div>
        </div>

        {/* Actions */}
        <div className="mt-8">
          <CertActions
            verifyUrl={verifyUrl}
            certId={cert.certId}
            courseTitle={cert.courseTitle}
            instituteName={cert.instituteName}
          />
        </div>

        {/* Referral prompt */}
        <div
          className="no-print mt-10 flex flex-col items-center gap-3 rounded-2xl p-7 text-center text-white"
          style={{ background: "var(--ed-ink)" }}
        >
          <Gift className="size-7" style={{ color: "var(--ed-green)" }} />
          <h3 className="text-lg font-extrabold">Share & earn</h3>
          <p className="max-w-sm text-sm" style={{ color: "var(--ed-mute)" }}>
            Refer friends — when they enroll, you earn referral commission as
            reward points.
          </p>
          <Link
            href="/student/referrals"
            className="rounded-xl px-5 py-2.5 text-sm font-bold"
            style={{ background: "var(--ed-gradient)" }}
          >
            Get my referral link
          </Link>
        </div>

        {/* Recommended */}
        {related.length > 0 && (
          <div className="no-print mt-12">
            <h2 className="mb-5 text-lg font-extrabold tracking-tight" style={{ color: "var(--ed-ink)" }}>
              Keep the momentum
            </h2>
            <div className="grid gap-5 sm:grid-cols-3">
              {related.map((c) => (
                <EuroCourseCard key={c.id} c={c} />
              ))}
            </div>
          </div>
        )}
      </main>

      <div className="no-print">
        <EuroFooter />
      </div>
    </div>
  );
}
