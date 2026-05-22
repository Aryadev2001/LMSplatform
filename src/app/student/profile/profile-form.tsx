"use client";

import { useState, useTransition } from "react";
import { useRouter } from "next/navigation";
import { toast } from "sonner";
import {
  Loader2,
  CheckCircle2,
  User,
  Briefcase,
  Wallet,
  Shield,
  AlertCircle,
} from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { Checkbox } from "@/components/ui/checkbox";
import { Card } from "@/components/ui/card";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { saveStudentProfile } from "./actions";
import { PhoneVerification } from "./phone-verification";

type PaymentMode = "card" | "upi" | "netbanking" | "wallet" | "";

export interface InitialProfile {
  fullName: string;
  phone: string;
  dateOfBirth: string;
  address: string;
  personal: {
    gender?: string;
    country?: string;
    city?: string;
    languages?: string;
    studentIdCard?: string;
  };
  professional: {
    occupation?: string;
    company?: string;
    industry?: string;
    experienceYears?: number;
    linkedin?: string;
  };
  financial: {
    incomeRange?: string;
    fundingSource?: string;
    billingAddress?: string;
    taxId?: string;
  };
  paymentModePreference: PaymentMode;
  whatsappConsent: boolean;
  termsAccepted: boolean;
  disclaimerAccepted: boolean;
  complete: boolean;
  phoneVerified: boolean;
}

const INCOME_RANGES = [
  "Under $20k / yr",
  "$20k – $50k / yr",
  "$50k – $100k / yr",
  "$100k – $250k / yr",
  "$250k+ / yr",
];

export function StudentProfileForm({ initial }: { initial: InitialProfile }) {
  const router = useRouter();
  const [pending, startTransition] = useTransition();
  const [s, setS] = useState<InitialProfile>(initial);
  // Persistent error banner. Toasts fade in ~3s and learners were missing
  // them — this stays visible until the next save attempt clears it.
  const [errorMsg, setErrorMsg] = useState<string | null>(null);

  function set<K extends keyof InitialProfile>(k: K, v: InitialProfile[K]) {
    setS((p) => ({ ...p, [k]: v }));
  }
  function setPersonal<K extends keyof InitialProfile["personal"]>(
    k: K,
    v: InitialProfile["personal"][K],
  ) {
    setS((p) => ({ ...p, personal: { ...p.personal, [k]: v } }));
  }
  function setProfessional<K extends keyof InitialProfile["professional"]>(
    k: K,
    v: InitialProfile["professional"][K],
  ) {
    setS((p) => ({ ...p, professional: { ...p.professional, [k]: v } }));
  }
  function setFinancial<K extends keyof InitialProfile["financial"]>(
    k: K,
    v: InitialProfile["financial"][K],
  ) {
    setS((p) => ({ ...p, financial: { ...p.financial, [k]: v } }));
  }

  function onSave() {
    setErrorMsg(null);

    // Client-side pre-flight — surface required-field issues inline before
    // we even hit the server, so the user sees exactly what's missing.
    const reasons: string[] = [];
    if (s.fullName.trim().length < 2)
      reasons.push("Full name (at least 2 characters)");
    if (s.phone.trim().length < 6)
      reasons.push("Mobile number (at least 6 digits)");
    if (!s.termsAccepted)
      reasons.push("Terms & Conditions checkbox at the bottom");
    if (!s.disclaimerAccepted)
      reasons.push("Learner Disclaimer checkbox at the bottom");
    if (reasons.length > 0) {
      const msg = `Please fix: ${reasons.join(" · ")}`;
      setErrorMsg(msg);
      toast.error(msg);
      return;
    }

    startTransition(async () => {
      const r = await saveStudentProfile({
        fullName: s.fullName,
        phone: s.phone,
        dateOfBirth: s.dateOfBirth,
        address: s.address,
        personal: s.personal,
        professional: s.professional,
        financial: s.financial,
        paymentModePreference:
          s.paymentModePreference === ""
            ? undefined
            : s.paymentModePreference,
        whatsappConsent: s.whatsappConsent,
        termsAccepted: s.termsAccepted,
        disclaimerAccepted: s.disclaimerAccepted,
      });
      if (!r.success) {
        setErrorMsg(r.error);
        toast.error(r.error);
        return;
      }
      setErrorMsg(null);
      toast.success("Profile saved");
      router.refresh();
    });
  }

  return (
    <div className="space-y-6">
      {/* Personal */}
      <Section icon={User} title="Personal details">
        <Row>
          <Field label="Full name (as on ID) *">
            <Input
              value={s.fullName}
              onChange={(e) => set("fullName", e.target.value)}
              placeholder="Jane Doe"
              className="h-10 rounded-xl"
            />
          </Field>
          <div className="space-y-1.5">
            <PhoneVerification
              initialPhone={initial.phone}
              initialVerified={initial.phoneVerified}
              onChange={(phone, verified) => {
                setS((p) => ({
                  ...p,
                  phone,
                  // Re-sync the form's phone-verified flag so the Save
                  // gate downstream knows the current state.
                  phoneVerified: verified,
                }));
              }}
            />
          </div>
        </Row>
        <Row>
          <Field label="Date of birth" optional>
            <Input
              type="date"
              value={s.dateOfBirth}
              onChange={(e) => set("dateOfBirth", e.target.value)}
              className="h-10 rounded-xl"
            />
          </Field>
          <Field label="Gender" optional>
            <Select
              value={s.personal.gender ?? ""}
              onValueChange={(v) => v && setPersonal("gender", v)}
            >
              <SelectTrigger className="h-10 rounded-xl">
                <SelectValue placeholder="Choose…" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="female">Female</SelectItem>
                <SelectItem value="male">Male</SelectItem>
                <SelectItem value="non_binary">Non-binary</SelectItem>
                <SelectItem value="prefer_not">Prefer not to say</SelectItem>
              </SelectContent>
            </Select>
          </Field>
        </Row>
        <Row>
          <Field label="Country" optional>
            <Input
              value={s.personal.country ?? ""}
              onChange={(e) => setPersonal("country", e.target.value)}
              placeholder="India"
              className="h-10 rounded-xl"
            />
          </Field>
          <Field label="City" optional>
            <Input
              value={s.personal.city ?? ""}
              onChange={(e) => setPersonal("city", e.target.value)}
              placeholder="Mumbai"
              className="h-10 rounded-xl"
            />
          </Field>
        </Row>
        <Field label="Address" optional>
          <Textarea
            value={s.address}
            onChange={(e) => set("address", e.target.value)}
            rows={2}
            placeholder="Street, area, postal code"
            className="rounded-xl"
          />
        </Field>
        <Field label="Languages spoken" optional>
          <Input
            value={s.personal.languages ?? ""}
            onChange={(e) => setPersonal("languages", e.target.value)}
            placeholder="English, Hindi"
            className="h-10 rounded-xl"
          />
        </Field>
      </Section>

      {/* Professional */}
      <Section icon={Briefcase} title="Professional details">
        <Row>
          <Field label="Occupation / role" optional>
            <Input
              value={s.professional.occupation ?? ""}
              onChange={(e) => setProfessional("occupation", e.target.value)}
              placeholder="Frontend engineer"
              className="h-10 rounded-xl"
            />
          </Field>
          <Field label="Company / organization" optional>
            <Input
              value={s.professional.company ?? ""}
              onChange={(e) => setProfessional("company", e.target.value)}
              placeholder="Acme Inc."
              className="h-10 rounded-xl"
            />
          </Field>
        </Row>
        <Row>
          <Field label="Industry" optional>
            <Input
              value={s.professional.industry ?? ""}
              onChange={(e) => setProfessional("industry", e.target.value)}
              placeholder="SaaS / Fintech / EdTech …"
              className="h-10 rounded-xl"
            />
          </Field>
          <Field label="Years of experience" optional>
            <Input
              type="number"
              min={0}
              max={80}
              value={s.professional.experienceYears ?? ""}
              onChange={(e) =>
                setProfessional(
                  "experienceYears",
                  e.target.value ? Number(e.target.value) : undefined,
                )
              }
              className="h-10 rounded-xl"
            />
          </Field>
        </Row>
        <Field label="LinkedIn URL" optional>
          <Input
            type="url"
            value={s.professional.linkedin ?? ""}
            onChange={(e) => setProfessional("linkedin", e.target.value)}
            placeholder="https://linkedin.com/in/…"
            className="h-10 rounded-xl"
          />
        </Field>
      </Section>

      {/* Financial */}
      <Section icon={Wallet} title="Financial &amp; payment">
        <Row>
          <Field label="Income range" optional>
            <Select
              value={s.financial.incomeRange ?? ""}
              onValueChange={(v) => v && setFinancial("incomeRange", v)}
            >
              <SelectTrigger className="h-10 rounded-xl">
                <SelectValue placeholder="Choose…" />
              </SelectTrigger>
              <SelectContent>
                {INCOME_RANGES.map((r) => (
                  <SelectItem key={r} value={r}>
                    {r}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          </Field>
          <Field label="Preferred payment mode" optional>
            <Select
              value={s.paymentModePreference}
              onValueChange={(v) => v && set("paymentModePreference", v as PaymentMode)}
            >
              <SelectTrigger className="h-10 rounded-xl">
                <SelectValue placeholder="Choose…" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="card">Card</SelectItem>
                <SelectItem value="upi">UPI</SelectItem>
                <SelectItem value="netbanking">Net banking</SelectItem>
                <SelectItem value="wallet">Wallet</SelectItem>
              </SelectContent>
            </Select>
          </Field>
        </Row>
        <Row>
          <Field label="Funding source" optional>
            <Input
              value={s.financial.fundingSource ?? ""}
              onChange={(e) => setFinancial("fundingSource", e.target.value)}
              placeholder="Self / Employer-sponsored / Scholarship"
              className="h-10 rounded-xl"
            />
          </Field>
          <Field label="Tax ID (GST / VAT / TIN)" optional>
            <Input
              value={s.financial.taxId ?? ""}
              onChange={(e) => setFinancial("taxId", e.target.value)}
              className="h-10 rounded-xl"
            />
          </Field>
        </Row>
        <Field label="Billing address" optional>
          <Textarea
            value={s.financial.billingAddress ?? ""}
            onChange={(e) => setFinancial("billingAddress", e.target.value)}
            rows={2}
            placeholder="If different from your address above"
            className="rounded-xl"
          />
        </Field>
      </Section>

      {/* Consents */}
      <Section icon={Shield} title="Notifications &amp; consents">
        <label className="flex items-start gap-3 rounded-xl border p-3">
          <Checkbox
            checked={s.whatsappConsent}
            onCheckedChange={(c) => set("whatsappConsent", c === true)}
          />
          <span className="text-sm">
            <strong>WhatsApp updates.</strong> Send me course updates, reminders
            and exam alerts via WhatsApp on the mobile number above.
          </span>
        </label>
        <label className="flex items-start gap-3 rounded-xl border p-3">
          <Checkbox
            checked={s.termsAccepted}
            onCheckedChange={(c) => set("termsAccepted", c === true)}
          />
          <span className="text-sm">
            I have read and accept the{" "}
            <a
              href="/legal/terms"
              target="_blank"
              rel="noopener noreferrer"
              className="font-semibold underline underline-offset-2"
            >
              terms &amp; conditions
            </a>
            .
          </span>
        </label>
        <label className="flex items-start gap-3 rounded-xl border p-3">
          <Checkbox
            checked={s.disclaimerAccepted}
            onCheckedChange={(c) => set("disclaimerAccepted", c === true)}
          />
          <span className="text-sm">
            I acknowledge the{" "}
            <a
              href="/legal/disclaimer"
              target="_blank"
              rel="noopener noreferrer"
              className="font-semibold underline underline-offset-2"
            >
              learner disclaimer
            </a>{" "}
            — results may vary, certificates aren&apos;t legally accredited
            unless specified by the issuing institute.
          </span>
        </label>
      </Section>

      {/* Persistent error banner — doesn't fade away like a toast. */}
      {errorMsg && (
        <div
          role="alert"
          className="flex items-start gap-3 rounded-2xl border p-4 text-sm"
          style={{
            borderColor: "#fecaca",
            background: "#fef2f2",
            color: "#991b1b",
          }}
        >
          <AlertCircle className="mt-0.5 size-5 shrink-0" />
          <div>
            <div className="font-bold">Couldn&apos;t save your profile</div>
            <p className="mt-0.5 break-words">{errorMsg}</p>
          </div>
        </div>
      )}

      <div className="flex flex-wrap items-center justify-between gap-3">
        <div className="text-xs text-muted-foreground">
          {initial.complete ? (
            <span className="inline-flex items-center gap-1.5">
              <CheckCircle2 className="size-3.5 text-emerald-600" />
              Profile already complete — your changes will be saved.
            </span>
          ) : (
            <span>
              <strong className="text-foreground">Required (*):</strong> full
              name, mobile, T&amp;C, disclaimer. Everything else is optional.
            </span>
          )}
        </div>
        <Button
          type="button"
          onClick={onSave}
          disabled={pending}
          className="h-11 rounded-xl"
        >
          {pending && <Loader2 className="size-4 animate-spin" />}
          Save profile
        </Button>
      </div>
    </div>
  );
}

function Section({
  icon: Icon,
  title,
  children,
}: {
  icon: typeof User;
  title: string;
  children: React.ReactNode;
}) {
  return (
    <Card className="border-none bg-card p-5 shadow-card">
      <div className="mb-4 flex items-center gap-2">
        <span className="flex size-8 items-center justify-center rounded-lg bg-secondary">
          <Icon className="size-4 text-muted-foreground" />
        </span>
        <h2 className="text-sm font-bold" dangerouslySetInnerHTML={{ __html: title }} />
      </div>
      <div className="space-y-4">{children}</div>
    </Card>
  );
}

function Row({ children }: { children: React.ReactNode }) {
  return <div className="grid gap-4 sm:grid-cols-2">{children}</div>;
}

function Field({
  label,
  optional,
  children,
}: {
  label: string;
  optional?: boolean;
  children: React.ReactNode;
}) {
  return (
    <div className="space-y-1.5">
      <div className="flex items-baseline justify-between">
        <Label className="text-xs font-medium">{label}</Label>
        {optional && (
          <span className="text-[10px] uppercase tracking-widest text-muted-foreground">
            optional
          </span>
        )}
      </div>
      {children}
    </div>
  );
}
