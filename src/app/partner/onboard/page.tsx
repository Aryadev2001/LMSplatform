import { EuroNav } from "@/components/euro/euro-nav";
import { EuroFooter } from "@/components/euro/euro-footer";
import { OnboardWizard } from "./onboard-wizard";

export const dynamic = "force-dynamic";

export const metadata = {
  title: "Become a Partner — eurodigital.coach",
  description:
    "Join verified institutes on eurodigital.coach. Get a branded storefront, course builder and payments in ~20 minutes.",
};

export default function PartnerOnboardPage() {
  return (
    <div style={{ background: "var(--ed-bg)" }} className="min-h-screen">
      <EuroNav />
      <section
        className="relative overflow-hidden border-b"
        style={{ borderColor: "var(--ed-line)" }}
      >
        <div className="absolute inset-0 opacity-50" style={{ background: "var(--ed-halftone)" }} />
        <div className="relative mx-auto max-w-3xl px-6 py-12 text-center">
          <h1
            className="text-3xl font-extrabold tracking-tight md:text-4xl"
            style={{ color: "var(--ed-ink)" }}
          >
            Become a Partner on{" "}
            <span className="bg-clip-text text-transparent" style={{ backgroundImage: "var(--ed-gradient)" }}>
              eurodigital.coach
            </span>
          </h1>
          <p className="mt-3 text-sm md:text-base" style={{ color: "var(--ed-mute)" }}>
            Join verified institutes. Setup takes ~20 minutes — save & resume anytime.
          </p>
        </div>
      </section>
      <main className="mx-auto max-w-5xl px-6 py-12">
        <OnboardWizard />
      </main>
      <EuroFooter />
    </div>
  );
}
