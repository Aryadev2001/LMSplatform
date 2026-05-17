"use client";

import { useState, useTransition } from "react";
import { useRouter } from "next/navigation";
import { toast } from "sonner";
import { Loader2, CheckCircle2, ShieldCheck } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Badge } from "@/components/ui/badge";
import { connectRazorpay, disconnectRazorpay } from "./actions";

function maskKeyId(keyId: string) {
  if (keyId.length <= 12) return keyId;
  return `${keyId.slice(0, 12)}…${keyId.slice(-4)}`;
}

export function PaymentGatewayForm({
  connectedKeyId,
  hasSecret,
}: {
  connectedKeyId: string | null;
  hasSecret: boolean;
}) {
  const router = useRouter();
  const [pending, startTransition] = useTransition();
  const [keyId, setKeyId] = useState("");
  const [keySecret, setKeySecret] = useState("");

  const connected = !!connectedKeyId && hasSecret;

  function onConnect() {
    startTransition(async () => {
      const r = await connectRazorpay({ keyId, keySecret });
      if (r.success) {
        toast.success("Razorpay connected — payments now route to your account");
        setKeyId("");
        setKeySecret("");
        router.refresh();
      } else {
        toast.error(r.error);
      }
    });
  }

  function onDisconnect() {
    startTransition(async () => {
      const r = await disconnectRazorpay();
      if (r.success) {
        toast.success("Razorpay disconnected");
        router.refresh();
      } else {
        toast.error(r.error);
      }
    });
  }

  if (connected) {
    return (
      <div className="space-y-4">
        <div className="flex items-center justify-between rounded-xl border border-emerald-200 bg-emerald-50 px-3 py-2.5">
          <span className="flex items-center gap-2 text-sm text-emerald-700">
            <CheckCircle2 className="size-4" />
            Razorpay connected
          </span>
          <Badge variant="secondary" className="font-mono text-[11px]">
            {maskKeyId(connectedKeyId!)}
          </Badge>
        </div>
        <p className="flex items-start gap-2 text-[11px] text-muted-foreground">
          <ShieldCheck className="mt-0.5 size-3.5 shrink-0" />
          Your key secret is encrypted at rest and never displayed again. Rotate
          it any time by disconnecting and reconnecting.
        </p>
        <div className="flex justify-end">
          <Button
            variant="outline"
            onClick={onDisconnect}
            disabled={pending}
            className="rounded-xl"
          >
            {pending && <Loader2 className="size-4 animate-spin" />}
            Disconnect
          </Button>
        </div>
      </div>
    );
  }

  return (
    <div className="space-y-4">
      <div className="rounded-xl border border-amber-200 bg-amber-50 px-3 py-2.5 text-xs text-amber-800">
        Not connected — student payments can&apos;t be collected until you add
        your Razorpay keys. Find them in Razorpay Dashboard → Settings → API
        Keys.
      </div>
      <div className="space-y-1.5">
        <Label className="text-xs font-medium">Razorpay Key ID</Label>
        <Input
          value={keyId}
          onChange={(e) => setKeyId(e.target.value)}
          placeholder="rzp_live_XXXXXXXXXXXX"
          className="h-10 rounded-xl font-mono"
          autoComplete="off"
        />
      </div>
      <div className="space-y-1.5">
        <Label className="text-xs font-medium">Razorpay Key Secret</Label>
        <Input
          type="password"
          value={keySecret}
          onChange={(e) => setKeySecret(e.target.value)}
          placeholder="••••••••••••••••••••"
          className="h-10 rounded-xl font-mono"
          autoComplete="off"
        />
        <p className="text-[11px] text-muted-foreground">
          Stored encrypted (AES-256-GCM). It&apos;s never shown again or visible
          to the platform team.
        </p>
      </div>
      <div className="flex justify-end">
        <Button
          onClick={onConnect}
          disabled={pending || keyId.trim().length < 8 || keySecret.trim().length < 10}
          className="rounded-xl"
        >
          {pending && <Loader2 className="size-4 animate-spin" />}
          Connect Razorpay
        </Button>
      </div>
    </div>
  );
}
