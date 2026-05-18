"use client";

import { useState } from "react";
import { Download, Copy, Check, ExternalLink, Share2 } from "lucide-react";

export function CertActions({
  verifyUrl,
  certId,
  courseTitle,
  instituteName,
}: {
  verifyUrl: string;
  certId: string;
  courseTitle: string;
  instituteName: string;
}) {
  const [copied, setCopied] = useState(false);

  const linkedIn = `https://www.linkedin.com/profile/add?startTask=CERTIFICATION_NAME&name=${encodeURIComponent(
    courseTitle,
  )}&organizationName=${encodeURIComponent(instituteName)}&certUrl=${encodeURIComponent(
    verifyUrl,
  )}&certId=${encodeURIComponent(certId)}`;
  const x = `https://twitter.com/intent/tweet?text=${encodeURIComponent(
    `I earned a certificate in ${courseTitle} on eurodigital.coach! `,
  )}&url=${encodeURIComponent(verifyUrl)}`;
  const wa = `https://wa.me/?text=${encodeURIComponent(
    `I earned a certificate in ${courseTitle}: ${verifyUrl}`,
  )}`;
  const mail = `mailto:?subject=${encodeURIComponent(
    `Certificate — ${courseTitle}`,
  )}&body=${encodeURIComponent(`Verify it here: ${verifyUrl}`)}`;

  async function copy() {
    try {
      await navigator.clipboard.writeText(verifyUrl);
      setCopied(true);
      setTimeout(() => setCopied(false), 1800);
    } catch {
      /* selection fallback */
    }
  }

  return (
    <div className="no-print">
      <div className="flex flex-wrap items-center justify-center gap-3">
        <button
          type="button"
          onClick={() => window.print()}
          className="inline-flex items-center gap-2 rounded-xl px-5 py-3 text-sm font-bold text-white"
          style={{ background: "var(--ed-gradient)" }}
        >
          <Download className="size-4" /> Download PDF
        </button>
        <a
          href={linkedIn}
          target="_blank"
          rel="noopener noreferrer"
          className="inline-flex items-center gap-2 rounded-xl border px-5 py-3 text-sm font-bold"
          style={{ borderColor: "var(--ed-line)", color: "var(--ed-ink)" }}
        >
          <ExternalLink className="size-4" style={{ color: "var(--ed-blue)" }} /> Add to LinkedIn
        </a>
        <button
          type="button"
          onClick={copy}
          className="inline-flex items-center gap-2 rounded-xl border px-5 py-3 text-sm font-bold"
          style={{ borderColor: "var(--ed-line)", color: "var(--ed-ink)" }}
        >
          {copied ? (
            <Check className="size-4" style={{ color: "var(--ed-green-dark)" }} />
          ) : (
            <Copy className="size-4" />
          )}
          {copied ? "Copied" : "Copy verify link"}
        </button>
      </div>

      <div className="mt-4 flex items-center justify-center gap-2 text-xs" style={{ color: "var(--ed-mute)" }}>
        <Share2 className="size-3.5" /> Share:
        <a href={x} target="_blank" rel="noopener noreferrer" className="font-semibold hover:underline">X</a>
        <a href={wa} target="_blank" rel="noopener noreferrer" className="font-semibold hover:underline">WhatsApp</a>
        <a href={mail} className="font-semibold hover:underline">Email</a>
      </div>
    </div>
  );
}
