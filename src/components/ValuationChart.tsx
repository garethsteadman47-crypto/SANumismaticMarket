"use client";

import { CartesianGrid, Line, LineChart, ReferenceLine, ResponsiveContainer, Tooltip, XAxis, YAxis } from "recharts";

import type { ValuationPoint } from "@/lib/api/valuation";

const AXIS_TICK_STYLE = { fontSize: 11 };

function formatAxisRands(cents: number): string {
  const rands = cents / 100;
  if (rands >= 1000) return `R${Math.round(rands / 1000)}k`;
  return `R${Math.round(rands)}`;
}

function formatQuarterLabel(isoDate: string): string {
  return new Date(isoDate).toLocaleDateString("en-ZA", { month: "short", year: "2-digit" });
}

export function ValuationChart({
  points,
  hernsReferenceValueCents,
}: {
  points: ValuationPoint[];
  hernsReferenceValueCents?: number;
}) {
  const data = points.map((point) => ({
    label: formatQuarterLabel(point.date),
    rands: point.realizedPriceCents / 100,
  }));

  return (
    <div className="h-64 w-full">
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
            formatter={(value) => [`R${Number(value).toLocaleString("en-ZA")}`, "Realized price"]}
          />
          {hernsReferenceValueCents != null && (
            <ReferenceLine
              y={hernsReferenceValueCents / 100}
              stroke="#d97706"
              strokeDasharray="4 4"
              label={{ value: "Hern's reference", position: "insideTopRight", fontSize: 11, fill: "#d97706" }}
            />
          )}
          <Line type="monotone" dataKey="rands" stroke="#0f172a" strokeWidth={2} dot={false} />
        </LineChart>
      </ResponsiveContainer>
    </div>
  );
}
