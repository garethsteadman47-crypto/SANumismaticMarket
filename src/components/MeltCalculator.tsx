"use client";

import { useMemo, useState } from "react";
import { CalculatorIcon } from "lucide-react";

import { calculateMeltValueCents, getSpotPriceQuote, type SpotMetal } from "@/lib/api/spot-prices";
import { formatZarCents } from "@/lib/utils/currency";
import { cn } from "@/lib/utils";

const PURITY_OPTIONS: { id: string; label: string; metal: SpotMetal | "ANY"; purityPercent: number }[] = [
  { id: "union-500", label: ".500 Union Silver", metal: "SILVER", purityPercent: 50 },
  { id: "sterling-925", label: ".925 Sterling", metal: "SILVER", purityPercent: 92.5 },
  { id: "fine-999", label: ".999 Fine", metal: "ANY", purityPercent: 99.9 },
  { id: "gold-916", label: ".916 22k Gold", metal: "GOLD", purityPercent: 91.6 },
  { id: "gold-999", label: ".999 24k Gold", metal: "GOLD", purityPercent: 99.9 },
];

/**
 * Dark-mode melt-value calculator using the mock spot feed (~R1,400/g gold, ~R31/g silver).
 */
export function MeltCalculator({ className }: { className?: string }) {
  const [metal, setMetal] = useState<SpotMetal>("GOLD");
  const [weightGrams, setWeightGrams] = useState("31.1");
  const [purityId, setPurityId] = useState("gold-916");

  const quote = useMemo(() => getSpotPriceQuote(metal), [metal]);
  const purity = PURITY_OPTIONS.find((option) => option.id === purityId) ?? PURITY_OPTIONS[0];
  const weight = Number.parseFloat(weightGrams);
  const meltCents =
    Number.isFinite(weight) && weight > 0
      ? calculateMeltValueCents({
          pricePerGramCents: quote.pricePerGramCents,
          weightGrams: weight,
          purityPercent: purity.purityPercent,
        })
      : 0;

  const filteredPurity = PURITY_OPTIONS.filter(
    (option) => option.metal === "ANY" || option.metal === metal,
  );

  function handleMetalChange(next: SpotMetal) {
    setMetal(next);
    const stillValid = PURITY_OPTIONS.find(
      (option) => option.id === purityId && (option.metal === "ANY" || option.metal === next),
    );
    if (!stillValid) {
      setPurityId(next === "GOLD" ? "gold-916" : "sterling-925");
    }
  }

  return (
    <div
      className={cn(
        "flex flex-col gap-4 rounded-xl border border-slate-700 bg-slate-950 p-4 text-slate-100 shadow-lg",
        className,
      )}
    >
      <div className="flex items-center gap-2">
        <CalculatorIcon className="size-4 text-amber-400" aria-hidden />
        <h3 className="font-heading text-lg font-semibold tracking-tight">Melt calculator</h3>
      </div>
      <p className="text-xs text-slate-400">
        Spot ≈ {formatZarCents(quote.pricePerGramCents)}/g {metal === "GOLD" ? "gold" : "silver"}
      </p>

      <label className="flex flex-col gap-1.5 text-xs font-medium text-slate-300">
        Metal
        <select
          value={metal}
          onChange={(event) => handleMetalChange(event.target.value as SpotMetal)}
          className="h-9 rounded-md border border-slate-600 bg-slate-900 px-2 text-sm text-white outline-none focus:border-amber-500"
        >
          <option value="GOLD">Gold</option>
          <option value="SILVER">Silver</option>
        </select>
      </label>

      <label className="flex flex-col gap-1.5 text-xs font-medium text-slate-300">
        Weight (grams)
        <input
          type="number"
          min="0"
          step="0.01"
          value={weightGrams}
          onChange={(event) => setWeightGrams(event.target.value)}
          className="h-9 rounded-md border border-slate-600 bg-slate-900 px-2 text-sm text-white outline-none focus:border-amber-500"
        />
      </label>

      <label className="flex flex-col gap-1.5 text-xs font-medium text-slate-300">
        Purity
        <select
          value={purityId}
          onChange={(event) => setPurityId(event.target.value)}
          className="h-9 rounded-md border border-slate-600 bg-slate-900 px-2 text-sm text-white outline-none focus:border-amber-500"
        >
          {filteredPurity.map((option) => (
            <option key={option.id} value={option.id}>
              {option.label}
            </option>
          ))}
        </select>
      </label>

      <div className="rounded-lg border border-amber-500/20 bg-black/40 px-3 py-4 text-center">
        <p className="text-[0.65rem] font-semibold tracking-[0.18em] text-amber-500 uppercase">Estimated melt value</p>
        <p className="mt-1 font-heading text-3xl font-semibold tabular-nums text-white">
          {meltCents > 0 ? formatZarCents(meltCents) : "—"}
        </p>
      </div>
    </div>
  );
}
