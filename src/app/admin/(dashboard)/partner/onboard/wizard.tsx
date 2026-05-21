"use client";

import { useState, useTransition } from "react";
import { useRouter } from "next/navigation";
import Link from "next/link";
import { toast } from "sonner";
import {
  Check,
  ChevronLeft,
  ChevronRight,
  Building2,
  Megaphone,
  UserSquare2,
  FileCheck2,
  Loader2,
  BookOpen,
  Video,
  ArrowUpRight,
} from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { FileUpload } from "@/components/file-upload";
import { ProgramDialog } from "../../programs/program-dialog";
import { formatCurrency } from "@/lib/format";
import {
  saveBusinessStep,
  saveBrandingStep,
  saveOwnerStep,
  finalizeOnboarding,
} from "../actions";

type SocialKey =
  | "website"
  | "linkedin"
  | "twitter"
  | "instagram"
  | "facebook"
  | "youtube";

type Socials = Partial<Record<SocialKey, string>>;

const SOCIAL_FIELDS: { key: SocialKey; label: string; placeholder: string }[] = [
  { key: "website", label: "Website", placeholder: "https://yourcompany.com" },
  { key: "linkedin", label: "LinkedIn", placeholder: "https://linkedin.com/company/…" },
  { key: "twitter", label: "X / Twitter", placeholder: "https://x.com/…" },
  { key: "instagram", label: "Instagram", placeholder: "https://instagram.com/…" },
  { key: "facebook", label: "Facebook", placeholder: "https://facebook.com/…" },
  { key: "youtube", label: "YouTube", placeholder: "https://youtube.com/@…" },
];

interface BusinessState {
  legalName: string;
  regNumber: string;
  regDocUrl: string;
  addressLine1: string;
  addressLine2: string;
  city: string;
  state: string;
  postalCode: string;
  country: string;
  phone: string;
  annualRevenueRange: string;
  taxId: string;
  bankReference: string;
}

interface BrandingState {
  companyProfile: string;
  socials: Socials;
}

interface OwnerState {
  name: string;
  title: string;
  photoUrl: string;
  profile: string;
  socials: Socials;
}

export interface CourseSummary {
  id: string;
  name: string;
  priceCents: number;
  currency: string;
  isActive: boolean;
  imageUrl: string | null;
  moduleCount: number;
}

export interface InitialOnboardingData {
  business: BusinessState;
  branding: BrandingState;
  owner: OwnerState;
  courses: CourseSummary[];
}

const STEPS = [
  { id: 0, label: "Business", icon: Building2 },
  { id: 1, label: "Branding", icon: Megaphone },
  { id: 2, label: "Owner", icon: UserSquare2 },
  { id: 3, label: "Courses", icon: BookOpen },
  { id: 4, label: "Review", icon: FileCheck2 },
] as const;

const REVENUE_RANGES = [
  "Pre-revenue",
  "Under $100k / yr",
  "$100k – $1M / yr",
  "$1M – $10M / yr",
  "$10M+ / yr",
];

function SocialsBlock({
  value,
  onChange,
}: {
  value: Socials;
  onChange: (next: Socials) => void;
}) {
  return (
    <div className="grid gap-3 sm:grid-cols-2">
      {SOCIAL_FIELDS.map((f) => (
        <div key={f.key}>
          <Label className="text-xs font-medium">{f.label}</Label>
          <Input
            type="url"
            inputMode="url"
            value={value[f.key] ?? ""}
            onChange={(e) => onChange({ ...value, [f.key]: e.target.value })}
            placeholder={f.placeholder}
            className="mt-1.5 h-10 rounded-xl"
          />
        </div>
      ))}
    </div>
  );
}

export function OnboardingWizard({ initial }: { initial: InitialOnboardingData }) {
  const router = useRouter();
  const [step, setStep] = useState(0);
  const [pending, startTransition] = useTransition();

  const [business, setBusiness] = useState<BusinessState>(initial.business);
  const [branding, setBranding] = useState<BrandingState>(initial.branding);
  const [owner, setOwner] = useState<OwnerState>(initial.owner);

  function setB<K extends keyof BusinessState>(key: K, val: BusinessState[K]) {
    setBusiness((s) => ({ ...s, [key]: val }));
  }
  function setBr<K extends keyof BrandingState>(key: K, val: BrandingState[K]) {
    setBranding((s) => ({ ...s, [key]: val }));
  }
  function setO<K extends keyof OwnerState>(key: K, val: OwnerState[K]) {
    setOwner((s) => ({ ...s, [key]: val }));
  }

  function goNext() {
    if (step === 0) {
      startTransition(async () => {
        const r = await saveBusinessStep(business);
        if (!r.success) {
          toast.error(r.error);
          return;
        }
        toast.success("Business details saved");
        setStep(1);
      });
    } else if (step === 1) {
      startTransition(async () => {
        const r = await saveBrandingStep({
          companyProfile: branding.companyProfile,
          socials: branding.socials,
        });
        if (!r.success) {
          toast.error(r.error);
          return;
        }
        toast.success("Branding saved");
        setStep(2);
      });
    } else if (step === 2) {
      startTransition(async () => {
        const r = await saveOwnerStep(owner);
        if (!r.success) {
          toast.error(r.error);
          return;
        }
        toast.success("Owner details saved");
        setStep(3);
      });
    } else if (step === 3) {
      // Courses step has its own per-course save — no aggregate save here.
      setStep(4);
    } else if (step === 4) {
      startTransition(async () => {
        const r = await finalizeOnboarding();
        if (!r.success) {
          toast.error(r.error);
          return;
        }
        toast.success("Partner profile complete!");
        router.push("/admin/partner");
        router.refresh();
      });
    }
  }

  function goBack() {
    if (step > 0) setStep((s) => s - 1);
  }

  return (
    <div className="space-y-6">
      {/* Step indicator */}
      <ol className="flex flex-wrap items-center gap-2 rounded-2xl border bg-white p-3 text-sm">
        {STEPS.map((s, i) => {
          const active = i === step;
          const done = i < step;
          return (
            <li
              key={s.id}
              className="flex items-center gap-2"
              aria-current={active ? "step" : undefined}
            >
              <button
                type="button"
                onClick={() => i <= step && setStep(i)}
                disabled={i > step}
                className={`flex items-center gap-2 rounded-xl px-3 py-1.5 transition-colors ${
                  active
                    ? "bg-[var(--ed-ink)] text-white"
                    : done
                      ? "bg-[var(--ed-bg)]"
                      : "opacity-60"
                }`}
              >
                <span
                  className={`flex size-6 items-center justify-center rounded-full text-[11px] font-bold ${
                    active
                      ? "bg-white/20 text-white"
                      : done
                        ? "bg-[var(--ed-green)] text-white"
                        : "bg-[var(--ed-bg)] text-[var(--ed-mute)]"
                  }`}
                >
                  {done ? <Check className="size-3.5" strokeWidth={3} /> : i + 1}
                </span>
                <span className="text-xs font-semibold">{s.label}</span>
              </button>
              {i < STEPS.length - 1 && (
                <ChevronRight className="size-4 opacity-30" />
              )}
            </li>
          );
        })}
      </ol>

      {/* Step content */}
      <div className="rounded-2xl border bg-white p-6 md:p-8">
        {step === 0 && (
          <div className="space-y-6">
            <div>
              <h2 className="text-lg font-bold">Business registration</h2>
              <p className="mt-1 text-xs text-muted-foreground">
                Used for invoicing, payouts, and verifying your storefront. All
                fields can be edited later from Settings.
              </p>
            </div>

            <div className="grid gap-4 sm:grid-cols-2">
              <div>
                <Label className="text-xs font-medium">Legal name</Label>
                <Input
                  value={business.legalName}
                  onChange={(e) => setB("legalName", e.target.value)}
                  placeholder="Acme Education Pvt Ltd"
                  className="mt-1.5 h-10 rounded-xl"
                />
              </div>
              <div>
                <Label className="text-xs font-medium">Registration #</Label>
                <Input
                  value={business.regNumber}
                  onChange={(e) => setB("regNumber", e.target.value)}
                  placeholder="e.g. CIN / EIN / GST"
                  className="mt-1.5 h-10 rounded-xl"
                />
              </div>
            </div>

            <div>
              <Label className="text-xs font-medium">
                Business registration document
              </Label>
              <p className="mt-1 text-[11px] text-muted-foreground">
                PDF or image. Visible only to the platform team for verification.
              </p>
              <div className="mt-2">
                <FileUpload
                  accept="application/pdf,image/*"
                  label="Registration doc"
                  value={business.regDocUrl || null}
                  onUploaded={(url) => setB("regDocUrl", url)}
                  onClear={() => setB("regDocUrl", "")}
                />
              </div>
            </div>

            <div className="grid gap-4 sm:grid-cols-2">
              <div className="sm:col-span-2">
                <Label className="text-xs font-medium">Address line 1</Label>
                <Input
                  value={business.addressLine1}
                  onChange={(e) => setB("addressLine1", e.target.value)}
                  className="mt-1.5 h-10 rounded-xl"
                />
              </div>
              <div className="sm:col-span-2">
                <Label className="text-xs font-medium">Address line 2</Label>
                <Input
                  value={business.addressLine2}
                  onChange={(e) => setB("addressLine2", e.target.value)}
                  className="mt-1.5 h-10 rounded-xl"
                />
              </div>
              <div>
                <Label className="text-xs font-medium">City</Label>
                <Input
                  value={business.city}
                  onChange={(e) => setB("city", e.target.value)}
                  className="mt-1.5 h-10 rounded-xl"
                />
              </div>
              <div>
                <Label className="text-xs font-medium">State / Region</Label>
                <Input
                  value={business.state}
                  onChange={(e) => setB("state", e.target.value)}
                  className="mt-1.5 h-10 rounded-xl"
                />
              </div>
              <div>
                <Label className="text-xs font-medium">Postal code</Label>
                <Input
                  value={business.postalCode}
                  onChange={(e) => setB("postalCode", e.target.value)}
                  className="mt-1.5 h-10 rounded-xl"
                />
              </div>
              <div>
                <Label className="text-xs font-medium">
                  Country (ISO 2-letter)
                </Label>
                <Input
                  value={business.country}
                  onChange={(e) => setB("country", e.target.value.toUpperCase())}
                  maxLength={2}
                  placeholder="IN / AE / US…"
                  className="mt-1.5 h-10 rounded-xl uppercase"
                />
              </div>
              <div className="sm:col-span-2">
                <Label className="text-xs font-medium">Business phone</Label>
                <Input
                  type="tel"
                  value={business.phone}
                  onChange={(e) => setB("phone", e.target.value)}
                  className="mt-1.5 h-10 rounded-xl"
                />
              </div>
            </div>

            <div>
              <div className="mb-3 text-xs font-bold uppercase tracking-widest text-muted-foreground">
                Financial information
              </div>
              <div className="grid gap-4 sm:grid-cols-2">
                <div>
                  <Label className="text-xs font-medium">
                    Annual revenue range
                  </Label>
                  <select
                    value={business.annualRevenueRange}
                    onChange={(e) =>
                      setB("annualRevenueRange", e.target.value)
                    }
                    className="mt-1.5 h-10 w-full rounded-xl border border-input bg-background px-3 text-sm"
                  >
                    <option value="">Select…</option>
                    {REVENUE_RANGES.map((r) => (
                      <option key={r} value={r}>
                        {r}
                      </option>
                    ))}
                  </select>
                </div>
                <div>
                  <Label className="text-xs font-medium">
                    Tax ID (GST / VAT / EIN)
                  </Label>
                  <Input
                    value={business.taxId}
                    onChange={(e) => setB("taxId", e.target.value)}
                    className="mt-1.5 h-10 rounded-xl"
                  />
                </div>
                <div className="sm:col-span-2">
                  <Label className="text-xs font-medium">
                    Bank account reference
                  </Label>
                  <Input
                    value={business.bankReference}
                    onChange={(e) => setB("bankReference", e.target.value)}
                    placeholder="Last 4 of account / SWIFT — for payout matching"
                    className="mt-1.5 h-10 rounded-xl"
                  />
                  <p className="mt-1 text-[11px] text-muted-foreground">
                    Don&apos;t paste the full account number — we use this only
                    to reconcile payouts you&apos;ve set up in your own gateway.
                  </p>
                </div>
              </div>
            </div>
          </div>
        )}

        {step === 1 && (
          <div className="space-y-6">
            <div>
              <h2 className="text-lg font-bold">
                Branding &amp; company profile
              </h2>
              <p className="mt-1 text-xs text-muted-foreground">
                Your <strong>logo</strong>, brand colors, and hero tagline are
                managed in{" "}
                <Link
                  href="/admin/settings"
                  className="font-semibold underline underline-offset-2"
                >
                  Settings → Branding
                </Link>
                . Use this step for the public &ldquo;About&rdquo; copy and your
                social links.
              </p>
            </div>

            <div>
              <Label className="text-xs font-medium">Company profile</Label>
              <Textarea
                value={branding.companyProfile}
                onChange={(e) => setBr("companyProfile", e.target.value)}
                placeholder="A short paragraph about your school / institute. Shown on your storefront page."
                className="mt-1.5 min-h-[120px] rounded-xl"
              />
              <p className="mt-1 text-[11px] text-muted-foreground">
                {branding.companyProfile.length} / 4000 characters
              </p>
            </div>

            <div>
              <div className="mb-3 text-xs font-bold uppercase tracking-widest text-muted-foreground">
                Social media links
              </div>
              <SocialsBlock
                value={branding.socials}
                onChange={(s) => setBr("socials", s)}
              />
            </div>
          </div>
        )}

        {step === 2 && (
          <div className="space-y-6">
            <div>
              <h2 className="text-lg font-bold">Owner / primary contact</h2>
              <p className="mt-1 text-xs text-muted-foreground">
                The face behind the brand. Shown on your storefront so learners
                know who they&apos;re learning from.
              </p>
            </div>

            <div>
              <Label className="text-xs font-medium">Photo</Label>
              <div className="mt-2 flex items-center gap-4">
                <div className="flex size-20 items-center justify-center overflow-hidden rounded-full border border-black/10 bg-secondary/40">
                  {owner.photoUrl ? (
                    // eslint-disable-next-line @next/next/no-img-element
                    <img
                      src={owner.photoUrl}
                      alt="Owner"
                      className="size-full object-cover"
                    />
                  ) : (
                    <span className="text-[10px] text-muted-foreground">
                      No photo
                    </span>
                  )}
                </div>
                <div className="flex-1">
                  <FileUpload
                    accept="image/*"
                    label="Owner photo"
                    value={owner.photoUrl || null}
                    onUploaded={(url) => setO("photoUrl", url)}
                    onClear={() => setO("photoUrl", "")}
                  />
                </div>
              </div>
            </div>

            <div className="grid gap-4 sm:grid-cols-2">
              <div>
                <Label className="text-xs font-medium">Name</Label>
                <Input
                  value={owner.name}
                  onChange={(e) => setO("name", e.target.value)}
                  placeholder="Full name"
                  className="mt-1.5 h-10 rounded-xl"
                />
              </div>
              <div>
                <Label className="text-xs font-medium">Title / role</Label>
                <Input
                  value={owner.title}
                  onChange={(e) => setO("title", e.target.value)}
                  placeholder="Founder, Head of Faculty, …"
                  className="mt-1.5 h-10 rounded-xl"
                />
              </div>
            </div>

            <div>
              <Label className="text-xs font-medium">Profile / bio</Label>
              <Textarea
                value={owner.profile}
                onChange={(e) => setO("profile", e.target.value)}
                placeholder="Short bio shown next to the owner photo on your storefront."
                className="mt-1.5 min-h-[120px] rounded-xl"
              />
              <p className="mt-1 text-[11px] text-muted-foreground">
                {owner.profile.length} / 4000 characters
              </p>
            </div>

            <div>
              <div className="mb-3 text-xs font-bold uppercase tracking-widest text-muted-foreground">
                Owner social links
              </div>
              <SocialsBlock
                value={owner.socials}
                onChange={(s) => setO("socials", s)}
              />
            </div>
          </div>
        )}

        {step === 3 && <CoursesStep courses={initial.courses} />}

        {step === 4 && (
          <ReviewStep
            business={business}
            branding={branding}
            owner={owner}
            courses={initial.courses}
          />
        )}
      </div>

      {/* Footer */}
      <div className="flex items-center justify-between">
        <Button
          type="button"
          variant="outline"
          onClick={goBack}
          disabled={step === 0 || pending}
          className="h-11 rounded-xl"
        >
          <ChevronLeft className="size-4" />
          Back
        </Button>

        <div className="text-xs text-muted-foreground">
          Step {step + 1} of {STEPS.length}
        </div>

        <Button
          type="button"
          onClick={goNext}
          disabled={pending}
          className="h-11 rounded-xl bg-[var(--ed-ink)] text-white hover:opacity-90"
        >
          {pending ? (
            <>
              <Loader2 className="size-4 animate-spin" /> Saving…
            </>
          ) : step === STEPS.length - 1 ? (
            <>Mark as complete <Check className="size-4" /></>
          ) : (
            <>Save &amp; continue <ChevronRight className="size-4" /></>
          )}
        </Button>
      </div>
    </div>
  );
}

function Row({ label, value }: { label: string; value: string | null }) {
  return (
    <div className="grid grid-cols-[180px_1fr] gap-3 border-b py-2 text-sm last:border-b-0">
      <span className="text-xs font-medium uppercase tracking-wider text-muted-foreground">
        {label}
      </span>
      <span className={value ? "text-foreground" : "text-muted-foreground"}>
        {value || "—"}
      </span>
    </div>
  );
}

function CoursesStep({ courses }: { courses: CourseSummary[] }) {
  return (
    <div className="space-y-6">
      <div>
        <h2 className="text-lg font-bold">Your courses</h2>
        <p className="mt-1 text-xs text-muted-foreground">
          Create one or more courses, then open each to add modules, videos,
          exams, certificates, and offers. Free courses are fine — you can
          mix free and paid in the same catalog.
        </p>
      </div>

      <div className="flex flex-wrap items-center gap-3">
        <ProgramDialog mode="create" />
        <Link
          href="/admin/programs"
          className="inline-flex h-10 items-center gap-1.5 rounded-xl border px-4 text-xs font-semibold transition-colors hover:bg-secondary"
        >
          Open the course manager
          <ArrowUpRight className="size-3.5" />
        </Link>
      </div>

      {courses.length === 0 ? (
        <div className="rounded-2xl border border-dashed py-12 text-center text-sm text-muted-foreground">
          No courses yet. Click <strong>+ New program</strong> above to create
          your first one — you can come back and add more anytime.
        </div>
      ) : (
        <ul className="space-y-3">
          {courses.map((c) => (
            <li
              key={c.id}
              className="flex items-center gap-4 rounded-2xl border bg-white p-4"
            >
              <div className="flex size-14 shrink-0 items-center justify-center overflow-hidden rounded-xl border bg-secondary/40">
                {c.imageUrl ? (
                  // eslint-disable-next-line @next/next/no-img-element
                  <img
                    src={c.imageUrl}
                    alt={c.name}
                    className="size-full object-cover"
                  />
                ) : (
                  <BookOpen className="size-5 text-muted-foreground" />
                )}
              </div>
              <div className="min-w-0 flex-1">
                <div className="flex items-center gap-2">
                  <span className="truncate text-sm font-bold">{c.name}</span>
                  {!c.isActive && (
                    <span className="rounded-full bg-secondary px-2 py-0.5 text-[10px] uppercase tracking-wider text-muted-foreground">
                      Inactive
                    </span>
                  )}
                </div>
                <div className="mt-0.5 flex items-center gap-3 text-xs text-muted-foreground">
                  <span className="font-semibold text-foreground">
                    {c.priceCents === 0
                      ? "Free"
                      : formatCurrency(c.priceCents, c.currency)}
                  </span>
                  <span className="inline-flex items-center gap-1">
                    <Video className="size-3.5" />
                    {c.moduleCount} module{c.moduleCount === 1 ? "" : "s"}
                  </span>
                </div>
              </div>
              <Link
                href={`/admin/programs/${c.id}`}
                className="inline-flex h-9 items-center gap-1.5 rounded-xl border px-3 text-xs font-semibold transition-colors hover:bg-secondary"
              >
                Manage modules &amp; videos
                <ArrowUpRight className="size-3.5" />
              </Link>
            </li>
          ))}
        </ul>
      )}

      <div className="rounded-xl border border-dashed p-3 text-[11px] leading-relaxed text-muted-foreground">
        Each course supports modules with their own intro video, video lessons,
        downloadable resources, an exam Q-bank, and a completion certificate
        template. Use <strong>Manage modules &amp; videos</strong> on a course
        row to open the full editor.
      </div>
    </div>
  );
}

function ReviewStep({
  business,
  branding,
  owner,
  courses,
}: {
  business: BusinessState;
  branding: BrandingState;
  owner: OwnerState;
  courses: CourseSummary[];
}) {
  const fullAddress = [
    business.addressLine1,
    business.addressLine2,
    [business.city, business.state, business.postalCode].filter(Boolean).join(", "),
    business.country,
  ]
    .filter(Boolean)
    .join(" · ");

  const ownerSocialsList = (Object.entries(owner.socials) as [SocialKey, string][])
    .filter(([, v]) => v)
    .map(([k, v]) => `${k}: ${v}`)
    .join("  ·  ");

  const companySocialsList = (
    Object.entries(branding.socials) as [SocialKey, string][]
  )
    .filter(([, v]) => v)
    .map(([k, v]) => `${k}: ${v}`)
    .join("  ·  ");

  return (
    <div className="space-y-6">
      <div>
        <h2 className="text-lg font-bold">Review &amp; complete</h2>
        <p className="mt-1 text-xs text-muted-foreground">
          You can edit any of this later from Settings or by coming back to the
          wizard.
        </p>
      </div>

      <section>
        <h3 className="mb-1 text-xs font-bold uppercase tracking-widest text-muted-foreground">
          Business
        </h3>
        <div className="rounded-xl border">
          <Row label="Legal name" value={business.legalName || null} />
          <Row label="Reg #" value={business.regNumber || null} />
          <Row
            label="Reg doc"
            value={business.regDocUrl ? "Uploaded" : null}
          />
          <Row label="Address" value={fullAddress || null} />
          <Row label="Phone" value={business.phone || null} />
          <Row
            label="Revenue range"
            value={business.annualRevenueRange || null}
          />
          <Row label="Tax ID" value={business.taxId || null} />
          <Row
            label="Bank reference"
            value={business.bankReference || null}
          />
        </div>
      </section>

      <section>
        <h3 className="mb-1 text-xs font-bold uppercase tracking-widest text-muted-foreground">
          Branding
        </h3>
        <div className="rounded-xl border">
          <Row
            label="Company profile"
            value={branding.companyProfile || null}
          />
          <Row
            label="Social links"
            value={companySocialsList || null}
          />
        </div>
      </section>

      <section>
        <h3 className="mb-1 text-xs font-bold uppercase tracking-widest text-muted-foreground">
          Owner
        </h3>
        <div className="rounded-xl border">
          <Row label="Photo" value={owner.photoUrl ? "Uploaded" : null} />
          <Row label="Name" value={owner.name || null} />
          <Row label="Title" value={owner.title || null} />
          <Row label="Profile" value={owner.profile || null} />
          <Row label="Social links" value={ownerSocialsList || null} />
        </div>
      </section>

      <section>
        <h3 className="mb-1 text-xs font-bold uppercase tracking-widest text-muted-foreground">
          Courses
        </h3>
        <div className="rounded-xl border">
          <Row
            label="Total courses"
            value={courses.length === 0 ? null : String(courses.length)}
          />
          <Row
            label="With modules"
            value={
              courses.some((c) => c.moduleCount > 0)
                ? String(courses.filter((c) => c.moduleCount > 0).length)
                : null
            }
          />
          <Row
            label="Active courses"
            value={
              courses.some((c) => c.isActive)
                ? String(courses.filter((c) => c.isActive).length)
                : null
            }
          />
        </div>
      </section>
    </div>
  );
}
