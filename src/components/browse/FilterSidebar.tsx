"use client";

import { useRef, useState } from "react";
import { useRouter, useSearchParams } from "next/navigation";
import { FilterXIcon } from "lucide-react";

import { Button } from "@/components/ui/button";
import { Checkbox } from "@/components/ui/checkbox";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Separator } from "@/components/ui/separator";
import { Slider } from "@/components/ui/slider";
import { CategoryTree } from "@/components/browse/CategoryTree";
import { MarketToolsWidget } from "@/components/MarketToolsWidget";
import {
  BUYING_FORMATS,
  BUYING_FORMAT_LABELS,
  CERTIFICATION_LABELS,
  CERTIFICATION_OPTIONS,
  GRADE_BRACKETS,
  GRADE_BRACKET_LABELS,
  METAL_BUCKETS,
  METAL_BUCKET_LABELS,
  isAnyFilterActive,
  parseBrowseFilters,
  serializeBrowseFilters,
  type BrowseFilterState,
  type BuyingFormat,
  type CertificationOption,
  type GradeBracket,
  type MetalBucket,
} from "@/lib/browse-filters";

const PRICE_SLIDER_MAX_RANDS = 200_000;
const CURRENT_YEAR = new Date().getFullYear();

function CheckboxGroup<T extends string>({
  legend,
  options,
  labels,
  selected,
  onToggle,
}: {
  legend: string;
  options: readonly T[];
  labels: Record<T, string>;
  selected: T[];
  onToggle: (option: T, checked: boolean) => void;
}) {
  return (
    <fieldset className="flex flex-col gap-2">
      <legend className="text-sm font-semibold">{legend}</legend>
      {options.map((option) => {
        const id = `filter-${legend}-${option}`;
        const checked = selected.includes(option);
        return (
          <div key={option} className="group flex items-center gap-2">
            <Checkbox id={id} checked={checked} onCheckedChange={(value) => onToggle(option, value === true)} />
            <Label htmlFor={id} className="cursor-pointer text-sm font-normal">
              {labels[option]}
            </Label>
          </div>
        );
      })}
    </fieldset>
  );
}

/**
 * The full numismatic filter sidebar: category tree + certification, grade
 * bracket, metal, year range, price range, and buying-format facets.
 * Checkboxes update the URL instantly; number inputs and the price slider
 * debounce briefly so typing/dragging doesn't fire a navigation per
 * keystroke/tick. Rendered once for the desktop sidebar and reused inside
 * the mobile drawer.
 */
export function FilterSidebar({ basePath }: { basePath: string }) {
  const router = useRouter();
  const searchParams = useSearchParams();
  const filters = parseBrowseFilters(Object.fromEntries(searchParams.entries()));

  const [minYearInput, setMinYearInput] = useState(filters.minYear != null ? String(filters.minYear) : "");
  const [maxYearInput, setMaxYearInput] = useState(filters.maxYear != null ? String(filters.maxYear) : "");
  const [minPriceInput, setMinPriceInput] = useState(filters.minPriceRands != null ? String(filters.minPriceRands) : "");
  const [maxPriceInput, setMaxPriceInput] = useState(filters.maxPriceRands != null ? String(filters.maxPriceRands) : "");
  const [sliderValue, setSliderValue] = useState<number[]>([
    filters.minPriceRands ?? 0,
    filters.maxPriceRands ?? PRICE_SLIDER_MAX_RANDS,
  ]);

  const debounceRef = useRef<ReturnType<typeof setTimeout> | null>(null);

  function navigate(nextFilters: BrowseFilterState) {
    const query = serializeBrowseFilters(nextFilters);
    router.push(query ? `${basePath}?${query}` : basePath, { scroll: false });
  }

  function navigateDebounced(nextFilters: BrowseFilterState) {
    if (debounceRef.current) clearTimeout(debounceRef.current);
    debounceRef.current = setTimeout(() => navigate(nextFilters), 450);
  }

  function toggleInArray<T extends string>(array: T[], option: T, checked: boolean): T[] {
    return checked ? [...array, option] : array.filter((item) => item !== option);
  }

  function handleCertToggle(option: CertificationOption, checked: boolean) {
    navigate({ ...filters, certifications: toggleInArray(filters.certifications, option, checked) });
  }
  function handleGradeToggle(option: GradeBracket, checked: boolean) {
    navigate({ ...filters, gradeBrackets: toggleInArray(filters.gradeBrackets, option, checked) });
  }
  function handleMetalToggle(option: MetalBucket, checked: boolean) {
    navigate({ ...filters, metals: toggleInArray(filters.metals, option, checked) });
  }
  function handleFormatToggle(option: BuyingFormat, checked: boolean) {
    navigate({ ...filters, formats: toggleInArray(filters.formats, option, checked) });
  }

  function handleYearChange(which: "min" | "max", raw: string) {
    if (which === "min") setMinYearInput(raw);
    else setMaxYearInput(raw);
    const minYear = which === "min" ? (raw ? Number(raw) : undefined) : filters.minYear;
    const maxYear = which === "max" ? (raw ? Number(raw) : undefined) : filters.maxYear;
    navigateDebounced({ ...filters, minYear, maxYear });
  }

  function handlePriceInputChange(which: "min" | "max", raw: string) {
    if (which === "min") setMinPriceInput(raw);
    else setMaxPriceInput(raw);
    const minPriceRands = which === "min" ? (raw ? Number(raw) : undefined) : filters.minPriceRands;
    const maxPriceRands = which === "max" ? (raw ? Number(raw) : undefined) : filters.maxPriceRands;
    setSliderValue([minPriceRands ?? 0, maxPriceRands ?? PRICE_SLIDER_MAX_RANDS]);
    navigateDebounced({ ...filters, minPriceRands, maxPriceRands });
  }

  function handleSliderCommit(value: number[]) {
    setMinPriceInput(String(value[0]));
    setMaxPriceInput(String(value[1]));
    navigate({ ...filters, minPriceRands: value[0], maxPriceRands: value[1] });
  }

  function clearAll() {
    setMinYearInput("");
    setMaxYearInput("");
    setMinPriceInput("");
    setMaxPriceInput("");
    setSliderValue([0, PRICE_SLIDER_MAX_RANDS]);
    router.push(basePath, { scroll: false });
  }

  return (
    <div className="flex flex-col gap-5">
      <MarketToolsWidget />

      <Separator />

      <CategoryTree basePath={basePath} />

      <Separator />

      <CheckboxGroup
        legend="Certification / Grading Service"
        options={CERTIFICATION_OPTIONS}
        labels={CERTIFICATION_LABELS}
        selected={filters.certifications}
        onToggle={handleCertToggle}
      />

      <Separator />

      <CheckboxGroup
        legend="Grade Bracket"
        options={GRADE_BRACKETS}
        labels={GRADE_BRACKET_LABELS}
        selected={filters.gradeBrackets}
        onToggle={handleGradeToggle}
      />

      <Separator />

      <CheckboxGroup
        legend="Metal Type"
        options={METAL_BUCKETS}
        labels={METAL_BUCKET_LABELS}
        selected={filters.metals}
        onToggle={handleMetalToggle}
      />

      <Separator />

      <fieldset className="flex flex-col gap-2">
        <legend className="text-sm font-semibold">Year Range</legend>
        <div className="flex items-center gap-2">
          <Input
            type="number"
            placeholder="Min Year"
            value={minYearInput}
            min={1600}
            max={CURRENT_YEAR}
            onChange={(event) => handleYearChange("min", event.target.value)}
          />
          <span className="text-muted-foreground">to</span>
          <Input
            type="number"
            placeholder="Max Year"
            value={maxYearInput}
            min={1600}
            max={CURRENT_YEAR}
            onChange={(event) => handleYearChange("max", event.target.value)}
          />
        </div>
      </fieldset>

      <Separator />

      <fieldset className="flex flex-col gap-3">
        <legend className="text-sm font-semibold">Price Range (ZAR)</legend>
        <div className="flex items-center gap-2">
          <Input
            type="number"
            placeholder="Min Price"
            value={minPriceInput}
            min={0}
            onChange={(event) => handlePriceInputChange("min", event.target.value)}
          />
          <span className="text-muted-foreground">to</span>
          <Input
            type="number"
            placeholder="Max Price"
            value={maxPriceInput}
            min={0}
            onChange={(event) => handlePriceInputChange("max", event.target.value)}
          />
        </div>
        <Slider
          value={sliderValue}
          min={0}
          max={PRICE_SLIDER_MAX_RANDS}
          step={500}
          onValueChange={(value) => setSliderValue(Array.isArray(value) ? value : [value, value])}
          onValueCommitted={(value) => handleSliderCommit(Array.isArray(value) ? value : [value, value])}
        />
      </fieldset>

      <Separator />

      <CheckboxGroup
        legend="Buying Format"
        options={BUYING_FORMATS}
        labels={BUYING_FORMAT_LABELS}
        selected={filters.formats}
        onToggle={handleFormatToggle}
      />

      <Separator />

      {isAnyFilterActive(filters) && (
        <Button type="button" variant="outline" size="sm" onClick={clearAll}>
          <FilterXIcon />
          Clear all filters
        </Button>
      )}
    </div>
  );
}
