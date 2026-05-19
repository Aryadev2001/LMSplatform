"use client";

import { Printer } from "lucide-react";

export function PrintButton() {
  return (
    <button
      type="button"
      onClick={() => window.print()}
      className="inline-flex items-center gap-2 rounded-xl px-4 py-2 text-sm font-bold text-white"
      style={{ background: "var(--ed-gradient)" }}
    >
      <Printer className="size-4" />
      Print / Save as PDF
    </button>
  );
}
