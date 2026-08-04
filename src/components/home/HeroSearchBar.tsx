"use client";

import { SearchIcon } from "lucide-react";

import { BROWSE_TAXONOMY_LABELS } from "@/lib/constants";

const CATEGORY_OPTIONS = [
  { value: "", label: "All categories" },
  ...Object.entries(BROWSE_TAXONOMY_LABELS).map(([id, meta]) => ({
    value: id,
    label: meta.label,
  })),
];

/**
 * High-contrast hero search — submits to `/listings` with `q` + optional `category`.
 */
export function HeroSearchBar() {
  return (
    <form
      action="/listings"
      method="get"
      className="flex w-full max-w-3xl flex-col gap-2 sm:flex-row sm:items-stretch"
      role="search"
    >
      <div className="flex min-w-0 flex-1 overflow-hidden rounded-lg border border-slate-600 bg-white shadow-lg focus-within:ring-2 focus-within:ring-amber-500">
        <label htmlFor="hero-search-q" className="sr-only">
          Search catalogue
        </label>
        <input
          id="hero-search-q"
          name="q"
          type="search"
          placeholder="Search coins, banknotes, and bullion..."
          className="min-w-0 flex-1 bg-transparent px-4 py-3.5 text-base text-slate-950 placeholder:text-slate-400 outline-none"
        />
        <label htmlFor="hero-search-category" className="sr-only">
          Category
        </label>
        <select
          id="hero-search-category"
          name="category"
          defaultValue=""
          className="hidden w-40 shrink-0 border-l border-slate-200 bg-slate-50 px-3 text-sm text-slate-800 outline-none sm:block"
        >
          {CATEGORY_OPTIONS.map((option) => (
            <option key={option.value || "all"} value={option.value}>
              {option.label}
            </option>
          ))}
        </select>
      </div>
      <button
        type="submit"
        className="inline-flex items-center justify-center gap-2 rounded-lg bg-amber-500 px-6 py-3.5 text-sm font-semibold text-slate-950 transition-colors hover:bg-amber-400"
      >
        <SearchIcon className="size-4" aria-hidden />
        Search
      </button>
    </form>
  );
}
