"use client";

import { useState, useTransition } from "react";
import { useRouter } from "next/navigation";
import { toast } from "sonner";
import { Loader2, Check, X } from "lucide-react";
import { Button } from "@/components/ui/button";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { Label } from "@/components/ui/label";
import { Input } from "@/components/ui/input";
import { markDomainConfigured, rejectDomainRequest } from "../actions";

export function DomainRowActions({
  requestId,
  domain,
}: {
  requestId: string;
  domain: string;
}) {
  const router = useRouter();
  const [pending, startTransition] = useTransition();
  const [rejectOpen, setRejectOpen] = useState(false);
  const [notes, setNotes] = useState("");

  function configure() {
    startTransition(async () => {
      const r = await markDomainConfigured({ requestId });
      if (r.success) {
        toast.success(`${domain} marked configured`);
        router.refresh();
      } else {
        toast.error(r.error);
      }
    });
  }

  function reject() {
    startTransition(async () => {
      const r = await rejectDomainRequest({ requestId, notes });
      if (r.success) {
        toast.success("Request rejected");
        setRejectOpen(false);
        setNotes("");
        router.refresh();
      } else {
        toast.error(r.error);
      }
    });
  }

  return (
    <div className="flex items-center justify-end gap-2">
      <Button size="sm" onClick={configure} disabled={pending} className="rounded-lg">
        {pending ? <Loader2 className="size-3.5 animate-spin" /> : <Check className="size-3.5" />}
        Mark configured
      </Button>
      <Button
        size="sm"
        variant="outline"
        onClick={() => setRejectOpen(true)}
        disabled={pending}
        className="rounded-lg"
      >
        <X className="size-3.5" />
        Reject
      </Button>

      <Dialog open={rejectOpen} onOpenChange={setRejectOpen}>
        <DialogContent className="sm:max-w-md">
          <DialogHeader>
            <DialogTitle>Reject {domain}</DialogTitle>
            <DialogDescription>
              This clears the tenant&apos;s pending domain. Add a reason (shown to no one
              but the audit log + queue).
            </DialogDescription>
          </DialogHeader>
          <div className="space-y-1.5">
            <Label className="text-xs font-medium">Reason (optional)</Label>
            <Input
              value={notes}
              onChange={(e) => setNotes(e.target.value)}
              placeholder="DNS not pointing / domain unverifiable"
              className="h-10 rounded-xl"
            />
          </div>
          <DialogFooter className="gap-2">
            <Button
              variant="outline"
              onClick={() => setRejectOpen(false)}
              className="rounded-xl"
            >
              Cancel
            </Button>
            <Button onClick={reject} disabled={pending} className="rounded-xl">
              {pending && <Loader2 className="size-4 animate-spin" />}
              Reject request
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
}
