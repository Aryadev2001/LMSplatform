import Link from "next/link";
import { ShieldCheck, ShieldX } from "lucide-react";
import { getCertificate } from "@/lib/certificate";
import { EuroNav } from "@/components/euro/euro-nav";
import { EuroFooter } from "@/components/euro/euro-footer";

export const dynamic = "force-dynamic";

export const metadata = { title: "Verify certificate — eurodigital.coach" };

export default async function VerifyPage({
  params,
}: {
  params: Promise<{ id: string }>;
}) {
  const { id } = await params;
  const cert = await getCertificate(id).catch(() => null);
  const valid = !!cert && cert.completed;

  return (
    <div style={{ background: "var(--ed-bg)" }} className="min-h-screen">
      <EuroNav />
      <main className="mx-auto max-w-lg px-6 py-20">
        <div
          className="rounded-3xl border bg-white p-10 text-center shadow-sm"
          style={{ borderColor: "var(--ed-line)" }}
        >
          {valid ? (
            <>
              <div
                className="mx-auto flex size-14 items-center justify-center rounded-2xl text-white"
                style={{ background: "var(--ed-gradient)" }}
              >
                <ShieldCheck className="size-7" />
              </div>
              <h1 className="mt-5 text-2xl font-extrabold" style={{ color: "var(--ed-ink)" }}>
                Certificate verified
              </h1>
              <p className="mt-1 text-sm" style={{ color: "var(--ed-mute)" }}>
                This is a genuine eurodigital.coach credential.
              </p>
              <dl
                className="mt-6 divide-y rounded-2xl border text-left text-sm"
                style={{ borderColor: "var(--ed-line)" }}
              >
                {[
                  ["Cert ID", cert!.certId],
                  ["Issued to", cert!.name],
                  ["Course", cert!.courseTitle],
                  ["Institute", cert!.instituteName],
                  ["Issued", cert!.issuedAt.toISOString().slice(0, 10)],
                ].map(([k, v]) => (
                  <div key={k} className="flex items-center justify-between px-4 py-3">
                    <dt style={{ color: "var(--ed-mute)" }}>{k}</dt>
                    <dd className="font-semibold" style={{ color: "var(--ed-ink)" }}>{v}</dd>
                  </div>
                ))}
              </dl>
              <p
                className="mt-4 break-all text-[10px]"
                style={{ color: "var(--ed-mute)" }}
              >
                SHA-256 {cert!.anchorHash}
              </p>
            </>
          ) : (
            <>
              <div
                className="mx-auto flex size-14 items-center justify-center rounded-2xl text-white"
                style={{ background: "var(--ed-rose)" }}
              >
                <ShieldX className="size-7" />
              </div>
              <h1 className="mt-5 text-2xl font-extrabold" style={{ color: "var(--ed-ink)" }}>
                Not verified
              </h1>
              <p className="mt-2 text-sm" style={{ color: "var(--ed-mute)" }}>
                We couldn&apos;t verify this certificate ID, or the course
                isn&apos;t completed yet.
              </p>
              <Link
                href="/"
                className="mt-6 inline-block rounded-xl px-5 py-2.5 text-sm font-bold text-white"
                style={{ background: "var(--ed-gradient)" }}
              >
                Go to eurodigital.coach
              </Link>
            </>
          )}
        </div>
      </main>
      <EuroFooter />
    </div>
  );
}
