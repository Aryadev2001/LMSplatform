"use client";

import { useState, useTransition } from "react";
import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { z } from "zod";
import { toast } from "sonner";
import { Plus, Loader2 } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Checkbox } from "@/components/ui/checkbox";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
} from "@/components/ui/dialog";
import { ADMIN_PERMISSIONS, PERMISSION_LABELS, type AdminPermission } from "@/lib/permissions";
import { addAdmin } from "./actions";

const Schema = z.object({
  email: z.email("Enter a valid email"),
  fullName: z.string().max(200).optional().or(z.literal("")),
});
type Values = z.infer<typeof Schema>;

export function AddAdminDialog() {
  const [open, setOpen] = useState(false);
  const [pending, startTransition] = useTransition();
  const [perms, setPerms] = useState<AdminPermission[]>([
    "manage_students",
    "view_diagnostics",
  ]);
  const { register, handleSubmit, formState: { errors }, reset } = useForm<Values>({
    resolver: zodResolver(Schema),
    defaultValues: { email: "", fullName: "" },
  });

  function toggle(p: AdminPermission) {
    setPerms((cur) => (cur.includes(p) ? cur.filter((x) => x !== p) : [...cur, p]));
  }

  function onSubmit(values: Values) {
    startTransition(async () => {
      const r = await addAdmin({ ...values, permissions: perms });
      if (r.success) {
        toast.success(`Admin invited: ${r.email}`);
        reset();
        setPerms(["manage_students", "view_diagnostics"]);
        setOpen(false);
      } else {
        toast.error(r.error);
      }
    });
  }

  return (
    <Dialog open={open} onOpenChange={setOpen}>
      <DialogTrigger render={<Button className="rounded-xl" />}>
        <Plus className="size-4" /> Add admin
      </DialogTrigger>
      <DialogContent className="sm:max-w-lg">
        <DialogHeader>
          <DialogTitle>Add an admin</DialogTitle>
          <DialogDescription>
            They get a magic-link invitation. Choose what they can do.
          </DialogDescription>
        </DialogHeader>
        <form onSubmit={handleSubmit(onSubmit)} className="space-y-4">
          <div className="grid grid-cols-2 gap-3">
            <div className="space-y-1.5">
              <Label className="text-xs font-medium">Email</Label>
              <Input
                {...register("email")}
                type="email"
                placeholder="admin@example.com"
                className="h-10 rounded-xl border-black/10"
              />
              {errors.email && (
                <p className="text-xs text-destructive">{errors.email.message}</p>
              )}
            </div>
            <div className="space-y-1.5">
              <Label className="text-xs font-medium">
                Name <span className="text-muted-foreground">(optional)</span>
              </Label>
              <Input
                {...register("fullName")}
                placeholder="Jane Doe"
                className="h-10 rounded-xl border-black/10"
              />
            </div>
          </div>

          <div className="space-y-2">
            <Label className="text-xs font-medium">Permissions</Label>
            <div className="grid gap-2 sm:grid-cols-2">
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
          </div>

          <DialogFooter className="gap-2">
            <Button
              type="button"
              variant="outline"
              onClick={() => setOpen(false)}
              className="rounded-xl"
            >
              Cancel
            </Button>
            <Button type="submit" disabled={pending} className="rounded-xl">
              {pending && <Loader2 className="size-4 animate-spin" />}
              Send invitation
            </Button>
          </DialogFooter>
        </form>
      </DialogContent>
    </Dialog>
  );
}
