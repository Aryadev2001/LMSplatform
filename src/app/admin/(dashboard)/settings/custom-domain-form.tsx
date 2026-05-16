"use client";

import { useState, useTransition } from "react";
import { useRouter } from "next/navigation";
import { toast } from "sonner";
import { Loader2 } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Badge } from "@/components/ui/badge";
import { requestCustomDomain } from "./actions";

type Status = "NONE" | "REQUESTED" | "CONFIGURED";

const STATUS_COPY: Record<Status, { label: string; variant: "secondary" | "default" | "outline" }> = {
  NONE: { label: "Not set", variant: "outline" },
  REQUESTED: { label: "Pending review", variant: "secondary" },
  CONFIGURED: { label: "Live", variant: "default" },
};

export function CustomDomainForm({
  currentDomain,
  status,
}: {
  currentDomain: string | null;
  status: Status;
}) {
  const router = useRouter();
  const [pending, startTransition] = useTransition();
  const [domain, setDomain] = useState(currentDomain ?? "");

  function onSubmit() {
    startTransition(async () => {
      const r = await requestCustomDomain({ domain });
      if (r.success) {
        toast.success("Domain request submitted");
        router.refresh();
      } else {
        toast.error(r.error);
      }
    });
  }

  const s = STATUS_COPY[status];

  return (
    <div className="space-y-4">
      {currentDomain && (
        <div className="flex items-center justify-between rounded-xl border border-black/10 bg-secondary/40 px-3 py-2.5">
          <span className="font-mono text-sm">{currentDomain}</span>
          <Badge variant={s.variant}>{s.label}</Badge>
        </div>
      )}

      <div className="space-y-1.5">
        <Label className="text-xs font-medium">Domain</Label>
        <Input
          value={domain}
          onChange={(e) => setDomain(e.target.value)}
          placeholder="learn.yourbrand.com"
          className="h-10 rounded-xl font-mono"
        />
      </div>

      {status === "REQUESTED" && (
        <div className="rounded-xl border border-black/5 bg-secondary/40 p-3 text-xs text-muted-foreground">
          Point your DNS now so it&apos;s ready: add a{" "}
          <span className="font-mono">CNAME</span> from{" "}
          <span className="font-mono">{domain || currentDomain}</span> to{" "}
          <span className="font-mono">cname.vercel-dns.com</span>. We&apos;ll flip it
          live once verified.
        </div>
      )}

      <div className="flex justify-end">
        <Button
          onClick={onSubmit}
          disabled={pending || domain.trim().length < 4}
          className="rounded-xl"
        >
          {pending && <Loader2 className="size-4 animate-spin" />}
          {currentDomain ? "Update request" : "Request domain"}
        </Button>
      </div>
    </div>
  );
}
