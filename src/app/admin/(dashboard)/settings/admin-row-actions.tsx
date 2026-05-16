"use client";

import { useState, useTransition } from "react";
import { toast } from "sonner";
import { Loader2, MoreHorizontal, Shield, Trash2 } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Checkbox } from "@/components/ui/checkbox";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import { ADMIN_PERMISSIONS, PERMISSION_LABELS, type AdminPermission } from "@/lib/permissions";
import { updateAdminPermissions, removeAdmin } from "./actions";

interface AdminRowActionsProps {
  userId: string;
  name: string;
  isSuperAdmin: boolean;
  currentPermissions: string[];
  isSelf: boolean;
}

export function AdminRowActions({
  userId,
  name,
  isSuperAdmin,
  currentPermissions,
  isSelf,
}: AdminRowActionsProps) {
  const [permOpen, setPermOpen] = useState(false);
  const [removeOpen, setRemoveOpen] = useState(false);
  const [pending, startTransition] = useTransition();
  const [perms, setPerms] = useState<AdminPermission[]>(
    currentPermissions.filter((p): p is AdminPermission =>
      (ADMIN_PERMISSIONS as readonly string[]).includes(p),
    ),
  );

  if (isSuperAdmin) {
    return (
      <span className="text-[11px] uppercase tracking-widest text-muted-foreground">
        Super admin
      </span>
    );
  }

  function toggle(p: AdminPermission) {
    setPerms((cur) => (cur.includes(p) ? cur.filter((x) => x !== p) : [...cur, p]));
  }

  function savePerms() {
    startTransition(async () => {
      const r = await updateAdminPermissions(userId, perms);
      if (r.success) {
        toast.success("Permissions updated");
        setPermOpen(false);
      } else {
        toast.error(r.error);
      }
    });
  }

  function doRemove() {
    startTransition(async () => {
      const r = await removeAdmin(userId);
      if (r.success) {
        toast.success(`${name} removed`);
        setRemoveOpen(false);
      } else {
        toast.error(r.error);
      }
    });
  }

  return (
    <>
      <DropdownMenu>
        <DropdownMenuTrigger
          render={<Button variant="ghost" size="icon-sm" aria-label="Actions" />}
        >
          <MoreHorizontal className="size-4" />
        </DropdownMenuTrigger>
        <DropdownMenuContent align="end">
          <DropdownMenuItem onClick={() => setPermOpen(true)}>
            <Shield className="size-4" />
            Edit permissions
          </DropdownMenuItem>
          {!isSelf && (
            <DropdownMenuItem
              onClick={() => setRemoveOpen(true)}
              className="text-destructive focus:text-destructive"
            >
              <Trash2 className="size-4" />
              Remove admin
            </DropdownMenuItem>
          )}
        </DropdownMenuContent>
      </DropdownMenu>

      {/* Edit permissions dialog */}
      <Dialog open={permOpen} onOpenChange={setPermOpen}>
        <DialogContent className="sm:max-w-md">
          <DialogHeader>
            <DialogTitle>Permissions — {name}</DialogTitle>
            <DialogDescription>Choose what this admin can do.</DialogDescription>
          </DialogHeader>
          <div className="grid gap-2">
            {ADMIN_PERMISSIONS.map((p) => (
              <label
                key={p}
                className="flex cursor-pointer items-start gap-2.5 rounded-xl border border-black/8 bg-secondary/30 p-3 transition-colors hover:bg-secondary/60"
              >
                <Checkbox
                  checked={perms.includes(p)}
                  onCheckedChange={() => toggle(p)}
                  className="mt-0.5"
                />
                <div>
                  <div className="text-xs font-medium">{PERMISSION_LABELS[p].label}</div>
                  <div className="text-[11px] text-muted-foreground">
                    {PERMISSION_LABELS[p].description}
                  </div>
                </div>
              </label>
            ))}
          </div>
          <DialogFooter className="gap-2">
            <Button variant="outline" onClick={() => setPermOpen(false)} className="rounded-xl">
              Cancel
            </Button>
            <Button onClick={savePerms} disabled={pending} className="rounded-xl">
              {pending && <Loader2 className="size-4 animate-spin" />}
              Save
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* Remove confirmation */}
      <Dialog open={removeOpen} onOpenChange={setRemoveOpen}>
        <DialogContent className="sm:max-w-md">
          <DialogHeader>
            <DialogTitle>Remove {name}?</DialogTitle>
            <DialogDescription>
              They lose admin access immediately. This can&apos;t be undone — you&apos;d need to
              re-invite them.
            </DialogDescription>
          </DialogHeader>
          <DialogFooter className="gap-2">
            <Button variant="outline" onClick={() => setRemoveOpen(false)} className="rounded-xl">
              Cancel
            </Button>
            <Button
              variant="destructive"
              onClick={doRemove}
              disabled={pending}
              className="rounded-xl"
            >
              {pending && <Loader2 className="size-4 animate-spin" />}
              Remove admin
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </>
  );
}
