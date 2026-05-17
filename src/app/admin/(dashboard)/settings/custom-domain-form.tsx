"use client";

import { useState, useTransition } from "react";
import { useRouter } from "next/navigation";
import { toast } from "sonner";
import { Loader2, Check, Copy, CheckCircle2 } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Badge } from "@/components/ui/badge";
import { dnsRecordsFor } from "@/lib/dns";
import { requestCustomDomain } from "./actions";

type Status = "NONE" | "REQUESTED" | "CONFIGURED";

const STATUS_COPY: Record<Status, { label: string; variant: "secondary" | "default" | "outline" }> = {
  NONE: { label: "Not set", variant: "outline" },
  REQUESTED: { label: "Pending verification", variant: "secondary" },
  CONFIGURED: { label: "Live", variant: "default" },
};

function CopyCell({ text }: { text: string }) {
  const [copied, setCopied] = useState(false);
  return (
    <button
      type="button"
      onClick={async () => {
        try {
          await navigator.clipboard.writeText(text);
          setCopied(true);
          setTimeout(() => setCopied(false), 1500);
        } catch {
          /* clipboard blocked — value is selectable in the cell */
        }
      }}
      className="inline-flex items-center gap-1.5 font-mono text-xs hover:text-foreground"
      title="Copy"
    >
      <span className="truncate">{text}</span>
      {copied ? (
        <Check className="size-3 shrink-0 text-emerald-600" />
      ) : (
        <Copy className="size-3 shrink-0 text-muted-foreground" />
      )}
    </button>
  );
}

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
  // Show records for the locked-in domain (requested/live) or a live preview
  // of what the typed domain will need.
  const recordDomain =
    status === "NONE" ? domain : currentDomain ?? domain;
  const records = dnsRecordsFor(recordDomain);

  return (
    <div className="space-y-4">
      {currentDomain && (
        <div className="flex items-center justify-between rounded-xl border border-black/10 bg-secondary/40 px-3 py-2.5">
          <span className="font-mono text-sm">{currentDomain}</span>
          <Badge variant={s.variant}>{s.label}</Badge>
        </div>
      )}

      {status === "CONFIGURED" ? (
        <div className="flex items-center gap-2 rounded-xl border border-emerald-200 bg-emerald-50 px-3 py-2.5 text-sm text-emerald-700">
          <CheckCircle2 className="size-4" />
          DNS verified — your domain is live.
        </div>
      ) : (
        <>
          <div className="space-y-1.5">
            <Label className="text-xs font-medium">Domain</Label>
            <Input
              value={domain}
              onChange={(e) => setDomain(e.target.value)}
              placeholder="learn.yourbrand.com"
              className="h-10 rounded-xl font-mono"
              disabled={status === "REQUESTED"}
            />
          </div>

          {records.length > 0 && (
            <div className="space-y-2 rounded-xl border border-black/10 p-3">
              <div className="text-xs font-medium">
                {status === "REQUESTED"
                  ? "Add these DNS records at your domain registrar"
                  : "DNS records you'll need to add"}
              </div>
              <div className="overflow-hidden rounded-lg border border-black/5">
                <table className="w-full text-left">
                  <thead className="bg-secondary/50 text-[10px] uppercase tracking-widest text-muted-foreground">
                    <tr>
                      <th className="px-3 py-1.5 font-medium">Type</th>
                      <th className="px-3 py-1.5 font-medium">Name / Host</th>
                      <th className="px-3 py-1.5 font-medium">Value</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-black/5">
                    {records.map((r, i) => (
                      <tr key={i}>
                        <td className="px-3 py-2 font-mono text-xs">{r.type}</td>
                        <td className="px-3 py-2">
                          <CopyCell text={r.name} />
                        </td>
                        <td className="px-3 py-2">
                          <CopyCell text={r.value} />
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
              <p className="text-[11px] leading-relaxed text-muted-foreground">
                Add the record(s) above with your DNS provider (GoDaddy,
                Cloudflare, Namecheap…). DNS can take up to ~24h to propagate;
                we verify and flip your domain live automatically once it
                resolves. If your domain is already used elsewhere, your
                platform operator may share an extra one-time{" "}
                <span className="font-mono">_vercel</span> TXT record to add.
              </p>
            </div>
          )}
        </>
      )}

      {status !== "CONFIGURED" && (
        <div className="flex justify-end">
          <Button
            onClick={onSubmit}
            disabled={pending || domain.trim().length < 4 || status === "REQUESTED"}
            className="rounded-xl"
          >
            {pending && <Loader2 className="size-4 animate-spin" />}
            {status === "REQUESTED" ? "Awaiting verification" : "Request domain"}
          </Button>
        </div>
      )}
    </div>
  );
}
