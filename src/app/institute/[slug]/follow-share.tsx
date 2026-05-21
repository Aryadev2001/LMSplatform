"use client";

import { useState } from "react";
import { Heart, Share2, Check } from "lucide-react";
import { toast } from "sonner";

export function FollowShareInner({
  tenantName,
  tenantSlug: _tenantSlug,
}: {
  tenantName: string;
  tenantSlug: string;
}) {
  const [copied, setCopied] = useState(false);
  const [following, setFollowing] = useState(false);

  async function onShare() {
    try {
      await navigator.clipboard.writeText(window.location.href);
      setCopied(true);
      setTimeout(() => setCopied(false), 1800);
    } catch {
      /* clipboard blocked */
    }
  }

  function onFollow() {
    setFollowing((f) => !f);
    toast.success(
      following
        ? `Unfollowed ${tenantName}`
        : `Following ${tenantName} — sign in to save across devices`,
    );
  }

  return (
    <div className="flex flex-col gap-2">
      <button
        type="button"
        onClick={onFollow}
        className="inline-flex h-10 items-center justify-center gap-2 rounded-xl border text-sm font-bold transition-colors"
        style={{
          borderColor: "rgba(255,255,255,0.18)",
          background: following ? "rgba(255,255,255,0.10)" : "transparent",
          color: "white",
        }}
      >
        <Heart
          className={`size-4 ${following ? "fill-current" : ""}`}
          style={{ color: following ? "var(--ed-warn)" : "white" }}
        />
        {following ? "Following" : "Follow Institute"}
      </button>
      <button
        type="button"
        onClick={onShare}
        className="inline-flex h-10 items-center justify-center gap-2 rounded-xl border text-sm font-bold transition-colors"
        style={{
          borderColor: "rgba(255,255,255,0.18)",
          color: "white",
        }}
      >
        {copied ? <Check className="size-4 text-emerald-400" /> : <Share2 className="size-4" />}
        {copied ? "Link copied" : "Share Profile"}
      </button>
    </div>
  );
}
