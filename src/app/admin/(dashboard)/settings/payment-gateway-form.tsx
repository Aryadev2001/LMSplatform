"use client";

import { useState, useTransition } from "react";
import { useRouter } from "next/navigation";
import { toast } from "sonner";
import { Loader2, CheckCircle2, ShieldCheck } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Badge } from "@/components/ui/badge";
import {
  connectRazorpay,
  disconnectRazorpay,
  connectStripe,
  disconnectStripe,
} from "./actions";

type Provider = "razorpay" | "stripe";

function mask(v: string) {
  return v.length <= 12 ? v : `${v.slice(0, 12)}…${v.slice(-4)}`;
}

export function PaymentGatewayForm({
  provider,
  razorpayKeyId,
  razorpayConnected,
  stripePublishableKey,
  stripeConnected,
}: {
  provider: string | null;
  razorpayKeyId: string | null;
  razorpayConnected: boolean;
  stripePublishableKey: string | null;
  stripeConnected: boolean;
}) {
  const router = useRouter();
  const [pending, startTransition] = useTransition();
  // Default the visible tab to the active provider, else Razorpay.
  const [tab, setTab] = useState<Provider>(
    provider === "stripe" ? "stripe" : "razorpay",
  );

  const [rzpKeyId, setRzpKeyId] = useState("");
  const [rzpSecret, setRzpSecret] = useState("");
  const [stKey, setStKey] = useState("");
  const [stSecret, setStSecret] = useState("");

  function act(
    fn: () => Promise<{ success: boolean; error?: string }>,
    okMsg: string,
  ) {
    startTransition(async () => {
      const r = await fn();
      if (r.success) {
        toast.success(okMsg);
        setRzpKeyId("");
        setRzpSecret("");
        setStKey("");
        setStSecret("");
        router.refresh();
      } else {
        toast.error(r.error ?? "Failed");
      }
    });
  }

  const TabBtn = ({ id, label }: { id: Provider; label: string }) => (
    <button
      type="button"
      onClick={() => setTab(id)}
      className={`rounded-lg px-3 py-1.5 text-xs font-medium transition-colors ${
        tab === id
          ? "bg-foreground text-background"
          : "bg-secondary/60 text-muted-foreground hover:text-foreground"
      }`}
    >
      {label}
      {provider === id && (
        <span className="ml-1.5 rounded bg-emerald-500/20 px-1 text-[10px] text-emerald-700">
          active
        </span>
      )}
    </button>
  );

  return (
    <div className="space-y-4">
      <div className="flex gap-2">
        <TabBtn id="razorpay" label="Razorpay" />
        <TabBtn id="stripe" label="Stripe" />
      </div>

      {tab === "razorpay" ? (
        razorpayConnected ? (
          <div className="space-y-4">
            <div className="flex items-center justify-between rounded-xl border border-emerald-200 bg-emerald-50 px-3 py-2.5">
              <span className="flex items-center gap-2 text-sm text-emerald-700">
                <CheckCircle2 className="size-4" />
                Razorpay connected
              </span>
              <Badge variant="secondary" className="font-mono text-[11px]">
                {mask(razorpayKeyId ?? "")}
              </Badge>
            </div>
            <p className="flex items-start gap-2 text-[11px] text-muted-foreground">
              <ShieldCheck className="mt-0.5 size-3.5 shrink-0" />
              Secret encrypted at rest, never displayed again. Disconnect to rotate.
            </p>
            <div className="flex justify-end">
              <Button
                variant="outline"
                disabled={pending}
                onClick={() =>
                  act(() => disconnectRazorpay(), "Razorpay disconnected")
                }
                className="rounded-xl"
              >
                {pending && <Loader2 className="size-4 animate-spin" />}
                Disconnect
              </Button>
            </div>
          </div>
        ) : (
          <div className="space-y-4">
            <div className="rounded-xl border border-amber-200 bg-amber-50 px-3 py-2.5 text-xs text-amber-800">
              Razorpay Dashboard → Settings → API Keys.
            </div>
            <div className="space-y-1.5">
              <Label className="text-xs font-medium">Razorpay Key ID</Label>
              <Input
                value={rzpKeyId}
                onChange={(e) => setRzpKeyId(e.target.value)}
                placeholder="rzp_live_XXXXXXXXXXXX"
                className="h-10 rounded-xl font-mono"
                autoComplete="off"
              />
            </div>
            <div className="space-y-1.5">
              <Label className="text-xs font-medium">Razorpay Key Secret</Label>
              <Input
                type="password"
                value={rzpSecret}
                onChange={(e) => setRzpSecret(e.target.value)}
                placeholder="••••••••••••••••••••"
                className="h-10 rounded-xl font-mono"
                autoComplete="off"
              />
              <p className="text-[11px] text-muted-foreground">
                Stored encrypted (AES-256-GCM). Never shown again or visible to
                the platform team.
              </p>
            </div>
            <div className="flex justify-end">
              <Button
                disabled={
                  pending || rzpKeyId.trim().length < 8 || rzpSecret.trim().length < 10
                }
                onClick={() =>
                  act(
                    () => connectRazorpay({ keyId: rzpKeyId, keySecret: rzpSecret }),
                    "Razorpay connected — payments route to your account",
                  )
                }
                className="rounded-xl"
              >
                {pending && <Loader2 className="size-4 animate-spin" />}
                Connect Razorpay
              </Button>
            </div>
          </div>
        )
      ) : stripeConnected ? (
        <div className="space-y-4">
          <div className="flex items-center justify-between rounded-xl border border-emerald-200 bg-emerald-50 px-3 py-2.5">
            <span className="flex items-center gap-2 text-sm text-emerald-700">
              <CheckCircle2 className="size-4" />
              Stripe connected
            </span>
            <Badge variant="secondary" className="font-mono text-[11px]">
              {mask(stripePublishableKey ?? "")}
            </Badge>
          </div>
          <p className="flex items-start gap-2 text-[11px] text-muted-foreground">
            <ShieldCheck className="mt-0.5 size-3.5 shrink-0" />
            Secret key encrypted at rest, never displayed again. Disconnect to rotate.
          </p>
          <div className="flex justify-end">
            <Button
              variant="outline"
              disabled={pending}
              onClick={() => act(() => disconnectStripe(), "Stripe disconnected")}
              className="rounded-xl"
            >
              {pending && <Loader2 className="size-4 animate-spin" />}
              Disconnect
            </Button>
          </div>
        </div>
      ) : (
        <div className="space-y-4">
          <div className="rounded-xl border border-amber-200 bg-amber-50 px-3 py-2.5 text-xs text-amber-800">
            Stripe Dashboard → Developers → API keys.
          </div>
          <div className="space-y-1.5">
            <Label className="text-xs font-medium">Stripe Publishable Key</Label>
            <Input
              value={stKey}
              onChange={(e) => setStKey(e.target.value)}
              placeholder="pk_live_XXXXXXXXXXXX"
              className="h-10 rounded-xl font-mono"
              autoComplete="off"
            />
          </div>
          <div className="space-y-1.5">
            <Label className="text-xs font-medium">Stripe Secret Key</Label>
            <Input
              type="password"
              value={stSecret}
              onChange={(e) => setStSecret(e.target.value)}
              placeholder="sk_live_••••••••••••••••"
              className="h-10 rounded-xl font-mono"
              autoComplete="off"
            />
            <p className="text-[11px] text-muted-foreground">
              Stored encrypted (AES-256-GCM). Never shown again or visible to
              the platform team.
            </p>
          </div>
          <div className="flex justify-end">
            <Button
              disabled={
                pending || stKey.trim().length < 8 || stSecret.trim().length < 10
              }
              onClick={() =>
                act(
                  () =>
                    connectStripe({
                      publishableKey: stKey,
                      secretKey: stSecret,
                    }),
                  "Stripe connected — payments route to your account",
                )
              }
              className="rounded-xl"
            >
              {pending && <Loader2 className="size-4 animate-spin" />}
              Connect Stripe
            </Button>
          </div>
        </div>
      )}

      {provider && (
        <p className="text-[11px] text-muted-foreground">
          Active gateway:{" "}
          <span className="font-medium capitalize text-foreground">{provider}</span>
          . Connecting the other switches it.
        </p>
      )}
    </div>
  );
}
