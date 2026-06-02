"use client";

import { useTransition } from "react";
import { toast } from "sonner";
import { Check, Loader2, Undo2 } from "lucide-react";
import { Button } from "@/components/ui/button";
import { setCourseApproval } from "../actions";

/**
 * Approve / revoke a partner course. Approval flips the public-visibility
 * gate (programs.approvedAt) checked by the storefront, marketplace and
 * course page. Disabled for read-only super roles via `writable`.
 */
export function CourseApprovalButtons({
  programId,
  approved,
  writable,
}: {
  programId: string;
  approved: boolean;
  writable: boolean;
}) {
  const [pending, startTransition] = useTransition();

  function act(approve: boolean) {
    startTransition(async () => {
      const r = await setCourseApproval(programId, approve);
      if (r.success) {
        toast.success(approve ? "Course approved — now live" : "Approval revoked");
      } else {
        toast.error(r.error);
      }
    });
  }

  if (!writable) {
    return (
      <span className="text-xs text-muted-foreground">Read-only</span>
    );
  }

  return approved ? (
    <Button
      variant="outline"
      size="sm"
      disabled={pending}
      onClick={() => act(false)}
      className="rounded-lg"
    >
      {pending ? <Loader2 className="size-3.5 animate-spin" /> : <Undo2 className="size-3.5" />}
      Revoke
    </Button>
  ) : (
    <Button
      size="sm"
      disabled={pending}
      onClick={() => act(true)}
      className="rounded-lg"
    >
      {pending ? <Loader2 className="size-3.5 animate-spin" /> : <Check className="size-3.5" />}
      Approve
    </Button>
  );
}
