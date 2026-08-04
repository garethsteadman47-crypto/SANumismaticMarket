"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { FilterXIcon } from "lucide-react";
import { SubscriptionTier, VerificationProvider } from "@prisma/client";

import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { getProviderLabel } from "@/lib/api/verification";

const SELLER_TIER_LABELS: Record<SubscriptionTier, string> = {
  STANDARD: "Standard",
  SILVER: "Silver",
  GOLD: "Gold",
  DEALER: "Dealer",
};

const ANY_VALUE = "any";

export interface CategoryFiltersValue {
  gradingAgency?: string;
  grade?: string;
  minPrice?: string;
  maxPrice?: string;
  sellerTier?: string;
}

export function CategoryFilters({ initialValues, basePath }: { initialValues: CategoryFiltersValue; basePath: string }) {
  const router = useRouter();
  const [values, setValues] = useState<CategoryFiltersValue>(initialValues);

  function applyFilters() {
    const params = new URLSearchParams();
    if (values.gradingAgency && values.gradingAgency !== ANY_VALUE) params.set("gradingAgency", values.gradingAgency);
    if (values.grade) params.set("grade", values.grade);
    if (values.minPrice) params.set("minPrice", values.minPrice);
    if (values.maxPrice) params.set("maxPrice", values.maxPrice);
    if (values.sellerTier && values.sellerTier !== ANY_VALUE) params.set("sellerTier", values.sellerTier);

    const query = params.toString();
    router.push(query ? `${basePath}?${query}` : basePath);
  }

  function clearFilters() {
    setValues({});
    router.push(basePath);
  }

  return (
    <div className="flex flex-col gap-3 rounded-lg border p-4">
      <div className="grid grid-cols-2 gap-3 sm:grid-cols-3 lg:grid-cols-5">
        <div className="flex flex-col gap-1.5">
          <Label htmlFor="filter-grading-agency">Grading agency</Label>
          <Select
            value={values.gradingAgency ?? ANY_VALUE}
            onValueChange={(value) => setValues((prev) => ({ ...prev, gradingAgency: value ?? ANY_VALUE }))}
          >
            <SelectTrigger id="filter-grading-agency" className="w-full">
              <SelectValue placeholder="Any" />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value={ANY_VALUE}>Any</SelectItem>
              {Object.values(VerificationProvider).map((provider) => (
                <SelectItem key={provider} value={provider}>
                  {getProviderLabel(provider)}
                </SelectItem>
              ))}
            </SelectContent>
          </Select>
        </div>

        <div className="flex flex-col gap-1.5">
          <Label htmlFor="filter-grade">Grade</Label>
          <Input
            id="filter-grade"
            placeholder="e.g. MS65"
            value={values.grade ?? ""}
            onChange={(event) => setValues((prev) => ({ ...prev, grade: event.target.value }))}
          />
        </div>

        <div className="flex flex-col gap-1.5">
          <Label htmlFor="filter-min-price">Min price (ZAR)</Label>
          <Input
            id="filter-min-price"
            type="number"
            min="0"
            value={values.minPrice ?? ""}
            onChange={(event) => setValues((prev) => ({ ...prev, minPrice: event.target.value }))}
          />
        </div>

        <div className="flex flex-col gap-1.5">
          <Label htmlFor="filter-max-price">Max price (ZAR)</Label>
          <Input
            id="filter-max-price"
            type="number"
            min="0"
            value={values.maxPrice ?? ""}
            onChange={(event) => setValues((prev) => ({ ...prev, maxPrice: event.target.value }))}
          />
        </div>

        <div className="flex flex-col gap-1.5">
          <Label htmlFor="filter-seller-tier">Seller tier</Label>
          <Select
            value={values.sellerTier ?? ANY_VALUE}
            onValueChange={(value) => setValues((prev) => ({ ...prev, sellerTier: value ?? ANY_VALUE }))}
          >
            <SelectTrigger id="filter-seller-tier" className="w-full">
              <SelectValue placeholder="Any" />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value={ANY_VALUE}>Any</SelectItem>
              {Object.values(SubscriptionTier).map((tier) => (
                <SelectItem key={tier} value={tier}>
                  {SELLER_TIER_LABELS[tier]}
                </SelectItem>
              ))}
            </SelectContent>
          </Select>
        </div>
      </div>

      <div className="flex justify-end gap-2">
        <Button type="button" variant="ghost" size="sm" onClick={clearFilters}>
          <FilterXIcon />
          Clear
        </Button>
        <Button type="button" size="sm" onClick={applyFilters}>
          Apply filters
        </Button>
      </div>
    </div>
  );
}
