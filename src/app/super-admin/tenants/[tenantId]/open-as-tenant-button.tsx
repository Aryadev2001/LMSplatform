"use client";

import { useTransition } from "react";
import { toast } from "sonner";
import { Loader2, LogIn } from "lucide-react";
import { Button } from "@/components/ui/button";
import { impersonateTenant } from "../../actions";

export function OpenAsTenantButton({
  tenantId,
  disabled,
}: {
  tenantId: string;
  disabled?: boolean;
}) {
  const [pending, start] = useTransition();
  return (
    <Button
      variant="outline"
      className="rounded-xl"
      disabled={disabled || pending}
      onClick={() =>
        start(async () => {
          const r = await impersonateTenant({ tenantId });
          // On success the action redirects; only a failure returns here.
          if (r && !r.success) toast.error(r.error);
        })
      }
    >
      {pending ? (
        <Loader2 className="size-4 animate-spin" />
      ) : (
        <LogIn className="size-4" />
      )}
      Open dashboard as this tenant
    </Button>
  );
}
