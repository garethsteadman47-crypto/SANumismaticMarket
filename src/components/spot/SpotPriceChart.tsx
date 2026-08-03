"use client";

import { useState } from "react";
import { Area, AreaChart, CartesianGrid, ResponsiveContainer, Tooltip, XAxis, YAxis } from "recharts";

import { Button } from "@/components/ui/button";
import type { SpotHistoryPoint } from "@/lib/api/spot-prices";

const AXIS_TICK_STYLE = { fontSize: 11 };

function formatAxisRands(cents: number): string {
  const rands = cents / 100;
  if (rands >= 1000) return `R${Math.round(rands / 1000)}k`;
  return `R${Math.round(rands)}`;
}

/**
 * Interactive 24h / 7d metal-price trend chart.
 *
 * Built with our existing Recharts setup (see `ValuationChart`) rather than
 * embedding the real TradingView widget's external `<script>` — this keeps
 * the app dependency-free of third-party script injection while still
 * being a genuinely interactive, range-toggleable chart over (mock) spot
 * price history.
 */
export function SpotPriceChart({
  history24h,
  history7d,
  metalLabel,
}: {
  history24h: SpotHistoryPoint[];
  history7d: SpotHistoryPoint[];
  metalLabel: string;
}) {
  const [range, setRange] = useState<"24h" | "7d">("24h");
  const points = range === "24h" ? history24h : history7d;
  const data = points.map((point) => ({ label: point.label, rands: point.pricePerOzCents / 100 }));

  return (
    <div className="flex flex-col gap-2">
      <div className="flex items-center justify-between">
        <span className="text-sm font-medium">{metalLabel} spot price ({range === "24h" ? "24 hours" : "7 days"})</span>
        <div className="flex gap-1">
          <Button
            type="button"
            size="xs"
            variant={range === "24h" ? "default" : "ghost"}
            onClick={() => setRange("24h")}
          >
            24h
          </Button>
          <Button type="button" size="xs" variant={range === "7d" ? "default" : "ghost"} onClick={() => setRange("7d")}>
            7d
          </Button>
        </div>
      </div>
      <div className="h-48 w-full">
        <ResponsiveContainer width="100%" height="100%">
          <AreaChart data={data} margin={{ top: 8, right: 8, bottom: 0, left: 0 }}>
            <defs>
              <linearGradient id="spot-price-fill" x1="0" y1="0" x2="0" y2="1">
                <stop offset="0%" stopColor="#d97706" stopOpacity={0.35} />
                <stop offset="100%" stopColor="#d97706" stopOpacity={0} />
              </linearGradient>
            </defs>
            <CartesianGrid strokeDasharray="3 3" vertical={false} className="stroke-border" />
            <XAxis
              dataKey="label"
              tick={AXIS_TICK_STYLE}
              interval={range === "24h" ? 3 : 0}
              tickLine={false}
              axisLine={false}
            />
            <YAxis
              tick={AXIS_TICK_STYLE}
              tickFormatter={(value: number) => formatAxisRands(value * 100)}
              width={44}
              tickLine={false}
              axisLine={false}
              domain={["auto", "auto"]}
            />
            <Tooltip formatter={(value) => [`R${Number(value).toLocaleString("en-ZA")}`, `${metalLabel} spot`]} />
            <Area type="monotone" dataKey="rands" stroke="#d97706" strokeWidth={2} fill="url(#spot-price-fill)" />
          </AreaChart>
        </ResponsiveContainer>
      </div>
    </div>
  );
}
