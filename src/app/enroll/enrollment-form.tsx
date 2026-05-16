"use client";

import { useState } from "react";
import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { z } from "zod";
import { motion } from "motion/react";
import { useRouter } from "next/navigation";
import { ArrowRight, Loader2 } from "lucide-react";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { Button } from "@/components/ui/button";
import { toast } from "sonner";
import { submitEnrollment } from "./actions";

const SMOOTH = [0.22, 1, 0.36, 1] as const;

const FormSchema = z.object({
  fullName: z.string().min(2, "Please enter your full name").max(200),
  email: z.email("Please enter a valid email"),
  phone: z.string().max(30).optional().or(z.literal("")),
  notes: z.string().max(2000).optional().or(z.literal("")),
});

type FormValues = z.infer<typeof FormSchema>;

export function EnrollmentForm({
  courseSlug,
  refCode,
}: {
  courseSlug: string;
  refCode?: string | null;
}) {
  const router = useRouter();
  const [isPending, setIsPending] = useState(false);

  const {
    register,
    handleSubmit,
    setError,
    formState: { errors },
  } = useForm<FormValues>({
    resolver: zodResolver(FormSchema),
    defaultValues: { fullName: "", email: "", phone: "", notes: "" },
  });

  async function onSubmit(values: FormValues) {
    setIsPending(true);
    const result = await submitEnrollment({ ...values, courseSlug });
    if (!result.success) {
      if (result.fieldErrors) {
        for (const [key, message] of Object.entries(result.fieldErrors)) {
          if (message) setError(key as keyof FormValues, { type: "server", message });
        }
      }
      toast.error(result.error);
      setIsPending(false);
      return;
    }
    const refQ = refCode ? `&ref=${encodeURIComponent(refCode)}` : "";
    router.push(`/enroll/payment?e=${result.enrollmentId}${refQ}`);
  }

  return (
    <motion.form
      initial={{ opacity: 0, y: 12 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ duration: 0.7, delay: 0.2, ease: SMOOTH }}
      onSubmit={handleSubmit(onSubmit)}
      className="space-y-5"
      noValidate
    >
      <Field label="Full name" error={errors.fullName?.message}>
        <Input
          {...register("fullName")}
          placeholder="Jane Doe"
          autoComplete="name"
          aria-invalid={!!errors.fullName}
          className="h-11 rounded-xl border-black/10 bg-background shadow-none focus-visible:ring-foreground/15"
        />
      </Field>

      <Field label="Email" error={errors.email?.message} hint="We'll send your magic-link login here after payment.">
        <Input
          {...register("email")}
          type="email"
          placeholder="you@example.com"
          autoComplete="email"
          aria-invalid={!!errors.email}
          className="h-11 rounded-xl border-black/10 bg-background shadow-none focus-visible:ring-foreground/15"
        />
      </Field>

      <Field label="Phone" optional error={errors.phone?.message}>
        <Input
          {...register("phone")}
          type="tel"
          placeholder="+971 50 123 4567"
          autoComplete="tel"
          aria-invalid={!!errors.phone}
          className="h-11 rounded-xl border-black/10 bg-background shadow-none focus-visible:ring-foreground/15"
        />
      </Field>

      <Field label="What do you hope to achieve?" optional error={errors.notes?.message}>
        <Textarea
          {...register("notes")}
          rows={4}
          placeholder="A sentence or two on your goals. Helps us tailor your program."
          aria-invalid={!!errors.notes}
          className="rounded-xl border-black/10 bg-background shadow-none focus-visible:ring-foreground/15"
        />
      </Field>

      <Button type="submit" disabled={isPending} className="group h-11 w-full rounded-xl text-sm">
        {isPending ? (
          <>
            <Loader2 className="size-4 animate-spin" />
            Processing…
          </>
        ) : (
          <>
            Continue to payment
            <ArrowRight className="size-4 transition-transform group-hover:translate-x-0.5" />
          </>
        )}
      </Button>

      <p className="text-center text-xs text-muted-foreground">
        Next: secure checkout. You&apos;ll get instant access after payment.
      </p>
    </motion.form>
  );
}

function Field({
  label,
  optional,
  error,
  hint,
  children,
}: {
  label: string;
  optional?: boolean;
  error?: string;
  hint?: string;
  children: React.ReactNode;
}) {
  return (
    <div className="space-y-1.5">
      <div className="flex items-baseline justify-between">
        <Label className="text-xs font-medium text-foreground/80">{label}</Label>
        {optional && <span className="text-[10px] uppercase tracking-widest text-muted-foreground">optional</span>}
      </div>
      {children}
      {error ? (
        <p className="text-xs text-destructive">{error}</p>
      ) : hint ? (
        <p className="text-xs text-muted-foreground">{hint}</p>
      ) : null}
    </div>
  );
}
