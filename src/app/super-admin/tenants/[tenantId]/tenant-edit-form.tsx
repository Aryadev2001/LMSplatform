"use client";

import { useState, useTransition } from "react";
import { useRouter } from "next/navigation";
import { toast } from "sonner";
import { Loader2 } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Checkbox } from "@/components/ui/checkbox";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { updateTenant } from "../../actions";

type Status = "ACTIVE" | "SUSPENDED" | "TRIAL" | "CHURNED";

interface Props {
  writable: boolean;
  tenant: {
    id: string;
    name: string;
    slug: string;
    status: Status;
    brandPrimaryColor: string;
    brandSecondaryColor: string;
    heroTagline: string;
    referralEnabled: boolean;
    referralPointsPercent: number;
    referralRedeemMaxPercent: number;
    platformFeeBps: number;
  };
}

export function TenantEditForm({ writable, tenant }: Props) {
  const router = useRouter();
  const [pending, startTransition] = useTransition();
  const [f, setF] = useState(tenant);

  function set<K extends keyof typeof f>(k: K, v: (typeof f)[K]) {
    setF((prev) => ({ ...prev, [k]: v }));
  }

  function onSave() {
    startTransition(async () => {
      const r = await updateTenant({
        tenantId: f.id,
        name: f.name,
        status: f.status,
        brandPrimaryColor: f.brandPrimaryColor,
        brandSecondaryColor: f.brandSecondaryColor,
        heroTagline: f.heroTagline,
        referralEnabled: f.referralEnabled,
        referralPointsPercent: f.referralPointsPercent,
        referralRedeemMaxPercent: f.referralRedeemMaxPercent,
        platformFeePercent: f.platformFeeBps / 100,
      });
      if (r.success) {
        toast.success("Tenant updated");
        router.refresh();
      } else {
        toast.error(r.error);
      }
    });
  }

  const disabled = !writable || pending;

  return (
    <div className="space-y-5">
      {!writable && (
        <p className="rounded-lg bg-muted px-3 py-2 text-xs text-muted-foreground">
          Read-only role — changes are disabled.
        </p>
      )}

      <div className="grid gap-4 sm:grid-cols-2">
        <div className="space-y-1.5">
          <Label className="text-xs font-medium">Name</Label>
          <Input
            value={f.name}
            onChange={(e) => set("name", e.target.value)}
            disabled={disabled}
            className="h-10 rounded-xl"
          />
        </div>
        <div className="space-y-1.5">
          <Label className="text-xs font-medium">Subdomain (immutable)</Label>
          <Input value={f.slug} disabled className="h-10 rounded-xl font-mono" />
        </div>
      </div>

      <div className="grid gap-4 sm:grid-cols-2">
        <div className="space-y-1.5">
          <Label className="text-xs font-medium">Status</Label>
          <Select
            value={f.status}
            onValueChange={(v) => v && set("status", v as Status)}
            disabled={disabled}
          >
            <SelectTrigger className="h-10 rounded-xl">
              <SelectValue />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="ACTIVE">Active</SelectItem>
              <SelectItem value="TRIAL">Trial</SelectItem>
              <SelectItem value="SUSPENDED">Suspended</SelectItem>
              <SelectItem value="CHURNED">Churned</SelectItem>
            </SelectContent>
          </Select>
        </div>
        <div className="space-y-1.5">
          <Label className="text-xs font-medium">Hero tagline</Label>
          <Input
            value={f.heroTagline}
            onChange={(e) => set("heroTagline", e.target.value)}
            disabled={disabled}
            className="h-10 rounded-xl"
          />
        </div>
      </div>

      <div className="grid gap-4 sm:grid-cols-2">
        <div className="space-y-1.5">
          <Label className="text-xs font-medium">Brand primary</Label>
          <div className="flex items-center gap-2">
            <input
              type="color"
              value={f.brandPrimaryColor}
              onChange={(e) => set("brandPrimaryColor", e.target.value)}
              disabled={disabled}
              className="h-10 w-12 cursor-pointer rounded-lg border border-black/10 bg-transparent disabled:cursor-not-allowed"
            />
            <Input
              value={f.brandPrimaryColor}
              onChange={(e) => set("brandPrimaryColor", e.target.value)}
              disabled={disabled}
              className="h-10 rounded-xl font-mono"
            />
          </div>
        </div>
        <div className="space-y-1.5">
          <Label className="text-xs font-medium">Brand secondary</Label>
          <div className="flex items-center gap-2">
            <input
              type="color"
              value={f.brandSecondaryColor}
              onChange={(e) => set("brandSecondaryColor", e.target.value)}
              disabled={disabled}
              className="h-10 w-12 cursor-pointer rounded-lg border border-black/10 bg-transparent disabled:cursor-not-allowed"
            />
            <Input
              value={f.brandSecondaryColor}
              onChange={(e) => set("brandSecondaryColor", e.target.value)}
              disabled={disabled}
              className="h-10 rounded-xl font-mono"
            />
          </div>
        </div>
      </div>

      <div className="rounded-xl border border-black/5 p-4">
        <div className="flex items-center gap-2">
          <Checkbox
            checked={f.referralEnabled}
            onCheckedChange={(c) => set("referralEnabled", c === true)}
            disabled={disabled}
            id="ref-enabled"
          />
          <Label htmlFor="ref-enabled" className="text-sm font-medium">
            Referral program enabled
          </Label>
        </div>
        <div className="mt-4 grid gap-4 sm:grid-cols-2">
          <div className="space-y-1.5">
            <Label className="text-xs font-medium">Points % of purchase</Label>
            <Input
              type="number"
              step="0.1"
              min={0}
              max={100}
              value={f.referralPointsPercent}
              onChange={(e) => set("referralPointsPercent", Number(e.target.value))}
              disabled={disabled}
              className="h-10 rounded-xl"
            />
          </div>
          <div className="space-y-1.5">
            <Label className="text-xs font-medium">Max redeem % of cart</Label>
            <Input
              type="number"
              step="0.1"
              min={0}
              max={100}
              value={f.referralRedeemMaxPercent}
              onChange={(e) => set("referralRedeemMaxPercent", Number(e.target.value))}
              disabled={disabled}
              className="h-10 rounded-xl"
            />
          </div>
        </div>
      </div>

      <div className="rounded-xl border border-black/5 p-4">
        <Label className="text-sm font-medium">Marketplace economics</Label>
        <div className="mt-4 max-w-xs space-y-1.5">
          <Label className="text-xs font-medium">Platform commission %</Label>
          <Input
            type="number"
            step="0.5"
            min={0}
            max={50}
            value={f.platformFeeBps / 100}
            onChange={(e) =>
              set("platformFeeBps", Math.round(Number(e.target.value) * 100))
            }
            disabled={disabled}
            className="h-10 rounded-xl"
          />
          <p className="text-[11px] text-muted-foreground">
            Taken from each sale; the institute is paid out the remainder.
            Platform-managed — the institute cannot change this.
          </p>
        </div>
      </div>

      <div className="flex justify-end">
        <Button onClick={onSave} disabled={disabled} className="rounded-xl">
          {pending && <Loader2 className="size-4 animate-spin" />}
          Save changes
        </Button>
      </div>
    </div>
  );
}
