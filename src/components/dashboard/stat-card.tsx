"use client";

import { motion } from "motion/react";
import { TrendingUp, TrendingDown, Minus } from "lucide-react";
import { cn } from "@/lib/utils";

interface StatCardProps {
  label: string;
  value: string;
  delta?: { value: string; direction: "up" | "down" | "flat" };
  sparkline?: number[];
  delay?: number;
}

export function StatCard({ label, value, delta, sparkline, delay = 0 }: StatCardProps) {
  return (
    <motion.div
      initial={{ opacity: 0, y: 16 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ duration: 0.5, delay, ease: [0.16, 1, 0.3, 1] }}
      className="group relative overflow-hidden rounded-2xl bg-card p-5 shadow-card transition-shadow hover:shadow-soft"
    >
      <div className="flex items-center justify-between">
        <span className="text-[10px] uppercase tracking-widest text-muted-foreground">{label}</span>
        {delta && <DeltaPill {...delta} />}
      </div>
      <div className="mt-3 text-3xl font-semibold tracking-tight">{value}</div>
      {sparkline && <Sparkline data={sparkline} />}
    </motion.div>
  );
}

function DeltaPill({ value, direction }: { value: string; direction: "up" | "down" | "flat" }) {
  const Icon = direction === "up" ? TrendingUp : direction === "down" ? TrendingDown : Minus;
  return (
    <span
      className={cn(
        "inline-flex items-center gap-1 rounded-full px-2 py-0.5 text-[11px] font-medium",
        direction === "up" && "bg-emerald-50 text-emerald-700 ring-1 ring-emerald-600/20",
        direction === "down" && "bg-rose-50 text-rose-700 ring-1 ring-rose-600/20",
        direction === "flat" && "bg-secondary text-muted-foreground ring-1 ring-black/5",
      )}
    >
      <Icon className="size-3" />
      {value}
    </span>
  );
}

function Sparkline({ data }: { data: number[] }) {
  const max = Math.max(...data);
  const min = Math.min(...data);
  const range = max - min || 1;
  const w = 200;
  const h = 36;
  const stepX = w / (data.length - 1);
  const points = data
    .map((d, i) => `${i * stepX},${h - ((d - min) / range) * h}`)
    .join(" ");
  return (
    <svg viewBox={`0 0 ${w} ${h}`} className="mt-4 h-9 w-full">
      <defs>
        <linearGradient id="spark-fill-light" x1="0" y1="0" x2="0" y2="1">
          <stop offset="0" stopColor="oklch(0.18 0.015 260)" stopOpacity="0.15" />
          <stop offset="1" stopColor="oklch(0.18 0.015 260)" stopOpacity="0" />
        </linearGradient>
      </defs>
      <polygon points={`0,${h} ${points} ${w},${h}`} fill="url(#spark-fill-light)" />
      <polyline
        points={points}
        fill="none"
        stroke="oklch(0.18 0.015 260)"
        strokeWidth="1.5"
        strokeLinecap="round"
        strokeLinejoin="round"
      />
    </svg>
  );
}
