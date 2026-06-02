"use client";

import {
  ResponsiveContainer,
  AreaChart,
  Area,
  BarChart,
  Bar,
  XAxis,
  YAxis,
  Tooltip,
  CartesianGrid,
} from "recharts";

interface Point {
  date: string;
  revenueCents: number;
  enrollments: number;
}

const BLUE = "#1AADE0";
const GREEN = "#8CC63F";

function fmtDay(d: string) {
  const dt = new Date(d + "T00:00:00Z");
  return dt.toLocaleDateString(undefined, { month: "short", day: "numeric" });
}

export function AnalyticsCharts({
  daily,
  currency,
}: {
  daily: Point[];
  currency: string;
}) {
  const money = (cents: number) =>
    new Intl.NumberFormat(undefined, {
      style: "currency",
      currency,
      maximumFractionDigits: 0,
    }).format(cents / 100);

  // ~6 evenly spaced x-axis ticks so 90 points stay readable.
  const step = Math.max(1, Math.floor(daily.length / 6));
  const ticks = daily.filter((_, i) => i % step === 0).map((d) => d.date);

  return (
    <div className="grid gap-6 lg:grid-cols-2">
      <div className="rounded-2xl border bg-card p-5 shadow-card" style={{ borderColor: "var(--ed-line)" }}>
        <div className="mb-4 text-sm font-semibold">Revenue · last 90 days</div>
        <ResponsiveContainer width="100%" height={240}>
          <AreaChart data={daily} margin={{ top: 4, right: 8, left: 0, bottom: 0 }}>
            <defs>
              <linearGradient id="revFill" x1="0" y1="0" x2="0" y2="1">
                <stop offset="0%" stopColor={BLUE} stopOpacity={0.35} />
                <stop offset="100%" stopColor={BLUE} stopOpacity={0} />
              </linearGradient>
            </defs>
            <CartesianGrid strokeDasharray="3 3" stroke="rgba(0,0,0,0.06)" vertical={false} />
            <XAxis dataKey="date" ticks={ticks} tickFormatter={fmtDay} tick={{ fontSize: 11 }} stroke="#9aa7b4" />
            <YAxis
              tickFormatter={(v) => money(Number(v)).replace(/\.00$/, "")}
              width={70}
              tick={{ fontSize: 11 }}
              stroke="#9aa7b4"
            />
            <Tooltip
              formatter={(v) => [money(Number(v)), "Revenue"] as [string, string]}
              labelFormatter={(d) => fmtDay(String(d))}
              contentStyle={{ borderRadius: 12, border: "1px solid var(--ed-line)", fontSize: 12 }}
            />
            <Area type="monotone" dataKey="revenueCents" stroke={BLUE} strokeWidth={2} fill="url(#revFill)" />
          </AreaChart>
        </ResponsiveContainer>
      </div>

      <div className="rounded-2xl border bg-card p-5 shadow-card" style={{ borderColor: "var(--ed-line)" }}>
        <div className="mb-4 text-sm font-semibold">Enrollments · last 90 days</div>
        <ResponsiveContainer width="100%" height={240}>
          <BarChart data={daily} margin={{ top: 4, right: 8, left: 0, bottom: 0 }}>
            <CartesianGrid strokeDasharray="3 3" stroke="rgba(0,0,0,0.06)" vertical={false} />
            <XAxis dataKey="date" ticks={ticks} tickFormatter={fmtDay} tick={{ fontSize: 11 }} stroke="#9aa7b4" />
            <YAxis allowDecimals={false} width={32} tick={{ fontSize: 11 }} stroke="#9aa7b4" />
            <Tooltip
              formatter={(v) => [Number(v), "Enrollments"] as [number, string]}
              labelFormatter={(d) => fmtDay(String(d))}
              contentStyle={{ borderRadius: 12, border: "1px solid var(--ed-line)", fontSize: 12 }}
            />
            <Bar dataKey="enrollments" fill={GREEN} radius={[3, 3, 0, 0]} />
          </BarChart>
        </ResponsiveContainer>
      </div>
    </div>
  );
}
