"use client";

import { useState, useTransition } from "react";
import { useRouter } from "next/navigation";
import { toast } from "sonner";
import { Plus, Loader2 } from "lucide-react";
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
import { Trash2 } from "lucide-react";
import { createBundle, setBundleActive, deleteBundle } from "./actions";

export function NewBundleDialog({
  courses,
}: {
  courses: { id: string; name: string; priceCents: number; currency: string }[];
}) {
  const router = useRouter();
  const [open, setOpen] = useState(false);
  const [pending, startTransition] = useTransition();
  const [name, setName] = useState("");
  const [description, setDescription] = useState("");
  const [priceDollars, setPrice] = useState("0");
  const [currency, setCurrency] = useState(courses[0]?.currency ?? "INR");
  const [selected, setSelected] = useState<Set<string>>(new Set());

  const sumSelected = courses
    .filter((c) => selected.has(c.id))
    .reduce((s, c) => s + c.priceCents, 0);

  function toggle(id: string, on: boolean) {
    setSelected((prev) => {
      const next = new Set(prev);
      if (on) next.add(id);
      else next.delete(id);
      return next;
    });
  }

  function submit() {
    startTransition(async () => {
      const r = await createBundle({
        name,
        description,
        priceCents: Math.round(Number(priceDollars) * 100),
        currency,
        programIds: [...selected],
        isActive: true,
      });
      if (r.success) {
        toast.success("Bundle created");
        setName("");
        setDescription("");
        setPrice("0");
        setSelected(new Set());
        setOpen(false);
        router.refresh();
      } else {
        toast.error(r.error);
      }
    });
  }

  return (
    <Dialog open={open} onOpenChange={setOpen}>
      <DialogTrigger render={<Button className="rounded-xl" />}>
        <Plus className="size-4" /> New bundle
      </DialogTrigger>
      <DialogContent className="sm:max-w-md">
        <DialogHeader>
          <DialogTitle>Create a course bundle</DialogTitle>
          <DialogDescription>
            Group 2+ of your courses and sell them together at one price. Buyers
            enroll in every course in one checkout.
          </DialogDescription>
        </DialogHeader>
        <div className="space-y-4">
          <div className="space-y-1.5">
            <Label className="text-xs font-medium">Bundle name</Label>
            <Input value={name} onChange={(e) => setName(e.target.value)} placeholder="e.g. Full-Stack Starter Pack" className="h-10 rounded-xl" />
          </div>
          <div className="space-y-1.5">
            <Label className="text-xs font-medium">Description <span className="text-muted-foreground">(optional)</span></Label>
            <Textarea value={description} onChange={(e) => setDescription(e.target.value)} rows={2} className="max-h-40 rounded-xl" />
          </div>
          <div className="grid grid-cols-2 gap-3">
            <div className="space-y-1.5">
              <Label className="text-xs font-medium">Bundle price</Label>
              <Input type="number" min={0} value={priceDollars} onChange={(e) => setPrice(e.target.value)} className="h-10 rounded-xl" />
            </div>
            <div className="space-y-1.5">
              <Label className="text-xs font-medium">Currency</Label>
              <Input value={currency} maxLength={3} onChange={(e) => setCurrency(e.target.value)} className="h-10 rounded-xl uppercase" />
            </div>
          </div>
          <div className="space-y-1.5">
            <Label className="text-xs font-medium">Courses in this bundle</Label>
            {courses.length === 0 ? (
              <p className="text-xs text-muted-foreground">Create at least 2 courses first.</p>
            ) : (
              <div className="max-h-44 space-y-1 overflow-y-auto rounded-xl border border-black/10 p-2">
                {courses.map((c) => (
                  <label key={c.id} className="flex cursor-pointer items-center gap-2.5 rounded-lg px-2 py-1.5 text-sm hover:bg-secondary/50">
                    <Checkbox checked={selected.has(c.id)} onCheckedChange={(v) => toggle(c.id, !!v)} />
                    <span className="flex-1 truncate">{c.name}</span>
                  </label>
                ))}
              </div>
            )}
            {selected.size >= 2 && sumSelected > 0 && (
              <p className="text-[11px] text-muted-foreground">
                Courses list for {(sumSelected / 100).toLocaleString()} {currency} separately —
                a bundle price below that is the discount buyers see.
              </p>
            )}
          </div>
        </div>
        <DialogFooter className="gap-2">
          <Button variant="outline" onClick={() => setOpen(false)} className="rounded-xl">Cancel</Button>
          <Button onClick={submit} disabled={pending || selected.size < 2} className="rounded-xl">
            {pending && <Loader2 className="size-4 animate-spin" />}
            Create bundle
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}

export function BundleRowActions({ id, active }: { id: string; active: boolean }) {
  const router = useRouter();
  const [pending, startTransition] = useTransition();
  return (
    <div className="flex items-center justify-end gap-1">
      <Button
        variant="outline"
        size="sm"
        disabled={pending}
        onClick={() =>
          startTransition(async () => {
            const r = await setBundleActive(id, !active);
            if (r.success) router.refresh();
            else toast.error(r.error);
          })
        }
        className="rounded-lg"
      >
        {pending ? <Loader2 className="size-3.5 animate-spin" /> : active ? "Unpublish" : "Publish"}
      </Button>
      <Button
        variant="ghost"
        size="icon-sm"
        aria-label="Delete bundle"
        disabled={pending}
        onClick={() =>
          startTransition(async () => {
            const r = await deleteBundle(id);
            if (r.success) router.refresh();
            else toast.error(r.error);
          })
        }
      >
        <Trash2 className="size-3.5" />
      </Button>
    </div>
  );
}
