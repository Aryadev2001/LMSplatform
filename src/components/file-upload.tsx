"use client";

import { useRef, useState } from "react";
import { toast } from "sonner";
import {
  UploadCloud,
  Loader2,
  CheckCircle2,
  X,
  AlertCircle,
} from "lucide-react";
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
  const [err, setErr] = useState<string | null>(null);

  function handleFile(file: File) {
    setBusy(true);
    setPct(0);
    setErr(null);

    const xhr = new XMLHttpRequest();
    xhr.open("POST", "/api/blob/upload");
    xhr.setRequestHeader("content-type", file.type || "application/octet-stream");
    xhr.setRequestHeader("x-filename", file.name);

    xhr.upload.onprogress = (e) => {
      if (e.lengthComputable) setPct(Math.round((e.loaded / e.total) * 100));
    };

    xhr.onload = () => {
      setBusy(false);
      let parsedError: string | null = null;
      try {
        const res = JSON.parse(xhr.responseText);
        if (xhr.status >= 200 && xhr.status < 300 && res.url) {
          onUploaded(res.url);
          toast.success(`${label} uploaded`);
          return;
        }
        parsedError = res.error ?? `Upload failed (HTTP ${xhr.status})`;
      } catch {
        // Non-JSON body. Show a slice of raw response so the user can tell
        // whether it's an auth redirect, a 502 from the platform, etc.
        const snippet = (xhr.responseText || "").slice(0, 200).trim();
        parsedError = `Upload failed (HTTP ${xhr.status})${
          snippet ? ` — ${snippet}` : ""
        }`;
      }
      setErr(parsedError);
      toast.error(parsedError);
    };

    xhr.onerror = () => {
      setBusy(false);
      const msg =
        "Upload failed — network error. Check your connection or try a smaller file.";
      setErr(msg);
      toast.error(msg);
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
      {err && (
        <div
          role="alert"
          className="mt-2 flex items-start gap-2 rounded-lg border border-red-200 bg-red-50 px-3 py-2 text-[11px] leading-snug text-red-700"
        >
          <AlertCircle className="mt-0.5 size-3.5 shrink-0" />
          <span className="break-words">{err}</span>
        </div>
      )}
    </div>
  );
}
