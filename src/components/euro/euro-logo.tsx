import { cn } from "@/lib/utils";

/**
 * eurodigital.coach wordmark — EURO (blue) + DIGITAL (green, halftone
 * overlay) + .coach (ink, lighter). Master prompt §1.2.
 */
export function EuroLogo({
  className,
  onDark = false,
}: {
  className?: string;
  onDark?: boolean;
}) {
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
      <span
        className="font-semibold"
        style={{ color: onDark ? "rgba(255,255,255,0.92)" : "var(--ed-ink)" }}
      >
        .coach
      </span>
    </span>
  );
}
