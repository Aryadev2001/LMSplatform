"use client";

import { useState, useTransition } from "react";
import { useRouter } from "next/navigation";
import { toast } from "sonner";
import { Loader2, UserPlus } from "lucide-react";
import { Button } from "@/components/ui/button";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
} from "@/components/ui/dialog";
import { Label } from "@/components/ui/label";
import { Input } from "@/components/ui/input";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { inviteSuperMember } from "../actions";

type SuperRole = "SUPER_OWNER" | "SUPER_STAFF" | "SUPER_SUPPORT";

export function InviteMemberDialog() {
  const router = useRouter();
  const [open, setOpen] = useState(false);
  const [pending, startTransition] = useTransition();
  const [email, setEmail] = useState("");
  const [fullName, setFullName] = useState("");
  const [superRole, setSuperRole] = useState<SuperRole>("SUPER_STAFF");

  function onSubmit() {
    startTransition(async () => {
      const r = await inviteSuperMember({ email, fullName, superRole });
      if (r.success) {
        toast.success("Invitation sent");
        setOpen(false);
        setEmail("");
        setFullName("");
        setSuperRole("SUPER_STAFF");
        router.refresh();
      } else {
        toast.error(r.error);
      }
    });
  }

  return (
    <Dialog open={open} onOpenChange={setOpen}>
      <DialogTrigger render={<Button className="rounded-xl" />}>
        <UserPlus className="size-4" />
        Invite member
      </DialogTrigger>
      <DialogContent className="sm:max-w-md">
        <DialogHeader>
          <DialogTitle>Invite super-admin</DialogTitle>
          <DialogDescription>
            They sign in via magic link. Owner = full, Staff = ops (no team/financials),
            Support = read-only + audited impersonate.
          </DialogDescription>
        </DialogHeader>

        <div className="space-y-4">
          <div className="space-y-1.5">
            <Label className="text-xs font-medium">Email</Label>
            <Input
              type="email"
              value={email}
              onChange={(e) => setEmail(e.target.value)}
              placeholder="ops@edt.ae"
              className="h-10 rounded-xl"
            />
          </div>
          <div className="space-y-1.5">
            <Label className="text-xs font-medium">Full name (optional)</Label>
            <Input
              value={fullName}
              onChange={(e) => setFullName(e.target.value)}
              className="h-10 rounded-xl"
            />
          </div>
          <div className="space-y-1.5">
            <Label className="text-xs font-medium">Role</Label>
            <Select
              value={superRole}
              onValueChange={(v) => v && setSuperRole(v as SuperRole)}
            >
              <SelectTrigger className="h-10 rounded-xl">
                <SelectValue />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="SUPER_OWNER">Owner</SelectItem>
                <SelectItem value="SUPER_STAFF">Staff</SelectItem>
                <SelectItem value="SUPER_SUPPORT">Support</SelectItem>
              </SelectContent>
            </Select>
          </div>
        </div>

        <DialogFooter className="gap-2">
          <Button variant="outline" onClick={() => setOpen(false)} className="rounded-xl">
            Cancel
          </Button>
          <Button
            onClick={onSubmit}
            disabled={pending || !email.includes("@")}
            className="rounded-xl"
          >
            {pending && <Loader2 className="size-4 animate-spin" />}
            Send invite
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
