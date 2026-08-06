"use client";

import { useMemo, useState, useTransition } from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { toast } from "sonner";
import { DownloadIcon, FileSpreadsheetIcon, Loader2Icon, UploadIcon } from "lucide-react";

import { importBulkListingsCsvAction } from "@/actions/bulk-listings";
import { buildBulkCsvTemplate } from "@/lib/bulk-listings";
import { Button, buttonVariants } from "@/components/ui/button";
import { cn } from "@/lib/utils";

export function BulkCsvUploadPanel() {
  const router = useRouter();
  const [isPending, startTransition] = useTransition();
  const [fileName, setFileName] = useState<string | null>(null);
  const [csvText, setCsvText] = useState("");
  const [lastResult, setLastResult] = useState<{
    successCount: number;
    errorCount: number;
    errors: { row: number; message: string }[];
    listingIds: string[];
  } | null>(null);

  const templateHref = useMemo(() => {
    const blob = new Blob([buildBulkCsvTemplate()], { type: "text/csv;charset=utf-8" });
    return URL.createObjectURL(blob);
  }, []);

  function handleFile(file: File | undefined) {
    if (!file) return;
    if (!file.name.toLowerCase().endsWith(".csv") && file.type && !file.type.includes("csv")) {
      toast.error("Please upload a .csv file.");
      return;
    }
    setFileName(file.name);
    const reader = new FileReader();
    reader.onload = () => {
      setCsvText(String(reader.result ?? ""));
      setLastResult(null);
    };
    reader.onerror = () => toast.error("Could not read that CSV file.");
    reader.readAsText(file);
  }

  function handleImport() {
    if (!csvText.trim()) {
      toast.error("Choose a CSV file first.");
      return;
    }
    startTransition(async () => {
      const result = await importBulkListingsCsvAction(csvText, fileName ?? undefined);
      if (!result.success) {
        toast.error(result.error);
        return;
      }
      setLastResult({
        successCount: result.successCount,
        errorCount: result.errorCount,
        errors: result.errors,
        listingIds: result.listingIds,
      });
      if (result.successCount > 0) {
        toast.success(`Imported ${result.successCount} listing${result.successCount === 1 ? "" : "s"}.`);
        router.refresh();
      } else {
        toast.error("No listings were created — check the row errors below.");
      }
    });
  }

  return (
    <div className="flex flex-col gap-6">
      <section className="rounded-2xl border border-slate-800 bg-slate-900/60 p-6 shadow-xl shadow-black/20 sm:p-8">
        <div className="flex flex-col gap-2 sm:flex-row sm:items-start sm:justify-between">
          <div>
            <h2 className="flex items-center gap-2 text-lg font-semibold text-white">
              <FileSpreadsheetIcon className="size-5 text-amber-400" aria-hidden />
              Upload inventory CSV
            </h2>
            <p className="mt-2 max-w-2xl text-sm leading-relaxed text-slate-400">
              Map each row to a Buy Now listing. Image columns must be public HTTPS URLs (cover / obverse /
              reverse / slab). Maximum 100 rows per upload.
            </p>
          </div>
          <a
            href={templateHref}
            download="mintmark-bulk-listings-template.csv"
            className={cn(
              buttonVariants({ variant: "outline", size: "sm" }),
              "border-slate-700 text-slate-200",
            )}
          >
            <DownloadIcon className="size-4" aria-hidden />
            Download template
          </a>
        </div>

        <label
          className={cn(
            "mt-6 flex cursor-pointer flex-col items-center justify-center gap-3 rounded-xl border border-dashed border-slate-700 bg-slate-950/50 px-6 py-10 text-center transition-colors",
            "hover:border-amber-500/50 hover:bg-slate-950",
          )}
        >
          <UploadIcon className="size-8 text-amber-400" aria-hidden />
          <span className="text-sm font-medium text-slate-200">
            {fileName ? fileName : "Drop a CSV here or click to browse"}
          </span>
          <span className="text-xs text-slate-500">UTF-8 CSV · first row must be headers</span>
          <input
            type="file"
            accept=".csv,text/csv"
            className="sr-only"
            onChange={(event) => {
              handleFile(event.target.files?.[0]);
              event.target.value = "";
            }}
          />
        </label>

        <div className="mt-6 flex flex-wrap gap-3">
          <Button
            type="button"
            disabled={isPending || !csvText.trim()}
            onClick={handleImport}
            className="bg-amber-500 font-bold text-black hover:bg-amber-400"
          >
            {isPending && <Loader2Icon className="animate-spin" aria-hidden />}
            Import listings
          </Button>
          <Link
            href="/account/sales"
            className={cn(buttonVariants({ variant: "outline", size: "default" }), "border-slate-700 text-slate-200")}
          >
            Back to Sales
          </Link>
        </div>
      </section>

      {lastResult && (
        <section className="rounded-2xl border border-slate-800 bg-slate-900/60 p-6 sm:p-8">
          <h3 className="text-base font-semibold text-white">Import results</h3>
          <p className="mt-2 text-sm text-slate-400">
            Created <span className="font-semibold text-amber-300">{lastResult.successCount}</span> listings
            {lastResult.errorCount > 0 && (
              <>
                {" "}
                · <span className="font-semibold text-red-400">{lastResult.errorCount}</span> row issue
                {lastResult.errorCount === 1 ? "" : "s"}
              </>
            )}
          </p>

          {lastResult.listingIds.length > 0 && (
            <ul className="mt-4 space-y-2">
              {lastResult.listingIds.slice(0, 12).map((id) => (
                <li key={id}>
                  <Link href={`/listings/${id}`} className="text-sm text-amber-300 hover:underline">
                    View listing {id.slice(-6)}
                  </Link>
                </li>
              ))}
            </ul>
          )}

          {lastResult.errors.length > 0 && (
            <ul className="mt-4 space-y-2 rounded-lg border border-red-500/20 bg-red-500/5 p-4 text-sm text-red-200">
              {lastResult.errors.map((error) => (
                <li key={`${error.row}-${error.message}`}>
                  Row {error.row}: {error.message}
                </li>
              ))}
            </ul>
          )}
        </section>
      )}
    </div>
  );
}
