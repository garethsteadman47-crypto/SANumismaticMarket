"use client";

import Link from "next/link";
import { Lock } from "lucide-react";
import { CartesianGrid, Line, LineChart, ResponsiveContainer, Tooltip, XAxis, YAxis } from "recharts";

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
 * Historical pricing chart. When Hern access is locked we never put real Hern
 * values into the chart series (flat zero only) and cover the plot with an
 * opaque lock panel — CSS blur is not used for security.
 */
export function ValuationChart({
  points,
  hernsReferenceValueCents,
  mintage,
  hernsUnlocked = false,
}: {
  points: ValuationPoint[];
  hernsReferenceValueCents?: number;
  mintage?: number | null;
  /** True when the viewer has a linked SA Coin Club account. */
  hernsUnlocked?: boolean;
}) {
  const locked = !hernsUnlocked && hernsReferenceValueCents != null;

  const data = points.map((point, index) => {
    const progress = points.length <= 1 ? 1 : index / (points.length - 1);
    const hernsUnlockedValue =
      hernsUnlocked && hernsReferenceValueCents != null
        ? Math.round((hernsReferenceValueCents / 100) * (0.82 + progress * 0.18))
        : 0;
    return {
      label: formatQuarterLabel(point.date),
      realized: point.realizedPriceCents / 100,
      // Locked viewers only ever receive a flat zero — never the catalog series.
      herns: locked ? 0 : hernsUnlockedValue,
    };
  });

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

      <div className="relative h-64 w-full overflow-hidden rounded-lg">
        <ResponsiveContainer width="100%" height="100%">
          <LineChart data={data} margin={{ top: 8, right: 12, bottom: 0, left: 0 }}>
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
                if (name === "herns") {
                  return locked ? ["Locked", "Hern's"] : [`R${Number(value).toLocaleString("en-ZA")}`, "Hern's"];
                }
                return [`R${Number(value).toLocaleString("en-ZA")}`, "Realized price"];
              }}
            />
            <Line
              type="monotone"
              dataKey="herns"
              stroke={locked ? "#334155" : "#d97706"}
              strokeWidth={locked ? 1 : 2}
              strokeDasharray={locked ? undefined : "4 4"}
              dot={false}
              name="herns"
              isAnimationActive={false}
            />
            <Line type="monotone" dataKey="realized" stroke="#0f172a" strokeWidth={2.5} dot={false} name="realized" />
          </LineChart>
        </ResponsiveContainer>

        {locked && (
          <div className="absolute inset-0 flex items-center justify-center bg-slate-900/95 p-4">
            <div className="flex max-w-[240px] flex-col items-center gap-2 text-center">
              <div className="flex size-10 items-center justify-center rounded-full bg-slate-800 text-amber-400">
                <Lock className="size-4" aria-hidden />
              </div>
              <p className="text-sm font-medium text-white">Hern&apos;s Catalog valuations are locked.</p>
              <Button
                type="button"
                size="sm"
                className="bg-amber-500 text-slate-950 hover:bg-amber-400"
                nativeButton={false}
                render={<Link href="/login" />}
              >
                Link SA Coin Club Account
              </Button>
            </div>
          </div>
        )}
      </div>
    </div>
  );
}

/** Alias used by product brief (`Chart.tsx`). */
export { ValuationChart as Chart };
