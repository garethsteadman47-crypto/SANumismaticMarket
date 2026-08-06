"use client";

import { useMemo, useState } from "react";
import { CalculatorIcon, ChevronDownIcon, TrendingUpIcon } from "lucide-react";

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
 * Spot ticker + melt calculator.
 * Compact (collapsible) for legacy embeds; full always-open panel for /spot-prices.
 */
export function MarketToolsWidget({
  className,
  variant = "compact",
}: {
  className?: string;
  variant?: "compact" | "full";
}) {
  const [open, setOpen] = useState(variant === "full");
  const [metal, setMetal] = useState<SpotMetal>("GOLD");
  const [weightGrams, setWeightGrams] = useState("31.1");
  const [purityId, setPurityId] = useState("gold-916");

  const goldQuote = useMemo(() => getSpotPriceQuote("GOLD"), []);
  const silverQuote = useMemo(() => getSpotPriceQuote("SILVER"), []);
  const quote = metal === "GOLD" ? goldQuote : silverQuote;

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

  const showCalculator = variant === "full" || open;
  const isFull = variant === "full";

  return (
    <div
      className={cn(
        "overflow-hidden rounded-xl border border-slate-800 bg-slate-900 text-slate-100",
        isFull && "border-amber-500/20 shadow-lg shadow-black/20",
        className,
      )}
    >
      <div className={cn("border-b border-slate-800", isFull ? "px-5 py-5" : "px-3 py-3")}>
        <div className="mb-2 flex items-center gap-1.5 text-[0.65rem] font-semibold tracking-[0.16em] text-amber-500 uppercase">
          <TrendingUpIcon className="size-3.5" aria-hidden />
          Live spot
        </div>
        <div className={cn("grid grid-cols-2 gap-2", isFull ? "gap-3 text-base sm:grid-cols-2" : "text-sm")}>
          <div className={cn("rounded-md bg-black/30", isFull ? "px-3 py-3" : "px-2 py-1.5")}>
            <div className="text-[0.65rem] text-slate-400">Gold (Au)</div>
            <div className={cn("font-semibold tabular-nums text-amber-300", isFull && "text-xl")}>
              {formatZarCents(goldQuote.pricePerGramCents)}
              <span className="text-[0.65rem] font-medium text-slate-400">/g</span>
            </div>
          </div>
          <div className={cn("rounded-md bg-black/30", isFull ? "px-3 py-3" : "px-2 py-1.5")}>
            <div className="text-[0.65rem] text-slate-400">Silver (Ag)</div>
            <div className={cn("font-semibold tabular-nums text-slate-100", isFull && "text-xl")}>
              {formatZarCents(silverQuote.pricePerGramCents)}
              <span className="text-[0.65rem] font-medium text-slate-400">/g</span>
            </div>
          </div>
        </div>
      </div>

      {variant === "compact" && (
        <button
          type="button"
          onClick={() => setOpen((value) => !value)}
          className="flex w-full items-center justify-between gap-2 px-3 py-2.5 text-left text-sm font-medium text-slate-200 transition-colors hover:bg-slate-800/60"
          aria-expanded={open}
        >
          <span className="inline-flex items-center gap-2">
            <CalculatorIcon className="size-3.5 text-amber-400" aria-hidden />
            Melt calculator
          </span>
          <ChevronDownIcon
            className={cn("size-4 text-slate-400 transition-transform", open && "rotate-180")}
            aria-hidden
          />
        </button>
      )}

      {isFull && (
        <div className="flex items-center gap-2 border-b border-slate-800 px-5 py-3 text-sm font-medium text-slate-200">
          <CalculatorIcon className="size-4 text-amber-400" aria-hidden />
          Melt calculator
        </div>
      )}

      {showCalculator && (
        <div
          className={cn(
            "flex flex-col gap-3 border-t border-slate-800",
            isFull ? "gap-4 border-t-0 px-5 py-5 sm:grid sm:grid-cols-2 sm:items-end" : "px-3 py-3",
          )}
        >
          <label className="flex flex-col gap-1 text-xs font-medium text-slate-300">
            Metal
            <select
              value={metal}
              onChange={(event) => handleMetalChange(event.target.value as SpotMetal)}
              className={cn(
                "rounded-md border border-slate-700 bg-slate-950 px-2 text-sm text-white outline-none focus:border-amber-500",
                isFull ? "h-10" : "h-8",
              )}
            >
              <option value="GOLD">Gold</option>
              <option value="SILVER">Silver</option>
            </select>
          </label>

          <label className="flex flex-col gap-1 text-xs font-medium text-slate-300">
            Weight (grams)
            <input
              type="number"
              min="0"
              step="0.01"
              value={weightGrams}
              onChange={(event) => setWeightGrams(event.target.value)}
              className={cn(
                "rounded-md border border-slate-700 bg-slate-950 px-2 text-sm text-white outline-none focus:border-amber-500",
                isFull ? "h-10" : "h-8",
              )}
            />
          </label>

          <label className="flex flex-col gap-1 text-xs font-medium text-slate-300">
            Purity
            <select
              value={purityId}
              onChange={(event) => setPurityId(event.target.value)}
              className={cn(
                "rounded-md border border-slate-700 bg-slate-950 px-2 text-sm text-white outline-none focus:border-amber-500",
                isFull ? "h-10" : "h-8",
              )}
            >
              {filteredPurity.map((option) => (
                <option key={option.id} value={option.id}>
                  {option.label}
                </option>
              ))}
            </select>
          </label>

          <div
            className={cn(
              "rounded-lg border border-amber-500/20 bg-black/40 text-center",
              isFull ? "px-4 py-4 sm:col-span-2" : "px-3 py-3",
            )}
          >
            <p className="text-[0.6rem] font-semibold tracking-[0.16em] text-amber-500 uppercase">
              Estimated melt value
            </p>
            <p
              className={cn(
                "mt-1 font-heading font-semibold tabular-nums text-white",
                isFull ? "text-3xl" : "text-2xl",
              )}
            >
              {meltCents > 0 ? formatZarCents(meltCents) : "—"}
            </p>
            {isFull && (
              <p className="mt-2 text-xs text-slate-400">
                Based on live spot × weight × purity. Useful for scrap, bullion, and circulated precious-metal
                coins.
              </p>
            )}
          </div>
        </div>
      )}
    </div>
  );
}

/** Back-compat alias — prefer `MarketToolsWidget`. */
export { MarketToolsWidget as MeltCalculator };
