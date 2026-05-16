"use client";

import { useState, useTransition } from "react";
import { useRouter } from "next/navigation";
import { toast } from "sonner";
import { Loader2, Plus } from "lucide-react";
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
import { createTenant } from "../actions";

function slugify(s: string) {
  return s
    .toLowerCase()
    .trim()
    .replace(/[^a-z0-9-]+/g, "-")
    .replace(/^-+|-+$/g, "")
    .slice(0, 63);
}

export function CreateTenantDialog() {
  const router = useRouter();
  const [open, setOpen] = useState(false);
  const [pending, startTransition] = useTransition();
  const [name, setName] = useState("");
  const [slug, setSlug] = useState("");
  const [slugTouched, setSlugTouched] = useState(false);
  const [tagline, setTagline] = useState("");

  function onSubmit() {
    startTransition(async () => {
      const r = await createTenant({
        name,
        slug: slug || slugify(name),
        heroTagline: tagline,
      });
      if (r.success) {
        toast.success("Tenant created");
        setOpen(false);
        setName("");
        setSlug("");
        setSlugTouched(false);
        setTagline("");
        router.refresh();
      } else {
        toast.error(r.error);
      }
    });
  }

  const effectiveSlug = slugTouched ? slug : slugify(name);

  return (
    <Dialog open={open} onOpenChange={setOpen}>
      <DialogTrigger render={<Button className="rounded-xl" />}>
        <Plus className="size-4" />
        New tenant
      </DialogTrigger>
      <DialogContent className="sm:max-w-md">
        <DialogHeader>
          <DialogTitle>Create tenant</DialogTitle>
          <DialogDescription>
            A new institute. It will be reachable at{" "}
            <span className="font-mono">{effectiveSlug || "slug"}</span>.&lt;root-domain&gt;.
          </DialogDescription>
        </DialogHeader>

        <div className="space-y-4">
          <div className="space-y-1.5">
            <Label className="text-xs font-medium">Institute name</Label>
            <Input
              value={name}
              onChange={(e) => setName(e.target.value)}
              placeholder="Acme Coaching"
              className="h-10 rounded-xl"
            />
          </div>
          <div className="space-y-1.5">
            <Label className="text-xs font-medium">Subdomain slug</Label>
            <Input
              value={effectiveSlug}
              onChange={(e) => {
                setSlugTouched(true);
                setSlug(slugify(e.target.value));
              }}
              placeholder="acme"
              className="h-10 rounded-xl font-mono"
            />
          </div>
          <div className="space-y-1.5">
            <Label className="text-xs font-medium">Hero tagline (optional)</Label>
            <Input
              value={tagline}
              onChange={(e) => setTagline(e.target.value)}
              placeholder="Clarity for ambitious founders"
              className="h-10 rounded-xl"
            />
          </div>
        </div>

        <DialogFooter className="gap-2">
          <Button variant="outline" onClick={() => setOpen(false)} className="rounded-xl">
            Cancel
          </Button>
          <Button
            onClick={onSubmit}
            disabled={pending || name.trim().length < 2}
            className="rounded-xl"
          >
            {pending && <Loader2 className="size-4 animate-spin" />}
            Create
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
