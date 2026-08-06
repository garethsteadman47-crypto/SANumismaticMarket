"use client";

import { useState } from "react";
import { ArrowLeftIcon, CoinsIcon, FileSpreadsheetIcon } from "lucide-react";
import type { SubscriptionTier } from "@prisma/client";

import { SingleItemWizard } from "@/components/SingleItemWizard";
import { BulkUploadWizard } from "@/components/BulkUploadWizard";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { cn } from "@/lib/utils";

type ListingMode = "choose" | "single" | "bulk";

/**
 * Entry point for /listings/new — sellers pick Single Item wizard vs Bulk CSV
 * before any form fields are shown.
 */
export function NewListingEntry({
  sellerTier,
  canBulkImport = true,
}: {
  sellerTier: SubscriptionTier;
  canBulkImport?: boolean;
}) {
  const [mode, setMode] = useState<ListingMode>("choose");

  if (mode === "single") {
    return (
      <div className="flex flex-col gap-4">
        <Button type="button" variant="ghost" size="sm" className="w-fit" onClick={() => setMode("choose")}>
          <ArrowLeftIcon className="size-4" aria-hidden />
          Change listing method
        </Button>
        <SingleItemWizard sellerTier={sellerTier} />
      </div>
    );
  }

  if (mode === "bulk") {
    return <BulkUploadWizard onBack={() => setMode("choose")} />;
  }

  return (
    <div className="flex flex-col gap-6">
      <div className="flex flex-col gap-1">
        <h1 className="font-heading text-3xl font-semibold">How would you like to list your items?</h1>
        <p className="text-sm text-muted-foreground">
          Choose a guided single listing or import a spreadsheet of inventory.
        </p>
      </div>

      <div className="grid gap-4 sm:grid-cols-2">
        <button
          type="button"
          onClick={() => setMode("single")}
          className={cn(
            "flex flex-col gap-3 rounded-xl border border-slate-200 bg-background p-6 text-left transition-colors",
            "hover:border-amber-500 hover:bg-amber-500/5 dark:border-slate-800",
          )}
        >
          <div className="flex size-11 items-center justify-center rounded-lg bg-amber-500/10 text-amber-600">
            <CoinsIcon className="size-6" aria-hidden />
          </div>
          <div className="flex flex-col gap-1">
            <h2 className="font-heading text-lg font-semibold">Single Item Listing</h2>
            <p className="text-sm text-muted-foreground">
              Best for individual rare coins, slabbed high-value items, or custom auctions.
            </p>
          </div>
          <span className="mt-auto text-sm font-medium text-amber-700 dark:text-amber-400">
            Open 4-step wizard →
          </span>
        </button>

        <button
          type="button"
          onClick={() => {
            if (!canBulkImport) return;
            setMode("bulk");
          }}
          disabled={!canBulkImport}
          className={cn(
            "flex flex-col gap-3 rounded-xl border border-slate-200 bg-background p-6 text-left transition-colors",
            "hover:border-amber-500 hover:bg-amber-500/5 dark:border-slate-800",
            !canBulkImport && "cursor-not-allowed opacity-60 hover:border-slate-200 hover:bg-background",
          )}
        >
          <div className="flex items-start justify-between gap-2">
            <div className="flex size-11 items-center justify-center rounded-lg bg-amber-500/10 text-amber-600">
              <FileSpreadsheetIcon className="size-6" aria-hidden />
            </div>
            <Badge className="bg-slate-900 text-[0.65rem] text-amber-200 hover:bg-slate-900">
              Dealers & Power Sellers
            </Badge>
          </div>
          <div className="flex flex-col gap-1">
            <h2 className="font-heading text-lg font-semibold">Bulk CSV Importer</h2>
            <p className="text-sm text-muted-foreground">
              Upload a metadata CSV, then allocate photos visually from a shared pool — no image URLs required.
            </p>
          </div>
          <span className="mt-auto text-sm font-medium text-amber-700 dark:text-amber-400">
            {canBulkImport ? "Open CSV importer →" : "Requires Gold or Dealer membership"}
          </span>
        </button>
      </div>
    </div>
  );
}
