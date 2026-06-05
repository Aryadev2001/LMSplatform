import Link from "next/link";
import { Globe, Mail, Share2, MessageCircle } from "lucide-react";
import { EuroLogo } from "./euro-logo";

const COLUMNS: { title: string; links: { label: string; href: string }[] }[] = [
  {
    title: "Marketplace",
    links: [
      { label: "Explore courses", href: "/explore" },
      { label: "Categories", href: "/explore" },
      { label: "Institutes", href: "/explore" },
      { label: "Certifications", href: "/explore" },
    ],
  },
  {
    title: "For Institutes",
    links: [
      { label: "Become a Partner", href: "/contact" },
      { label: "Partner login", href: "/admin/login" },
      { label: "Pricing & plans", href: "/pricing" },
      { label: "Sell courses", href: "/for-institutes" },
    ],
  },
  {
    title: "Company",
    links: [
      { label: "About", href: "/about" },
      { label: "Contact", href: "/contact" },
      { label: "Help center", href: "/help" },
      { label: "For institutes", href: "/for-institutes" },
    ],
  },
  {
    title: "Legal",
    links: [
      { label: "Terms of Service", href: "/legal/terms" },
      { label: "Privacy Policy", href: "/legal/privacy" },
      { label: "Cancellation & Refund", href: "/legal/refund" },
      { label: "Shipping & Delivery", href: "/legal/shipping" },
      { label: "Cookie Policy", href: "/legal/cookies" },
      { label: "Disclaimer", href: "/legal/disclaimer" },
    ],
  },
];

export function EuroFooter() {
  return (
    <footer style={{ background: "var(--ed-ink)" }} className="text-white">
      <div className="mx-auto max-w-7xl px-6 py-14">
        <div className="grid gap-10 md:grid-cols-5">
          <div className="md:col-span-1">
            <EuroLogo onDark />
            <p
              className="mt-4 text-xs leading-relaxed"
              style={{ color: "var(--ed-mute)" }}
            >
              LEARN · CERTIFY · GROW. A global learning marketplace connecting
              verified institutes to learners everywhere.
            </p>
            <div className="mt-4 flex gap-3" style={{ color: "var(--ed-mute)" }}>
              <Globe className="size-4" />
              <Mail className="size-4" />
              <Share2 className="size-4" />
              <MessageCircle className="size-4" />
            </div>
          </div>

          {COLUMNS.map((col) => (
            <div key={col.title}>
              <h4 className="mb-3 text-sm font-bold">{col.title}</h4>
              <ul className="space-y-2">
                {col.links.map((l) => (
                  <li key={l.label}>
                    <Link
                      href={l.href}
                      className="text-xs transition-colors hover:text-white"
                      style={{ color: "var(--ed-mute)" }}
                    >
                      {l.label}
                    </Link>
                  </li>
                ))}
              </ul>
            </div>
          ))}
        </div>

        <div
          className="mt-12 flex flex-col justify-between gap-3 border-t pt-6 text-xs md:flex-row"
          style={{ borderColor: "var(--ed-ink-2)", color: "var(--ed-mute)" }}
        >
          <span>
            © {new Date().getFullYear()} Euro Digital Technologies L.L.C. —
            Abu Dhabi, UAE. UAE Free Zone Trade License.
          </span>
          <span>AI Services powered by europic.ai</span>
        </div>
      </div>
    </footer>
  );
}
