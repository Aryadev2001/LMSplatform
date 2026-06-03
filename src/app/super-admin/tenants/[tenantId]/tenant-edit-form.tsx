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
type Tier = "basic" | "standard" | "premium";
type FeatureKey =
  | "paid_courses"
  | "student_details"
  | "live_classes"
  | "ai_services"
  | "diagnostics"
  | "white_label";
type OverrideState = "default" | "granted" | "revoked";

const FEATURE_INFO: Record<
  FeatureKey,
  { label: string; description: string; defaultTier: Tier }
> = {
  paid_courses: {
    label: "Paid courses",
    description:
      "Publish courses priced above ₹0 (Basic publishes free courses only).",
    defaultTier: "standard",
  },
  student_details: {
    label: "Student details & contact",
    description:
      "View enrolled students' email/profile/progress + the detail page (Basic sees names only).",
    defaultTier: "standard",
  },
  live_classes: {
    label: "Live classes",
    description: "Schedule live classes (Zoom/Meet) for enrolled students.",
    defaultTier: "standard",
  },
  ai_services: {
    label: "AI Services",
    description: "Sell AI subscriptions to enrolled students.",
    defaultTier: "premium",
  },
  diagnostics: {
    label: "Diagnostics",
    description: "Business X-Ray diagnostics for the tenant's students.",
    defaultTier: "premium",
  },
  white_label: {
    label: "White-label storefront",
    description:
      "Hides the eurodigital.coach platform nav / footer on /institute/<slug>.",
    defaultTier: "premium",
  },
};

interface Props {
  writable: boolean;
  tenant: {
    id: string;
    name: string;
    slug: string;
    status: Status;
    tier: Tier;
    brandPrimaryColor: string;
    brandSecondaryColor: string;
    heroTagline: string;
    referralEnabled: boolean;
    referralPointsPercent: number;
    referralRedeemMaxPercent: number;
    platformFeeBps: number;
    hidePlatformLogo: boolean;
    featureOverrides: Partial<Record<FeatureKey, boolean>>;
  };
}

function overrideStateFor(v: boolean | undefined): OverrideState {
  if (v === true) return "granted";
  if (v === false) return "revoked";
  return "default";
}

export function TenantEditForm({ writable, tenant }: Props) {
  const router = useRouter();
  const [pending, startTransition] = useTransition();
  const [f, setF] = useState(tenant);

  function setOverride(key: FeatureKey, state: OverrideState) {
    setF((prev) => {
      const next = { ...prev.featureOverrides };
      if (state === "granted") next[key] = true;
      else if (state === "revoked") next[key] = false;
      else delete next[key];
      return { ...prev, featureOverrides: next };
    });
  }

  function set<K extends keyof typeof f>(k: K, v: (typeof f)[K]) {
    setF((prev) => ({ ...prev, [k]: v }));
  }

  function onSave() {
    startTransition(async () => {
      const r = await updateTenant({
        tenantId: f.id,
        name: f.name,
        status: f.status,
        tier: f.tier,
        brandPrimaryColor: f.brandPrimaryColor,
        brandSecondaryColor: f.brandSecondaryColor,
        heroTagline: f.heroTagline,
        referralEnabled: f.referralEnabled,
        referralPointsPercent: f.referralPointsPercent,
        referralRedeemMaxPercent: f.referralRedeemMaxPercent,
        platformFeePercent: f.platformFeeBps / 100,
        hidePlatformLogo: f.hidePlatformLogo,
        featureOverrides: f.featureOverrides,
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

      <div className="grid gap-4 sm:grid-cols-3">
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
          <Label className="text-xs font-medium">Partner tier</Label>
          <Select
            value={f.tier}
            onValueChange={(v) => v && set("tier", v as Tier)}
            disabled={disabled}
          >
            <SelectTrigger className="h-10 rounded-xl">
              <SelectValue />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="basic">Basic (free)</SelectItem>
              <SelectItem value="standard">Standard</SelectItem>
              <SelectItem value="premium">Premium</SelectItem>
            </SelectContent>
          </Select>
          <p className="text-[11px] text-muted-foreground">
            Grants access to gated features (AI Services, Diagnostics, etc).
            Manual override — bypasses self-serve checkout.
          </p>
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

      {/* Feature overrides — per-feature grant / revoke that beats the tier */}
      <div className="rounded-xl border border-black/5 p-4">
        <Label className="text-sm font-medium">Feature access</Label>
        <p className="mt-1 text-[11px] text-muted-foreground">
          Each feature defaults to whichever tier requires it. Use{" "}
          <strong>Grant</strong> to enable a feature without bumping the tier
          (comp / pilot), or <strong>Revoke</strong> to explicitly disable a
          feature even if the tier would normally allow it.
        </p>

        <div className="mt-4 space-y-3">
          {(Object.keys(FEATURE_INFO) as FeatureKey[]).map((key) => {
            const info = FEATURE_INFO[key];
            const explicit = f.featureOverrides[key];
            const stateValue = overrideStateFor(explicit);
            const effective =
              explicit === true
                ? true
                : explicit === false
                  ? false
                  : (f.tier === "premium" && info.defaultTier === "premium") ||
                    (f.tier === "standard" && info.defaultTier === "standard") ||
                    (f.tier === "basic" && info.defaultTier === "basic");

            return (
              <div
                key={key}
                className="grid grid-cols-[1fr_auto_auto] items-center gap-3 rounded-lg border border-black/5 px-3 py-2"
              >
                <div className="min-w-0">
                  <div className="flex items-center gap-2 text-sm font-semibold">
                    <span>{info.label}</span>
                    <span
                      className={`rounded-full px-2 py-0.5 text-[10px] font-bold uppercase tracking-wider ${
                        effective
                          ? "bg-emerald-100 text-emerald-700"
                          : "bg-muted text-muted-foreground"
                      }`}
                    >
                      {effective ? "Enabled" : "Disabled"}
                    </span>
                  </div>
                  <p className="mt-0.5 text-[11px] text-muted-foreground">
                    {info.description} · Default tier:{" "}
                    <span className="font-mono">{info.defaultTier}</span>
                  </p>
                </div>
                <Select
                  value={stateValue}
                  onValueChange={(v) =>
                    v && setOverride(key, v as OverrideState)
                  }
                  disabled={disabled}
                >
                  <SelectTrigger className="h-9 w-36 rounded-lg text-xs">
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="default">Use tier default</SelectItem>
                    <SelectItem value="granted">Grant (force on)</SelectItem>
                    <SelectItem value="revoked">Revoke (force off)</SelectItem>
                  </SelectContent>
                </Select>
                {/* Inline white-label toggle: the override controls whether
                    the tenant CAN use white-label; this toggle says whether
                    they're actively using it right now. */}
                {key === "white_label" ? (
                  <label className="flex shrink-0 items-center gap-1.5 rounded-lg border border-black/10 px-2.5 py-1.5 text-[11px] font-semibold">
                    <Checkbox
                      checked={f.hidePlatformLogo}
                      onCheckedChange={(c) =>
                        set("hidePlatformLogo", c === true)
                      }
                      disabled={disabled || !effective}
                    />
                    Active
                  </label>
                ) : (
                  <span className="w-[78px]" aria-hidden />
                )}
              </div>
            );
          })}
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
