import { cn } from "@/lib/utils";

/**
 * eurodigital.coach wordmark — EURO (blue) + DIGITAL (green, halftone
 * overlay) + .coach (ink, lighter). Master prompt §1.2.
 */
export function EuroLogo({ className }: { className?: string }) {
  return (
    <span
      className={cn(
        "select-none text-xl font-extrabold tracking-tight",
        className,
      )}
    >
      <span style={{ color: "var(--ed-blue)" }}>euro</span>
      <span
        className="relative bg-clip-text text-transparent"
        style={{
          backgroundColor: "var(--ed-green)",
          backgroundImage:
            "var(--ed-halftone), linear-gradient(var(--ed-green), var(--ed-green))",
          WebkitBackgroundClip: "text",
          backgroundClip: "text",
        }}
      >
        digital
      </span>
      <span className="font-semibold" style={{ color: "var(--ed-ink)" }}>
        .coach
      </span>
    </span>
  );
}
