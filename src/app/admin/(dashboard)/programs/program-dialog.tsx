"use client";

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
import { createProgram, updateProgram } from "../actions";

const Schema = z.object({
  name: z.string().min(2, "Name is required").max(200),
  description: z.string().max(2000).optional().or(z.literal("")),
  priceDollars: z.coerce.number().min(0, "Must be 0 or more"),
  currency: z.string().length(3),
  durationMonths: z.coerce.number().int().min(1).max(60),
  isActive: z.boolean(),
});

type Values = z.input<typeof Schema>;

interface ProgramDialogProps {
  mode?: "create" | "edit";
  initial?: {
    id: string;
    name: string;
    description: string | null;
    priceCents: number;
    currency: string;
    durationMonths: number;
    isActive: boolean;
  };
}

export function ProgramDialog({ mode = "create", initial }: ProgramDialogProps) {
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
    },
  });
  const isActive = watch("isActive");

  function onSubmit(values: Values) {
    const priceNum = Number(values.priceDollars);
    const durationNum = Number(values.durationMonths);
    startTransition(async () => {
      const payload = {
        name: values.name,
        description: values.description,
        priceCents: Math.round(priceNum * 100),
        currency: values.currency,
        durationMonths: durationNum,
        isActive: !!values.isActive,
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
      <DialogContent className="sm:max-w-lg">
        <DialogHeader>
          <DialogTitle>{mode === "edit" ? "Edit program" : "Create program"}</DialogTitle>
          <DialogDescription>
            Programs are the packages students enroll in.
          </DialogDescription>
        </DialogHeader>
        <form onSubmit={handleSubmit(onSubmit)} className="space-y-4">
          <Field label="Name" error={errors.name?.message}>
            <Input {...register("name")} placeholder="Founder OS" className="h-10 rounded-xl border-black/10" />
          </Field>
          <Field label="Description" optional>
            <Textarea {...register("description")} rows={3} placeholder="Bi-weekly 1-on-1s, assignments..." className="rounded-xl border-black/10" />
          </Field>
          <div className="grid grid-cols-3 gap-3">
            <Field label="Price" error={errors.priceDollars?.message}>
              <div className="relative">
                <span className="absolute left-3 top-1/2 -translate-y-1/2 text-sm text-muted-foreground">$</span>
                <Input
                  {...register("priceDollars")}
                  type="number"
                  step="1"
                  className="h-10 rounded-xl border-black/10 pl-7"
                />
              </div>
            </Field>
            <Field label="Currency">
              <Input {...register("currency")} maxLength={3} className="h-10 rounded-xl border-black/10 uppercase" />
            </Field>
            <Field label="Duration (mo)" error={errors.durationMonths?.message}>
              <Input {...register("durationMonths")} type="number" min="1" className="h-10 rounded-xl border-black/10" />
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
