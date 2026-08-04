"use client";

import Link from "next/link";
import { Lock } from "lucide-react";
import {
  Area,
  CartesianGrid,
  ComposedChart,
  Line,
  ResponsiveContainer,
  Tooltip,
  XAxis,
  YAxis,
} from "recharts";

import type { ValuationPoint } from "@/lib/api/valuation";
import { Button } from "@/components/ui/button";

const AXIS_TICK_STYLE = { fontSize: 11 };

function formatAxisRands(cents: number): string {
  const rands = cents / 100;
  if (rands >= 1000) return `R${Math.round(rands / 1000)}k`;
  return `R${Math.round(rands)}`;
}

function formatQuarterLabel(isoDate: string): string {
  return new Date(isoDate).toLocaleDateString("en-ZA", { month: "short", year: "2-digit" });
}

/**
 * Historical pricing chart: Minted/mintage realized prices stay fully visible.
 * Hern's Handbook valuation series is visually gated (blurred + lock overlay)
 * until the collector links an SA Coin Club account (SSO placeholder).
 */
export function ValuationChart({
  points,
  hernsReferenceValueCents,
  mintage,
}: {
  points: ValuationPoint[];
  hernsReferenceValueCents?: number;
  /** Optional mintage figure shown as baseline context under the chart. */
  mintage?: number | null;
}) {
  const data = points.map((point, index) => {
    const progress = points.length <= 1 ? 1 : index / (points.length - 1);
    const herns =
      hernsReferenceValueCents != null
        ? Math.round((hernsReferenceValueCents / 100) * (0.82 + progress * 0.18))
        : undefined;
    return {
      label: formatQuarterLabel(point.date),
      realized: point.realizedPriceCents / 100,
      herns,
      mintageProxy: mintage != null ? mintage : undefined,
    };
  });

  const gated = hernsReferenceValueCents != null;

  return (
    <div className="flex flex-col gap-3">
      {mintage != null && (
        <p className="text-xs text-slate-500">
          Mintage{" "}
          <span className="font-medium tabular-nums text-slate-900 dark:text-slate-100">
            {mintage.toLocaleString("en-ZA")}
          </span>{" "}
          · historical realized baseline fully visible
        </p>
      )}

      <div className="relative h-64 w-full overflow-hidden">
        <ResponsiveContainer width="100%" height="100%">
          <ComposedChart data={data} margin={{ top: 8, right: 12, bottom: 0, left: 0 }}>
            <CartesianGrid strokeDasharray="3 3" vertical={false} className="stroke-border" />
            <XAxis dataKey="label" tick={AXIS_TICK_STYLE} interval={1} tickLine={false} axisLine={false} />
            <YAxis
              tick={AXIS_TICK_STYLE}
              tickFormatter={(value: number) => formatAxisRands(value * 100)}
              width={48}
              tickLine={false}
              axisLine={false}
            />
            <Tooltip
              formatter={(value, name) => {
                const label = name === "herns" ? "Hern's (locked)" : "Realized price";
                return [`R${Number(value).toLocaleString("en-ZA")}`, label];
              }}
            />
            {gated && (
              <Area
                type="monotone"
                dataKey="herns"
                stroke="#d97706"
                fill="#f59e0b"
                fillOpacity={0.25}
                strokeWidth={2}
                strokeDasharray="4 4"
                className="pointer-events-none"
                isAnimationActive={false}
              />
            )}
            <Line type="monotone" dataKey="realized" stroke="#0f172a" strokeWidth={2.5} dot={false} name="realized" />
          </ComposedChart>
        </ResponsiveContainer>

        {gated && (
          <>
            {/* Blur / mask the Hern area + line while leaving the realized series readable */}
            <div
              aria-hidden
              className="pointer-events-none absolute inset-0 backdrop-blur-[3px] [mask-image:linear-gradient(to_bottom,black_0%,black_42%,transparent_72%)] [-webkit-mask-image:linear-gradient(to_bottom,black_0%,black_42%,transparent_72%)]"
            />
            <div className="pointer-events-none absolute inset-0 flex items-center justify-center">
              <div className="pointer-events-auto flex max-w-[240px] flex-col items-center gap-2 rounded-lg border border-slate-200 bg-white/95 p-4 text-center shadow-sm dark:border-slate-700 dark:bg-slate-950/95">
                <div className="flex size-9 items-center justify-center rounded-full bg-slate-950 text-amber-400">
                  <Lock className="size-4" aria-hidden />
                </div>
                <p className="text-xs font-medium text-slate-900 dark:text-slate-100">
                  Hern&apos;s Catalog valuations are locked.
                </p>
                <Button
                  type="button"
                  size="sm"
                  className="bg-slate-950 text-white hover:bg-slate-800"
                  nativeButton={false}
                  render={<Link href="/login" />}
                >
                  Link SA Coin Club Account
                </Button>
              </div>
            </div>
          </>
        )}
      </div>
    </div>
  );
}

/** Alias used by product brief (`Chart.tsx`). */
export { ValuationChart as Chart };
