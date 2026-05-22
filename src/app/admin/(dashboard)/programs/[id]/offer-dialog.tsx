"use client";

import { useState, useTransition } from "react";
import { useRouter } from "next/navigation";
import { toast } from "sonner";
import { Plus, Loader2, Edit3, Trash2 } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
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
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { createOffer, updateOffer, deleteOffer } from "./offers-actions";

type OfferType = "reward_points" | "reward_percentage" | "voucher_code";

interface InitialOffer {
  id: string;
  type: OfferType;
  valueInt: number;
  voucherCode: string | null;
  maxRedemptions: number | null;
  startsAt: string | null; // ISO
  expiresAt: string | null; // ISO
  isActive: boolean;
}

interface OfferDialogProps {
  courseId: string;
  mode: "create" | "edit";
  initial?: InitialOffer;
}

function toLocalInput(d: string | null): string {
  if (!d) return "";
  // Trim seconds + tz suffix so the value fits <input type="datetime-local">.
  return d.slice(0, 16);
}

export function OfferDialog({ courseId, mode, initial }: OfferDialogProps) {
  const router = useRouter();
  const [open, setOpen] = useState(false);
  const [pending, startTransition] = useTransition();

  const [type, setType] = useState<OfferType>(initial?.type ?? "voucher_code");
  const [valueInt, setValueInt] = useState<number>(initial?.valueInt ?? 10);
  const [voucherCode, setVoucherCode] = useState<string>(
    initial?.voucherCode ?? "",
  );
  const [maxRedemptions, setMaxRedemptions] = useState<string>(
    initial?.maxRedemptions ? String(initial.maxRedemptions) : "",
  );
  const [startsAt, setStartsAt] = useState<string>(
    toLocalInput(initial?.startsAt ?? null),
  );
  const [expiresAt, setExpiresAt] = useState<string>(
    toLocalInput(initial?.expiresAt ?? null),
  );
  const [isActive, setIsActive] = useState<boolean>(initial?.isActive ?? true);

  const isPercent = type === "reward_percentage" || type === "voucher_code";
  const isVoucher = type === "voucher_code";

  function onSave() {
    startTransition(async () => {
      const payload = {
        courseId,
        type,
        valueInt: Number(valueInt) || 0,
        voucherCode: voucherCode.trim(),
        maxRedemptions: maxRedemptions ? Number(maxRedemptions) : undefined,
        startsAt: startsAt ? new Date(startsAt).toISOString() : "",
        expiresAt: expiresAt ? new Date(expiresAt).toISOString() : "",
        isActive,
      };
      const r =
        mode === "edit" && initial
          ? await updateOffer({ ...payload, offerId: initial.id })
          : await createOffer(payload);
      if (!r.success) {
        toast.error(r.error);
        return;
      }
      toast.success(mode === "edit" ? "Offer updated" : "Offer created");
      setOpen(false);
      router.refresh();
    });
  }

  return (
    <Dialog open={open} onOpenChange={setOpen}>
      {mode === "edit" ? (
        <DialogTrigger
          render={
            <Button variant="ghost" size="icon-sm" aria-label="Edit offer" />
          }
        >
          <Edit3 className="size-4" />
        </DialogTrigger>
      ) : (
        <DialogTrigger render={<Button className="rounded-xl" />}>
          <Plus className="size-4" /> New offer
        </DialogTrigger>
      )}
      <DialogContent className="sm:max-w-lg">
        <DialogHeader>
          <DialogTitle>{mode === "edit" ? "Edit offer" : "Create offer"}</DialogTitle>
          <DialogDescription>
            Reward points, percentage off, or voucher codes — applied at
            checkout for this course.
          </DialogDescription>
        </DialogHeader>

        <div className="space-y-4">
          <div className="space-y-1.5">
            <Label className="text-xs font-medium">Type</Label>
            <Select
              value={type}
              onValueChange={(v) => v && setType(v as OfferType)}
            >
              <SelectTrigger className="h-10 rounded-xl">
                <SelectValue />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="voucher_code">
                  Voucher code (% off)
                </SelectItem>
                <SelectItem value="reward_percentage">
                  Reward percentage (auto, no code)
                </SelectItem>
                <SelectItem value="reward_points">
                  Reward points (granted to buyer)
                </SelectItem>
              </SelectContent>
            </Select>
            <p className="text-[11px] text-muted-foreground">
              {type === "voucher_code" &&
                "Buyer enters the code at checkout; you set the percentage discount."}
              {type === "reward_percentage" &&
                "Discount applied automatically to anyone who buys this course."}
              {type === "reward_points" &&
                "Buyer earns this many platform reward points after purchase."}
            </p>
          </div>

          {isVoucher && (
            <div className="space-y-1.5">
              <Label className="text-xs font-medium">Voucher code</Label>
              <Input
                value={voucherCode}
                onChange={(e) =>
                  setVoucherCode(e.target.value.toUpperCase().slice(0, 40))
                }
                placeholder="LAUNCH50"
                maxLength={40}
                className="h-10 rounded-xl font-mono uppercase"
              />
              <p className="text-[11px] text-muted-foreground">
                Uppercase, up to 40 chars. Must be unique within your tenant.
              </p>
            </div>
          )}

          <div className="grid grid-cols-2 gap-3">
            <div className="space-y-1.5">
              <Label className="text-xs font-medium">
                {isPercent ? "Percentage (%)" : "Points"}
              </Label>
              <Input
                type="number"
                min={0}
                max={isPercent ? 100 : 100000}
                value={valueInt}
                onChange={(e) => setValueInt(Number(e.target.value || 0))}
                className="h-10 rounded-xl"
              />
            </div>
            <div className="space-y-1.5">
              <Label className="text-xs font-medium">
                Max redemptions (optional)
              </Label>
              <Input
                type="number"
                min={0}
                value={maxRedemptions}
                onChange={(e) => setMaxRedemptions(e.target.value)}
                placeholder="unlimited"
                className="h-10 rounded-xl"
              />
            </div>
          </div>

          <div className="grid grid-cols-2 gap-3">
            <div className="space-y-1.5">
              <Label className="text-xs font-medium">Starts at (optional)</Label>
              <Input
                type="datetime-local"
                value={startsAt}
                onChange={(e) => setStartsAt(e.target.value)}
                className="h-10 rounded-xl"
              />
            </div>
            <div className="space-y-1.5">
              <Label className="text-xs font-medium">Expires at (optional)</Label>
              <Input
                type="datetime-local"
                value={expiresAt}
                onChange={(e) => setExpiresAt(e.target.value)}
                className="h-10 rounded-xl"
              />
            </div>
          </div>

          <div className="flex items-center gap-2 rounded-xl border border-black/8 bg-secondary/40 p-3">
            <Checkbox
              id="offer-active"
              checked={isActive}
              onCheckedChange={(c) => setIsActive(c === true)}
            />
            <Label htmlFor="offer-active" className="cursor-pointer text-sm">
              Active — counts toward storefront offer count
            </Label>
          </div>
        </div>

        <DialogFooter className="gap-2">
          <Button
            type="button"
            variant="outline"
            onClick={() => setOpen(false)}
            className="rounded-xl"
          >
            Cancel
          </Button>
          <Button
            type="button"
            onClick={onSave}
            disabled={pending}
            className="rounded-xl"
          >
            {pending && <Loader2 className="size-4 animate-spin" />}
            {mode === "edit" ? "Save changes" : "Create offer"}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}

export function DeleteOfferButton({
  offerId,
  courseId,
}: {
  offerId: string;
  courseId: string;
}) {
  const router = useRouter();
  const [pending, startTransition] = useTransition();
  function onDelete() {
    if (!window.confirm("Delete this offer? This cannot be undone.")) return;
    startTransition(async () => {
      const r = await deleteOffer(offerId, courseId);
      if (!r.success) {
        toast.error(r.error);
        return;
      }
      toast.success("Offer deleted");
      router.refresh();
    });
  }
  return (
    <Button
      type="button"
      variant="ghost"
      size="icon-sm"
      onClick={onDelete}
      disabled={pending}
      aria-label="Delete offer"
    >
      {pending ? <Loader2 className="size-4 animate-spin" /> : <Trash2 className="size-4" />}
    </Button>
  );
}
