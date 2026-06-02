"use client";

import Link from "next/link";
import { useState, useTransition } from "react";
import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { z } from "zod";
import { toast } from "sonner";
import { Plus, Loader2, Edit3 } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { Checkbox } from "@/components/ui/checkbox";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
} from "@/components/ui/dialog";
import { FileUpload } from "@/components/file-upload";
import { createProgram, updateProgram } from "../actions";

const FEATURE_KEYS = ["certificate", "q_bank", "hands_on", "mentor_qa"] as const;
type FeatureKey = (typeof FEATURE_KEYS)[number];

const Schema = z.object({
  name: z.string().min(2, "Name is required").max(200),
  description: z.string().max(2000).optional().or(z.literal("")),
  priceDollars: z.coerce.number().min(0, "Must be 0 or more"),
  currency: z.string().length(3),
  durationMonths: z.coerce.number().int().min(1).max(60),
  isActive: z.boolean(),
  imageUrl: z.string().optional().or(z.literal("")),
  // 0013 extensions
  language: z.enum(["en", "ar", "hi"]),
  features: z.array(z.enum(FEATURE_KEYS)),
  introVideoUrl: z.string().optional().or(z.literal("")),
  workshopVideoUrl: z.string().optional().or(z.literal("")),
  totalDurationHours: z.coerce.number().int().min(0).max(10000),
  disclaimer: z.string().max(4000).optional().or(z.literal("")),
  termsHtml: z.string().max(20000).optional().or(z.literal("")),
  certificateTemplateUrl: z.string().optional().or(z.literal("")),
});

type Values = z.input<typeof Schema>;

interface ProgramDialogProps {
  mode?: "create" | "edit";
  /** Standard+ feature. When false (Basic tier) the price field is locked to
   *  free and an upgrade hint is shown; the server also enforces this. */
  canPublishPaid?: boolean;
  initial?: {
    id: string;
    name: string;
    description: string | null;
    priceCents: number;
    currency: string;
    durationMonths: number;
    isActive: boolean;
    imageUrl?: string | null;
    language?: "en" | "ar" | "hi" | null;
    features?: FeatureKey[] | null;
    introVideoUrl?: string | null;
    workshopVideoUrl?: string | null;
    totalDurationHours?: number | null;
    disclaimer?: string | null;
    termsHtml?: string | null;
    certificateTemplateUrl?: string | null;
  };
}

const FEATURE_LABELS: Record<FeatureKey, string> = {
  certificate: "Certificate of Completion",
  q_bank: "Q-Bank & Mock Exams",
  hands_on: "Hands-on Labs",
  mentor_qa: "Mentor Q&A Sessions",
};

export function ProgramDialog({ mode = "create", canPublishPaid = true, initial }: ProgramDialogProps) {
  const [open, setOpen] = useState(false);
  const [pending, startTransition] = useTransition();
  const { register, handleSubmit, formState: { errors }, reset, setValue, watch } = useForm<Values>({
    resolver: zodResolver(Schema),
    defaultValues: {
      name: initial?.name ?? "",
      description: initial?.description ?? "",
      priceDollars: initial ? initial.priceCents / 100 : 0,
      currency: initial?.currency ?? "USD",
      durationMonths: initial?.durationMonths ?? 3,
      isActive: initial?.isActive ?? true,
      imageUrl: initial?.imageUrl ?? "",
      language: (initial?.language ?? "en") as "en" | "ar" | "hi",
      features: (initial?.features ?? []) as FeatureKey[],
      introVideoUrl: initial?.introVideoUrl ?? "",
      workshopVideoUrl: initial?.workshopVideoUrl ?? "",
      totalDurationHours: initial?.totalDurationHours ?? 0,
      disclaimer: initial?.disclaimer ?? "",
      termsHtml: initial?.termsHtml ?? "",
      certificateTemplateUrl: initial?.certificateTemplateUrl ?? "",
    },
  });
  const isActive = watch("isActive");
  const imageUrl = watch("imageUrl");
  const features = watch("features") ?? [];
  const language = watch("language");
  const introVideoUrl = watch("introVideoUrl");
  const workshopVideoUrl = watch("workshopVideoUrl");
  const certificateTemplateUrl = watch("certificateTemplateUrl");

  function toggleFeature(key: FeatureKey, checked: boolean) {
    const set = new Set(features);
    if (checked) set.add(key);
    else set.delete(key);
    setValue("features", Array.from(set) as FeatureKey[]);
  }

  function onSubmit(values: Values) {
    const priceNum = Number(values.priceDollars);
    const durationNum = Number(values.durationMonths);
    const hoursNum = Number(values.totalDurationHours);
    startTransition(async () => {
      const payload = {
        name: values.name,
        description: values.description,
        priceCents: Math.round(priceNum * 100),
        currency: values.currency,
        durationMonths: durationNum,
        isActive: !!values.isActive,
        imageUrl: values.imageUrl ?? "",
        language: values.language,
        features: values.features,
        introVideoUrl: values.introVideoUrl ?? "",
        workshopVideoUrl: values.workshopVideoUrl ?? "",
        totalDurationHours: hoursNum,
        disclaimer: values.disclaimer ?? "",
        termsHtml: values.termsHtml ?? "",
        certificateTemplateUrl: values.certificateTemplateUrl ?? "",
      };
      const r = mode === "edit" && initial
        ? await updateProgram(initial.id, payload)
        : await createProgram(payload);
      if (r.success) {
        toast.success(mode === "edit" ? "Program updated" : "Program created");
        reset();
        setOpen(false);
      } else {
        toast.error(r.error);
      }
    });
  }

  return (
    <Dialog open={open} onOpenChange={setOpen}>
      {mode === "edit" ? (
        <DialogTrigger render={<Button variant="ghost" size="icon-sm" aria-label="Edit program" />}>
          <Edit3 className="size-4" />
        </DialogTrigger>
      ) : (
        <DialogTrigger render={<Button className="rounded-xl" />}>
          <Plus className="size-4" /> New program
        </DialogTrigger>
      )}
      <DialogContent className="max-h-[90vh] overflow-y-auto sm:max-w-2xl">
        <DialogHeader>
          <DialogTitle>{mode === "edit" ? "Edit program" : "Create program"}</DialogTitle>
          <DialogDescription>
            Programs are the packages students enroll in.
          </DialogDescription>
        </DialogHeader>
        <form onSubmit={handleSubmit(onSubmit)} className="space-y-5">
          {/* ---- Basics ---- */}
          <SectionTitle>Basics</SectionTitle>
          <Field label="Name" error={errors.name?.message}>
            <Input {...register("name")} placeholder="Founder OS" className="h-10 rounded-xl border-black/10" />
          </Field>
          <Field label="Description" optional>
            <Textarea {...register("description")} rows={3} placeholder="Bi-weekly 1-on-1s, assignments..." className="rounded-xl border-black/10" />
          </Field>
          <Field label="Cover image" optional>
            <FileUpload
              accept="image/*"
              label="Upload a cover image"
              value={imageUrl || null}
              onUploaded={(url) => setValue("imageUrl", url)}
              onClear={() => setValue("imageUrl", "")}
            />
          </Field>

          <div className="grid grid-cols-3 gap-3">
            <Field label="Price" error={errors.priceDollars?.message}>
              <div className="relative">
                <span className="absolute left-3 top-1/2 -translate-y-1/2 text-sm text-muted-foreground">$</span>
                <Input
                  {...register("priceDollars")}
                  type="number"
                  step="1"
                  disabled={!canPublishPaid}
                  title={
                    canPublishPaid
                      ? undefined
                      : "Charging for a course requires the Standard plan. Basic publishes free courses."
                  }
                  className="h-10 rounded-xl border-black/10 pl-7 disabled:cursor-not-allowed disabled:opacity-60"
                />
              </div>
              {!canPublishPaid && (
                <p className="mt-1 text-[11px] text-muted-foreground">
                  Free on Basic.{" "}
                  <Link
                    href="/admin/partner/billing"
                    className="font-semibold text-primary underline-offset-2 hover:underline"
                  >
                    Upgrade to charge for courses →
                  </Link>
                </p>
              )}
            </Field>
            <Field label="Currency">
              <Input {...register("currency")} maxLength={3} className="h-10 rounded-xl border-black/10 uppercase" />
            </Field>
            <Field label="Duration (mo)" error={errors.durationMonths?.message}>
              <Input {...register("durationMonths")} type="number" min="1" className="h-10 rounded-xl border-black/10" />
            </Field>
          </div>

          <div className="grid grid-cols-2 gap-3">
            <Field label="Total duration (hours)" optional>
              <Input
                {...register("totalDurationHours")}
                type="number"
                min="0"
                className="h-10 rounded-xl border-black/10"
              />
            </Field>
            <Field label="Language">
              <select
                value={language}
                onChange={(e) =>
                  setValue("language", e.target.value as "en" | "ar" | "hi")
                }
                className="h-10 w-full rounded-xl border border-input bg-background px-3 text-sm"
              >
                <option value="en">English</option>
                <option value="ar">Arabic</option>
                <option value="hi">Hindi</option>
              </select>
            </Field>
          </div>

          <div className="flex items-center gap-2 rounded-xl border border-black/8 bg-secondary/40 p-3">
            <Checkbox
              id="isActive"
              checked={isActive}
              onCheckedChange={(c) => setValue("isActive", !!c)}
            />
            <Label htmlFor="isActive" className="text-sm cursor-pointer">
              Active — students can enroll
            </Label>
          </div>

          {/* ---- Features ---- */}
          <SectionTitle>Features</SectionTitle>
          <div className="grid grid-cols-2 gap-2">
            {FEATURE_KEYS.map((k) => (
              <label
                key={k}
                className="flex cursor-pointer items-center gap-2 rounded-xl border border-black/8 bg-secondary/30 p-3 text-sm"
              >
                <Checkbox
                  checked={features.includes(k)}
                  onCheckedChange={(c) => toggleFeature(k, !!c)}
                />
                <span>{FEATURE_LABELS[k]}</span>
              </label>
            ))}
          </div>

          {/* ---- Videos ---- */}
          <SectionTitle>Videos</SectionTitle>
          <Field label="Intro video URL" optional>
            <Input
              {...register("introVideoUrl")}
              type="url"
              placeholder="https://… (course intro/trailer)"
              className="h-10 rounded-xl border-black/10"
            />
            {introVideoUrl && (
              <p className="mt-1 truncate text-[11px] text-muted-foreground">
                {introVideoUrl}
              </p>
            )}
          </Field>
          <Field label="Workshop video URL" optional>
            <Input
              {...register("workshopVideoUrl")}
              type="url"
              placeholder="https://… (recorded workshop / masterclass)"
              className="h-10 rounded-xl border-black/10"
            />
            {workshopVideoUrl && (
              <p className="mt-1 truncate text-[11px] text-muted-foreground">
                {workshopVideoUrl}
              </p>
            )}
          </Field>

          {/* ---- Certificate ---- */}
          <SectionTitle>Certificate</SectionTitle>
          <Field label="Certificate template" optional>
            <FileUpload
              accept="image/*,application/pdf"
              label="Upload certificate template"
              value={certificateTemplateUrl || null}
              onUploaded={(url) => setValue("certificateTemplateUrl", url)}
              onClear={() => setValue("certificateTemplateUrl", "")}
            />
          </Field>

          {/* ---- Legal ---- */}
          <SectionTitle>Legal</SectionTitle>
          <Field label="Disclaimer" optional>
            <Textarea
              {...register("disclaimer")}
              rows={3}
              placeholder="e.g. Results may vary. This course does not guarantee certification or employment."
              className="rounded-xl border-black/10"
            />
          </Field>
          <Field label="Terms & conditions (HTML or plain text)" optional>
            <Textarea
              {...register("termsHtml")}
              rows={4}
              placeholder="Refund policy, attendance policy, completion criteria…"
              className="rounded-xl border-black/10 font-mono text-[12px]"
            />
          </Field>

          <DialogFooter className="gap-2">
            <Button type="button" variant="outline" onClick={() => setOpen(false)} className="rounded-xl">
              Cancel
            </Button>
            <Button type="submit" disabled={pending} className="rounded-xl">
              {pending && <Loader2 className="size-4 animate-spin" />}
              {mode === "edit" ? "Save changes" : "Create"}
            </Button>
          </DialogFooter>
        </form>
      </DialogContent>
    </Dialog>
  );
}

function SectionTitle({ children }: { children: React.ReactNode }) {
  return (
    <div className="mt-3 border-b pb-1 text-[10px] font-bold uppercase tracking-widest text-muted-foreground first:mt-0">
      {children}
    </div>
  );
}

function Field({
  label,
  optional,
  error,
  children,
}: {
  label: string;
  optional?: boolean;
  error?: string;
  children: React.ReactNode;
}) {
  return (
    <div className="space-y-1.5">
      <div className="flex items-baseline justify-between">
        <Label className="text-xs font-medium">{label}</Label>
        {optional && <span className="text-[10px] uppercase tracking-widest text-muted-foreground">optional</span>}
      </div>
      {children}
      {error && <p className="text-xs text-destructive">{error}</p>}
    </div>
  );
}
