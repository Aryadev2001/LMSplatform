"use client";

import { useState, useTransition, useEffect } from "react";
import { useRouter } from "next/navigation";
import { toast } from "sonner";
import { ArrowLeft, ArrowRight, Loader2, CheckCircle2 } from "lucide-react";
import {
  LAYERS,
  LIKERT_OPTIONS,
  REVENUE_BANDS,
  BUSINESS_TYPES,
  TEAM_SIZES,
  ALL_QUESTION_IDS,
} from "@/lib/diagnostic/questions";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { submitDiagnostic } from "./actions";

const STORAGE_KEY = "edt_diagnostic_draft_v1";
const TOTAL_STEPS = LAYERS.length + 1; // 7 layers + firmographics

type Answers = Record<string, number>;
interface Firmo {
  fullName: string;
  email: string;
  phone: string;
  revenueBand: string;
  businessType: string;
  teamSize: string;
  yearsInBusiness: string;
}

const EMPTY_FIRMO: Firmo = {
  fullName: "",
  email: "",
  phone: "",
  revenueBand: "",
  businessType: "",
  teamSize: "",
  yearsInBusiness: "",
};

export function DiagnosticWizard() {
  const router = useRouter();
  const [pending, startTransition] = useTransition();
  const [step, setStep] = useState(0);
  const [answers, setAnswers] = useState<Answers>({});
  const [firmo, setFirmo] = useState<Firmo>(EMPTY_FIRMO);
  const [hydrated, setHydrated] = useState(false);

  // Restore draft
  useEffect(() => {
    try {
      const raw = localStorage.getItem(STORAGE_KEY);
      if (raw) {
        const d = JSON.parse(raw);
        if (d.answers) setAnswers(d.answers);
        if (d.firmo) setFirmo({ ...EMPTY_FIRMO, ...d.firmo });
      }
    } catch {
      /* ignore */
    }
    setHydrated(true);
  }, []);

  // Autosave
  useEffect(() => {
    if (!hydrated) return;
    localStorage.setItem(STORAGE_KEY, JSON.stringify({ answers, firmo }));
  }, [answers, firmo, hydrated]);

  const isFirmoStep = step === LAYERS.length;
  const progress = Math.round((step / TOTAL_STEPS) * 100);

  function setAnswer(qid: string, value: number) {
    setAnswers((a) => ({ ...a, [qid]: value }));
  }

  const currentLayer = LAYERS[step];
  const layerComplete =
    isFirmoStep ||
    currentLayer.questions.every((q) => typeof answers[q.id] === "number");

  const firmoComplete =
    firmo.fullName.trim().length >= 2 &&
    /^[^@\s]+@[^@\s]+\.[^@\s]+$/.test(firmo.email) &&
    firmo.revenueBand.length > 0;

  function next() {
    if (step < TOTAL_STEPS - 1) setStep((s) => s + 1);
  }
  function back() {
    if (step > 0) setStep((s) => s - 1);
  }

  function onSubmit() {
    const missing = ALL_QUESTION_IDS.filter((id) => typeof answers[id] !== "number");
    if (missing.length > 0) {
      toast.error("Please answer every question.");
      return;
    }
    startTransition(async () => {
      const r = await submitDiagnostic({
        answers,
        firmographics: {
          fullName: firmo.fullName,
          email: firmo.email,
          phone: firmo.phone,
          revenueBand: firmo.revenueBand,
          businessType: firmo.businessType,
          teamSize: firmo.teamSize,
          yearsInBusiness: firmo.yearsInBusiness,
        },
      });
      if (r.success) {
        localStorage.removeItem(STORAGE_KEY);
        router.push(`/diagnostic/results/${r.id}`);
      } else {
        toast.error(r.error);
      }
    });
  }

  if (!hydrated) {
    return <div className="h-64 animate-pulse rounded-2xl bg-secondary/40" />;
  }

  return (
    <div className="w-full max-w-2xl">
      {/* Progress */}
      <div className="mb-8">
        <div className="mb-2 flex items-center justify-between text-xs text-muted-foreground">
          <span>
            {isFirmoStep ? "Almost done" : `Layer ${currentLayer.index} of ${LAYERS.length}`}
          </span>
          <span>{progress}%</span>
        </div>
        <div className="h-1.5 w-full overflow-hidden rounded-full bg-secondary">
          <div
            className="h-full rounded-full transition-all duration-500"
            style={{
              width: `${progress}%`,
              background: "linear-gradient(135deg, #8CC63F 0%, #1AADE0 100%)",
            }}
          />
        </div>
      </div>

      {/* Step content */}
      <div className="rounded-2xl bg-card p-6 shadow-soft md:p-8">
        {isFirmoStep ? (
          <FirmoStep firmo={firmo} setFirmo={setFirmo} />
        ) : (
          <div>
            <div className="mb-1 text-[10px] uppercase tracking-widest text-[#1AADE0]">
              Layer {currentLayer.index}
            </div>
            <h2 className="text-2xl font-semibold tracking-tight">{currentLayer.title}</h2>
            <p className="mt-1 text-sm text-muted-foreground">{currentLayer.blurb}</p>

            <div className="mt-6 space-y-5">
              {currentLayer.questions.map((q) => (
                <div key={q.id}>
                  <p className="mb-3 text-sm font-medium">{q.text}</p>
                  <div className="grid grid-cols-5 gap-1.5">
                    {LIKERT_OPTIONS.map((opt) => {
                      const active = answers[q.id] === opt.value;
                      return (
                        <button
                          key={opt.value}
                          type="button"
                          onClick={() => setAnswer(q.id, opt.value)}
                          className={`flex flex-col items-center gap-1 rounded-xl border px-1 py-2.5 text-center transition-all ${
                            active
                              ? "border-transparent text-white"
                              : "border-black/10 bg-background hover:border-black/20"
                          }`}
                          style={
                            active
                              ? { background: "linear-gradient(135deg, #8CC63F 0%, #1AADE0 100%)" }
                              : undefined
                          }
                        >
                          <span className="text-base font-semibold">{opt.value}</span>
                          <span className="text-[10px] leading-tight opacity-80">
                            {opt.label}
                          </span>
                        </button>
                      );
                    })}
                  </div>
                </div>
              ))}
            </div>
          </div>
        )}
      </div>

      {/* Nav */}
      <div className="mt-6 flex items-center justify-between">
        <Button
          variant="ghost"
          onClick={back}
          disabled={step === 0 || pending}
          className="rounded-xl"
        >
          <ArrowLeft className="size-4" /> Back
        </Button>

        {isFirmoStep ? (
          <Button
            onClick={onSubmit}
            disabled={!firmoComplete || pending}
            className="rounded-xl"
            style={{ background: "linear-gradient(135deg, #8CC63F 0%, #1AADE0 100%)" }}
          >
            {pending ? (
              <Loader2 className="size-4 animate-spin" />
            ) : (
              <CheckCircle2 className="size-4" />
            )}
            See my results
          </Button>
        ) : (
          <Button
            onClick={next}
            disabled={!layerComplete || pending}
            className="rounded-xl"
          >
            Continue <ArrowRight className="size-4" />
          </Button>
        )}
      </div>
    </div>
  );
}

function FirmoStep({
  firmo,
  setFirmo,
}: {
  firmo: Firmo;
  setFirmo: (f: Firmo) => void;
}) {
  const set = (k: keyof Firmo, v: string) => setFirmo({ ...firmo, [k]: v });
  return (
    <div>
      <div className="mb-1 text-[10px] uppercase tracking-widest text-[#1AADE0]">Final step</div>
      <h2 className="text-2xl font-semibold tracking-tight">A bit about your business</h2>
      <p className="mt-1 text-sm text-muted-foreground">
        We use this to tailor your report and recommendation.
      </p>

      <div className="mt-6 grid gap-4 sm:grid-cols-2">
        <Field label="Full name" required>
          <Input
            value={firmo.fullName}
            onChange={(e) => set("fullName", e.target.value)}
            placeholder="Jane Doe"
            className="h-10 rounded-xl border-black/10"
          />
        </Field>
        <Field label="Email" required>
          <Input
            type="email"
            value={firmo.email}
            onChange={(e) => set("email", e.target.value)}
            placeholder="you@example.com"
            className="h-10 rounded-xl border-black/10"
          />
        </Field>
        <Field label="Phone">
          <Input
            value={firmo.phone}
            onChange={(e) => set("phone", e.target.value)}
            placeholder="+91 …"
            className="h-10 rounded-xl border-black/10"
          />
        </Field>
        <Field label="Annual revenue" required>
          <Select value={firmo.revenueBand} onValueChange={(v) => set("revenueBand", v ?? "")}>
            <SelectTrigger className="h-10 rounded-xl border-black/10">
              <SelectValue placeholder="Select range" />
            </SelectTrigger>
            <SelectContent>
              {REVENUE_BANDS.map((r) => (
                <SelectItem key={r.value} value={r.value}>
                  {r.label}
                </SelectItem>
              ))}
            </SelectContent>
          </Select>
        </Field>
        <Field label="Business type">
          <Select value={firmo.businessType} onValueChange={(v) => set("businessType", v ?? "")}>
            <SelectTrigger className="h-10 rounded-xl border-black/10">
              <SelectValue placeholder="Select" />
            </SelectTrigger>
            <SelectContent>
              {BUSINESS_TYPES.map((b) => (
                <SelectItem key={b} value={b}>
                  {b}
                </SelectItem>
              ))}
            </SelectContent>
          </Select>
        </Field>
        <Field label="Team size">
          <Select value={firmo.teamSize} onValueChange={(v) => set("teamSize", v ?? "")}>
            <SelectTrigger className="h-10 rounded-xl border-black/10">
              <SelectValue placeholder="Select" />
            </SelectTrigger>
            <SelectContent>
              {TEAM_SIZES.map((t) => (
                <SelectItem key={t} value={t}>
                  {t}
                </SelectItem>
              ))}
            </SelectContent>
          </Select>
        </Field>
      </div>
    </div>
  );
}

function Field({
  label,
  required,
  children,
}: {
  label: string;
  required?: boolean;
  children: React.ReactNode;
}) {
  return (
    <div className="space-y-1.5">
      <Label className="text-xs font-medium">
        {label}
        {required && <span className="ml-0.5 text-[#EF4444]">*</span>}
      </Label>
      {children}
    </div>
  );
}
