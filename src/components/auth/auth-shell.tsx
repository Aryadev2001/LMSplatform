import Link from "next/link";
import { Brand } from "@/components/brand";
import { Quote, Sparkles } from "lucide-react";

interface AuthShellProps {
  children: React.ReactNode;
  eyebrow: string;
  title: string;
  description: string;
}

export function AuthShell({ children, eyebrow, title, description }: AuthShellProps) {
  return (
    <div className="flex min-h-screen bg-background">
      {/* Left — brand panel (static, reliable) */}
      <div className="relative hidden flex-1 flex-col justify-between overflow-hidden bg-foreground p-12 text-background lg:flex">
        {/* subtle static decoration */}
        <div
          aria-hidden
          className="absolute inset-0 opacity-[0.06]"
          style={{
            backgroundImage:
              "radial-gradient(circle at 1px 1px, currentColor 1px, transparent 0)",
            backgroundSize: "32px 32px",
          }}
        />
        <div
          aria-hidden
          className="absolute -right-32 -top-32 size-[420px] rounded-full opacity-20 blur-3xl"
          style={{ background: "radial-gradient(circle, #a78bfa, transparent 70%)" }}
        />

        <Link href="/" className="relative">
          <Brand wordmarkClassName="text-background" />
        </Link>

        <div className="relative max-w-md">
          <Quote className="size-8 text-background/30" />
          <p className="mt-6 text-balance text-2xl font-medium leading-snug tracking-tight md:text-3xl">
            The Business X-Ray showed me the one bottleneck I&apos;d been ignoring for two years.
            Fixed it in 60 days.
          </p>
          <div className="mt-6 flex items-center gap-3">
            <div className="flex size-9 items-center justify-center rounded-full bg-background/10 text-xs font-semibold ring-1 ring-background/15">
              RK
            </div>
            <div className="text-sm">
              <div className="font-medium">Rohan Kapoor</div>
              <div className="text-xs text-background/60">Agency owner · ₹2Cr revenue</div>
            </div>
          </div>
        </div>

        <div className="relative flex items-center gap-2 text-[11px] uppercase tracking-widest text-background/50">
          <Sparkles className="size-3" />
          <span>Magic-link</span>
          <span className="inline-block size-1 rounded-full bg-background/40" />
          <span>Stripe-secured</span>
          <span className="inline-block size-1 rounded-full bg-background/40" />
          <span>GDPR ready</span>
        </div>
      </div>

      {/* Right — form */}
      <div className="relative flex w-full flex-col bg-secondary/20 lg:w-[520px] xl:w-[560px]">
        <Link href="/" className="absolute left-6 top-6 lg:hidden">
          <Brand />
        </Link>

        <div className="flex flex-1 items-center justify-center px-6 py-16 lg:px-12">
          <div className="w-full max-w-md">
            <div className="mb-8 text-center">
              <div className="mb-2 text-[10px] uppercase tracking-widest text-muted-foreground">
                {eyebrow}
              </div>
              <h1 className="text-balance text-3xl font-semibold tracking-tight md:text-4xl">
                {title}
              </h1>
              <p className="mt-2 text-sm text-muted-foreground">{description}</p>
            </div>

            <div className="rounded-2xl bg-card p-8 shadow-soft">
              <div className="flex justify-center">{children}</div>
            </div>
          </div>
        </div>

        <div className="border-t border-black/5 px-6 py-4 text-center text-xs text-muted-foreground lg:px-12">
          © {new Date().getFullYear()} Euro Digital Technologies L.L.C.
        </div>
      </div>
    </div>
  );
}
