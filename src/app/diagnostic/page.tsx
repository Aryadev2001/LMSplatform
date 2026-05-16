import Link from "next/link";
import { Brand } from "@/components/brand";
import { DiagnosticWizard } from "./diagnostic-wizard";

export const metadata = {
  title: "Business X-Ray — 7-Layer Business Scan",
  description:
    "A 7-minute diagnostic that scores your business across 7 layers and tells you exactly what to fix first.",
};

export default function DiagnosticPage() {
  return (
    <div className="relative isolate flex min-h-screen flex-col items-center bg-secondary/20 px-6 py-10">
      <div className="absolute inset-0 -z-10 bg-grid-soft" />

      <Link href="/" className="self-start">
        <Brand />
      </Link>

      <div className="mt-10 mb-8 max-w-2xl text-center">
        <div
          className="mb-3 inline-block bg-clip-text text-[10px] font-semibold uppercase tracking-widest text-transparent"
          style={{ backgroundImage: "linear-gradient(135deg, #8CC63F 0%, #1AADE0 100%)" }}
        >
          The Business X-Ray
        </div>
        <h1 className="text-balance text-4xl font-semibold tracking-tight md:text-5xl">
          Find out what&apos;s really holding your business back
        </h1>
        <p className="mt-3 text-balance text-muted-foreground">
          A 7-layer scan that scores your business 0–100 and shows you the #1 thing to fix first.
          Takes ~7 minutes. No payment required to see your results.
        </p>
      </div>

      <DiagnosticWizard />
    </div>
  );
}
