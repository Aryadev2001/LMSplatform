"use client";

import { useState, useTransition } from "react";
import { useRouter } from "next/navigation";
import { toast } from "sonner";
import { Loader2 } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { FileUpload } from "@/components/file-upload";
import { updateMyTenantBranding } from "./actions";

interface Props {
  initial: {
    logoUrl: string | null;
    brandPrimaryColor: string;
    brandSecondaryColor: string;
    heroTagline: string;
    introVideoUrl: string | null;
  };
}

export function TenantBrandingForm({ initial }: Props) {
  const router = useRouter();
  const [pending, startTransition] = useTransition();
  const [logoUrl, setLogoUrl] = useState<string | null>(initial.logoUrl);
  const [primary, setPrimary] = useState(initial.brandPrimaryColor);
  const [secondary, setSecondary] = useState(initial.brandSecondaryColor);
  const [tagline, setTagline] = useState(initial.heroTagline);
  const [introVideoUrl, setIntroVideoUrl] = useState(
    initial.introVideoUrl ?? "",
  );

  function onSave() {
    startTransition(async () => {
      const r = await updateMyTenantBranding({
        logoUrl: logoUrl ?? "",
        brandPrimaryColor: primary,
        brandSecondaryColor: secondary,
        heroTagline: tagline,
        introVideoUrl: introVideoUrl.trim(),
      });
      if (r.success) {
        toast.success("Branding saved");
        router.refresh();
      } else {
        toast.error(r.error);
      }
    });
  }

  return (
    <div className="space-y-6">
      <div className="space-y-2">
        <Label className="text-xs font-medium">Logo</Label>
        <div className="flex items-center gap-4">
          <div className="flex size-14 items-center justify-center overflow-hidden rounded-xl border border-black/10 bg-secondary/40">
            {logoUrl ? (
              // eslint-disable-next-line @next/next/no-img-element
              <img src={logoUrl} alt="Logo preview" className="size-full object-contain" />
            ) : (
              <span className="text-[10px] text-muted-foreground">No logo</span>
            )}
          </div>
          <div className="flex-1">
            <FileUpload
              accept="image/png,image/jpeg,image/svg+xml,image/webp"
              label="logo"
              value={logoUrl}
              onUploaded={(url) => setLogoUrl(url)}
              onClear={() => setLogoUrl(null)}
            />
          </div>
        </div>
      </div>

      <div className="grid gap-4 sm:grid-cols-2">
        <div className="space-y-1.5">
          <Label className="text-xs font-medium">Primary color</Label>
          <div className="flex items-center gap-2">
            <input
              type="color"
              value={primary}
              onChange={(e) => setPrimary(e.target.value)}
              className="h-10 w-12 cursor-pointer rounded-lg border border-black/10 bg-transparent"
              aria-label="Primary color"
            />
            <Input
              value={primary}
              onChange={(e) => setPrimary(e.target.value)}
              className="h-10 rounded-xl font-mono"
            />
          </div>
        </div>
        <div className="space-y-1.5">
          <Label className="text-xs font-medium">Secondary color</Label>
          <div className="flex items-center gap-2">
            <input
              type="color"
              value={secondary}
              onChange={(e) => setSecondary(e.target.value)}
              className="h-10 w-12 cursor-pointer rounded-lg border border-black/10 bg-transparent"
              aria-label="Secondary color"
            />
            <Input
              value={secondary}
              onChange={(e) => setSecondary(e.target.value)}
              className="h-10 rounded-xl font-mono"
            />
          </div>
        </div>
      </div>

      <div
        className="rounded-xl p-4 text-sm font-medium text-white"
        style={{
          background: `linear-gradient(135deg, ${primary} 0%, ${secondary} 100%)`,
        }}
      >
        Live preview — this is your brand gradient.
      </div>

      <div className="space-y-1.5">
        <Label className="text-xs font-medium">Hero tagline</Label>
        <Input
          value={tagline}
          onChange={(e) => setTagline(e.target.value)}
          placeholder="Clarity for ambitious founders"
          className="h-10 rounded-xl"
        />
      </div>

      <div className="space-y-1.5">
        <Label className="text-xs font-medium">Institute intro video URL</Label>
        <Input
          type="url"
          value={introVideoUrl}
          onChange={(e) => setIntroVideoUrl(e.target.value)}
          placeholder="https://… (YouTube / Vimeo / direct mp4)"
          className="h-10 rounded-xl"
        />
        <p className="text-[11px] text-muted-foreground">
          Shown on the About-the-Institute tab of your public storefront.
          Leave empty for the placeholder.
        </p>
      </div>

      <div className="flex justify-end">
        <Button onClick={onSave} disabled={pending} className="rounded-xl">
          {pending && <Loader2 className="size-4 animate-spin" />}
          Save branding
        </Button>
      </div>
    </div>
  );
}
