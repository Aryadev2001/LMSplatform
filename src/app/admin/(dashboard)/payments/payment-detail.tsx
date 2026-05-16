"use client";

import { useState, useTransition } from "react";
import { toast } from "sonner";
import { Loader2, ExternalLink, Receipt, RotateCcw } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
} from "@/components/ui/dialog";
import { markRefunded } from "./actions";

export interface PaymentDetailData {
  id: string;
  studentName: string;
  studentEmail: string;
  amountCents: number;
  refundedCents: number;
  currency: string;
  status: string;
  description: string | null;
  paymentMethodLabel: string | null;
  stripePaymentIntentId: string | null;
  stripeChargeId: string | null;
  stripeCustomerId: string | null;
  receiptUrl: string | null;
  createdAt: string;
}

function money(cents: number, currency: string) {
  return new Intl.NumberFormat("en-US", { style: "currency", currency }).format(cents / 100);
}

export function PaymentDetail({ payment }: { payment: PaymentDetailData }) {
  const [open, setOpen] = useState(false);
  const [pending, startTransition] = useTransition();
  const netCents = payment.amountCents - payment.refundedCents;

  function refundFull() {
    startTransition(async () => {
      const r = await markRefunded(payment.id, payment.amountCents - payment.refundedCents);
      if (r.success) {
        toast.success("Marked as refunded");
        setOpen(false);
      } else {
        toast.error(r.error);
      }
    });
  }

  return (
    <Dialog open={open} onOpenChange={setOpen}>
      <DialogTrigger render={<Button variant="ghost" size="sm" className="rounded-lg" />}>
        View
      </DialogTrigger>
      <DialogContent className="sm:max-w-lg">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2">
            {money(payment.amountCents, payment.currency)}
            <StatusBadge status={payment.status} />
          </DialogTitle>
          <DialogDescription>
            {payment.description ?? "Coaching program payment"}
          </DialogDescription>
        </DialogHeader>

        <div className="space-y-4">
          <div className="rounded-xl border border-black/8 bg-secondary/30 p-4">
            <Row label="Customer" value={payment.studentName} />
            <Row label="Email" value={payment.studentEmail} />
            <Row
              label="Payment method"
              value={payment.paymentMethodLabel ?? "—"}
            />
            <Row label="Date" value={new Date(payment.createdAt).toLocaleString()} />
          </div>

          <div className="rounded-xl border border-black/8 bg-secondary/30 p-4">
            <Row label="Amount" value={money(payment.amountCents, payment.currency)} />
            <Row
              label="Refunded"
              value={
                payment.refundedCents > 0
                  ? money(payment.refundedCents, payment.currency)
                  : "—"
              }
            />
            <Row label="Net" value={money(netCents, payment.currency)} strong />
          </div>

          <div className="rounded-xl border border-black/8 bg-secondary/30 p-4 font-mono text-[11px]">
            <Row label="Payment intent" value={payment.stripePaymentIntentId ?? "—"} mono />
            <Row label="Charge" value={payment.stripeChargeId ?? "—"} mono />
            <Row label="Customer ID" value={payment.stripeCustomerId ?? "—"} mono />
          </div>

          <div className="flex flex-wrap items-center gap-2">
            {payment.receiptUrl && (
              <a
                href={payment.receiptUrl}
                target="_blank"
                rel="noopener noreferrer"
                className="inline-flex items-center gap-1.5 rounded-lg border border-black/10 px-3 py-2 text-xs font-medium transition-colors hover:bg-secondary"
              >
                <Receipt className="size-3.5" />
                Receipt
                <ExternalLink className="size-3" />
              </a>
            )}
            {payment.status !== "refunded" && payment.refundedCents < payment.amountCents && (
              <Button
                variant="destructive"
                size="sm"
                onClick={refundFull}
                disabled={pending}
                className="rounded-lg"
              >
                {pending ? (
                  <Loader2 className="size-3.5 animate-spin" />
                ) : (
                  <RotateCcw className="size-3.5" />
                )}
                Mark refunded
              </Button>
            )}
          </div>

          <p className="text-[11px] text-muted-foreground">
            Refunds are recorded locally for now. When Stripe is connected this will issue a real
            refund via the Stripe API.
          </p>
        </div>
      </DialogContent>
    </Dialog>
  );
}

function Row({
  label,
  value,
  strong,
  mono,
}: {
  label: string;
  value: string;
  strong?: boolean;
  mono?: boolean;
}) {
  return (
    <div className="flex items-center justify-between py-1 text-sm">
      <span className="text-muted-foreground">{label}</span>
      <span
        className={`max-w-[60%] truncate ${strong ? "font-semibold" : ""} ${mono ? "font-mono text-[11px]" : ""}`}
      >
        {value}
      </span>
    </div>
  );
}

function StatusBadge({ status }: { status: string }) {
  const variant =
    status === "succeeded" ? "default" : status === "refunded" ? "destructive" : "secondary";
  return (
    <Badge variant={variant} className="font-normal capitalize">
      {status}
    </Badge>
  );
}
