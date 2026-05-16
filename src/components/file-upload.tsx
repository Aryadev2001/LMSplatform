"use client";

import { useRef, useState } from "react";
import { toast } from "sonner";
import { UploadCloud, Loader2, CheckCircle2, X } from "lucide-react";
import { Button } from "@/components/ui/button";

interface FileUploadProps {
  accept: string;
  label: string;
  value?: string | null;
  onUploaded: (url: string) => void;
  onClear?: () => void;
}

export function FileUpload({ accept, label, value, onUploaded, onClear }: FileUploadProps) {
  const inputRef = useRef<HTMLInputElement>(null);
  const [busy, setBusy] = useState(false);
  const [pct, setPct] = useState(0);

  function handleFile(file: File) {
    setBusy(true);
    setPct(0);

    const xhr = new XMLHttpRequest();
    xhr.open("POST", "/api/blob/upload");
    xhr.setRequestHeader("content-type", file.type || "application/octet-stream");
    xhr.setRequestHeader("x-filename", file.name);

    xhr.upload.onprogress = (e) => {
      if (e.lengthComputable) setPct(Math.round((e.loaded / e.total) * 100));
    };

    xhr.onload = () => {
      setBusy(false);
      try {
        const res = JSON.parse(xhr.responseText);
        if (xhr.status >= 200 && xhr.status < 300 && res.url) {
          onUploaded(res.url);
          toast.success(`${label} uploaded`);
        } else {
          toast.error(res.error ?? `Upload failed (${xhr.status})`);
        }
      } catch {
        toast.error(`Upload failed (${xhr.status})`);
      }
    };

    xhr.onerror = () => {
      setBusy(false);
      toast.error("Upload failed — network error");
    };

    xhr.send(file);
  }

  if (value) {
    return (
      <div className="flex items-center justify-between rounded-xl border border-black/10 bg-secondary/40 px-3 py-2.5 text-xs">
        <span className="flex min-w-0 items-center gap-2">
          <CheckCircle2 className="size-4 shrink-0 text-[#8CC63F]" />
          <a
            href={value}
            target="_blank"
            rel="noopener noreferrer"
            className="truncate font-medium text-foreground underline-offset-2 hover:underline"
          >
            {label} uploaded
          </a>
        </span>
        {onClear && (
          <button
            type="button"
            onClick={onClear}
            aria-label="Remove"
            className="text-muted-foreground hover:text-foreground"
          >
            <X className="size-3.5" />
          </button>
        )}
      </div>
    );
  }

  return (
    <div>
      <input
        ref={inputRef}
        type="file"
        accept={accept}
        className="hidden"
        onChange={(e) => {
          const f = e.target.files?.[0];
          if (f) handleFile(f);
          e.target.value = "";
        }}
      />
      <Button
        type="button"
        variant="outline"
        disabled={busy}
        onClick={() => inputRef.current?.click()}
        className="h-10 w-full rounded-xl border-dashed text-xs"
      >
        {busy ? (
          <>
            <Loader2 className="size-4 animate-spin" />
            Uploading… {pct}%
          </>
        ) : (
          <>
            <UploadCloud className="size-4" />
            Upload {label}
          </>
        )}
      </Button>
    </div>
  );
}
