"use client";

import { useTransition } from "react";
import { useRouter } from "next/navigation";
import { toast } from "sonner";
import { Loader2, CheckCircle2, Building2, Receipt } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { formatCurrency } from "@/lib/format";
import { markInstituteSalePaidAction } from "../actions";

export interface InstituteSale {
  id: string;
  courseName: string;
  instituteName: string;
  priceCents: number;
  currency: string;
  status: string; // "pending" | "paid"
  soldAt: string; // ISO date
}

export function InstituteSales({
  sales,
  writable,
}: {
  sales: InstituteSale[];
  writable: boolean;
}) {
  const router = useRouter();
  const [pending, start] = useTransition();

  const outstanding = sales
    .filter((s) => s.status === "pending")
    .reduce((a, s) => a + s.priceCents, 0);
  const currency = sales[0]?.currency ?? "INR";

  function markPaid(id: string) {
    start(async () => {
      const r = await markInstituteSalePaidAction({ saleId: id });
      if (r.success) {
        toast.success("Marked paid");
        router.refresh();
      } else {
        toast.error(r.error ?? "Failed");
      }
    });
  }

  return (
    <Card className="mb-8">
      <CardHeader className="flex-row items-center justify-between gap-2 space-y-0">
        <CardTitle className="flex items-center gap-2 text-sm">
          <Receipt className="size-4" /> Institute invoices
        </CardTitle>
        {outstanding > 0 && (
          <Badge variant="destructive" className="font-normal">
            {formatCurrency(outstanding, currency)} outstanding
          </Badge>
        )}
      </CardHeader>
      <CardContent>
        {sales.length === 0 ? (
          <p className="py-6 text-center text-sm text-muted-foreground">
            No institute sales yet. Use “Sell to an institute” on a master course
            above.
          </p>
        ) : (
          <ul className="divide-y">
            {sales.map((s) => (
              <li key={s.id} className="flex flex-wrap items-center gap-3 py-3">
                <div className="min-w-0 flex-1">
                  <div className="text-sm font-semibold">{s.courseName}</div>
                  <div className="mt-0.5 flex items-center gap-1.5 text-xs text-muted-foreground">
                    <Building2 className="size-3" /> {s.instituteName}
                    <span>·</span>
                    {s.soldAt.slice(0, 10)}
                  </div>
                </div>
                <span className="text-sm font-bold tabular-nums">
                  {formatCurrency(s.priceCents, s.currency)}
                </span>
                {s.status === "paid" ? (
                  <Badge
                    className="border-transparent font-normal text-white"
                    style={{ background: "var(--ed-green-dark)" }}
                  >
                    <CheckCircle2 className="size-3" /> Paid
                  </Badge>
                ) : (
                  <div className="flex items-center gap-2">
                    <Badge variant="secondary" className="font-normal">
                      Pending
                    </Badge>
                    <Button
                      size="sm"
                      variant="outline"
                      disabled={!writable || pending}
                      onClick={() => markPaid(s.id)}
                      className="h-8 rounded-lg"
                    >
                      {pending ? (
                        <Loader2 className="size-3.5 animate-spin" />
                      ) : (
                        <CheckCircle2 className="size-3.5" />
                      )}
                      Mark paid
                    </Button>
                  </div>
                )}
              </li>
            ))}
          </ul>
        )}
        <p className="mt-3 text-[11px] text-muted-foreground">
          Pending invoices settle automatically once the platform payment gateway
          (Stripe) is connected; until then, mark them paid here after collecting
          offline.
        </p>
      </CardContent>
    </Card>
  );
}
