import { cn } from "@/lib/utils";

interface BrandMarkProps {
  className?: string;
}

/**
 * EDT mark — gradient rounded square with "E" cut-out. Uses the brand CSS
 * vars so it auto-whitelabels (TenantBrandStyle rebinds --brand-green/blue).
 */
export function BrandMark({ className }: BrandMarkProps) {
  return (
    <svg
      viewBox="0 0 32 32"
      fill="none"
      xmlns="http://www.w3.org/2000/svg"
      className={cn("size-7", className)}
      aria-hidden="true"
    >
      <defs>
        <linearGradient id="edt-mark" x1="0" y1="0" x2="32" y2="32" gradientUnits="userSpaceOnUse">
          <stop stopColor="var(--brand-green)" />
          <stop offset="1" stopColor="var(--brand-blue)" />
        </linearGradient>
      </defs>
      <rect width="32" height="32" rx="8" fill="url(#edt-mark)" />
      <path
        d="M11 9h11v3.2h-7.4v3h6.6v3.1h-6.6v3.5H22V25H11z"
        fill="#FFFFFF"
        fillOpacity="0.96"
      />
    </svg>
  );
}

interface BrandProps {
  className?: string;
  wordmarkClassName?: string;
  /** tenant logo — when set, replaces the mark+wordmark with the image */
  logoUrl?: string | null;
  /** tenant display name (logo alt + wordmark when whitelabeled) */
  name?: string | null;
}

export function Brand({
  className,
  wordmarkClassName,
  logoUrl,
  name,
}: BrandProps) {
  if (logoUrl) {
    return (
      // eslint-disable-next-line @next/next/no-img-element
      <img
        src={logoUrl}
        alt={name ?? "Logo"}
        className={cn("h-7 w-auto object-contain", className)}
      />
    );
  }

  const label = name ?? "eurodigital.coach";
  return (
    <div className={cn("inline-flex items-center gap-2 text-foreground", className)}>
      <BrandMark />
      <span className={cn("text-sm font-semibold tracking-tight", wordmarkClassName)}>
        {label}
      </span>
    </div>
  );
}
