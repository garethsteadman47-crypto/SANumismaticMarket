"use client";

import { useMemo, useState, useTransition } from "react";
import { useRouter } from "next/navigation";
import { toast } from "sonner";
import {
  ArrowLeftIcon,
  CheckCircle2Icon,
  DownloadIcon,
  FileSpreadsheetIcon,
  ImagePlusIcon,
  Loader2Icon,
  UploadIcon,
  XIcon,
} from "lucide-react";

import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import {
  buildBulkCsvTemplate,
  isBulkDraftRowValid,
  parseBulkCsvToDraftRows,
  validateBulkDraftRow,
  type BulkCsvHeader,
  type BulkDraftRow,
} from "@/lib/bulk-listings";
import { cn } from "@/lib/utils";

const EDITABLE_COLUMNS: { key: BulkCsvHeader; label: string; wide?: boolean }[] = [
  { key: "title", label: "Title", wide: true },
  { key: "category", label: "Category" },
  { key: "priceRands", label: "Price (R)" },
  { key: "gradingCompany", label: "Grading" },
  { key: "condition", label: "Grade" },
  { key: "certificateId", label: "Slab serial" },
  { key: "coverImageUrl", label: "Cover URL", wide: true },
];

type WizardStep = "upload" | "preview" | "publish";

export function BulkUploadWizard({ onBack }: { onBack?: () => void }) {
  const router = useRouter();
  const [step, setStep] = useState<WizardStep>("upload");
  const [fileName, setFileName] = useState<string | null>(null);
  const [rows, setRows] = useState<BulkDraftRow[]>([]);
  const [dragging, setDragging] = useState(false);
  const [photoDrawerRowId, setPhotoDrawerRowId] = useState<string | null>(null);
  const [isPending, startTransition] = useTransition();

  const templateHref = useMemo(() => {
    const blob = new Blob([buildBulkCsvTemplate()], { type: "text/csv;charset=utf-8" });
    return URL.createObjectURL(blob);
  }, []);

  const validCount = rows.filter(isBulkDraftRowValid).length;
  const warningCount = rows.filter((row) => row.warnings.length > 0).length;
  const errorCount = rows.filter((row) => !isBulkDraftRowValid(row)).length;

  function handleCsvFile(file: File | undefined) {
    if (!file) return;
    if (!file.name.toLowerCase().endsWith(".csv") && file.type && !file.type.includes("csv")) {
      toast.error("Please upload a .csv file.");
      return;
    }
    setFileName(file.name);
    const reader = new FileReader();
    reader.onload = () => {
      const text = String(reader.result ?? "");
      const parsed = parseBulkCsvToDraftRows(text);
      if (parsed.fatalError) {
        toast.error(parsed.fatalError);
        return;
      }
      if (parsed.rows.length === 0) {
        toast.error("No data rows found in that CSV.");
        return;
      }
      setRows(parsed.rows);
      setStep("preview");
      toast.success(`Parsed ${parsed.rows.length} row${parsed.rows.length === 1 ? "" : "s"}.`);
    };
    reader.onerror = () => toast.error("Could not read that CSV file.");
    reader.readAsText(file);
  }

  function updateCell(rowId: string, key: BulkCsvHeader, value: string) {
    setRows((prev) =>
      prev.map((row) => {
        if (row.id !== rowId) return row;
        return validateBulkDraftRow({ ...row, [key]: value });
      }),
    );
  }

  function attachPhoto(rowId: string, file: File | undefined) {
    if (!file || !file.type.startsWith("image/")) return;
    startTransition(async () => {
      try {
        const { fileToPersistableDataUrl } = await import("@/lib/listing-media");
        const dataUrl = await fileToPersistableDataUrl(file);
        setRows((prev) =>
          prev.map((row) => {
            if (row.id !== rowId) return row;
            return validateBulkDraftRow({ ...row, coverImageUrl: dataUrl });
          }),
        );
        setPhotoDrawerRowId(null);
        toast.success("Photo attached to row.");
      } catch (error) {
        toast.error(error instanceof Error ? error.message : "Could not process that photo.");
      }
    });
  }

  function handlePublish() {
    const validRows = rows.filter(isBulkDraftRowValid);
    if (validRows.length === 0) {
      toast.error("Fix validation errors before publishing.");
      return;
    }

    startTransition(async () => {
      const response = await fetch("/api/listings/bulk", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          filename: fileName,
          rows: validRows,
        }),
      });

      const payload = (await response.json().catch(() => null)) as
        | {
            success: true;
            data: { successCount: number; errorCount: number; errors: { row: number; message: string }[] };
          }
        | { success: false; error: string }
        | null;

      if (!response.ok || !payload || payload.success === false) {
        toast.error(payload && "error" in payload ? payload.error : "Bulk publish failed.");
        return;
      }

      toast.success(
        `Published ${payload.data.successCount} listing${payload.data.successCount === 1 ? "" : "s"}.`,
      );
      if (payload.data.errorCount > 0) {
        toast.message(`${payload.data.errorCount} row(s) could not be published.`);
      }
      router.push("/account/sales");
      router.refresh();
    });
  }

  const photoRow = rows.find((row) => row.id === photoDrawerRowId) ?? null;

  return (
    <div className="flex flex-col gap-6">
      <div className="flex flex-wrap items-center justify-between gap-3">
        <div className="flex items-center gap-2">
          {onBack && (
            <Button type="button" variant="ghost" size="sm" onClick={onBack}>
              <ArrowLeftIcon className="size-4" aria-hidden />
              Back
            </Button>
          )}
          <div>
            <h2 className="font-heading text-xl font-semibold">Bulk CSV Importer</h2>
            <p className="text-sm text-muted-foreground">
              Step {step === "upload" ? "1" : step === "preview" ? "2" : "3"} of 3 — template, validate, publish.
            </p>
          </div>
        </div>
        <ol className="flex gap-2 text-xs font-medium">
          {(
            [
              ["upload", "Template"],
              ["preview", "Preview"],
              ["publish", "Publish"],
            ] as const
          ).map(([id, label]) => (
            <li
              key={id}
              className={cn(
                "rounded-full px-3 py-1",
                step === id ? "bg-amber-500 text-black" : "bg-muted text-muted-foreground",
              )}
            >
              {label}
            </li>
          ))}
        </ol>
      </div>

      {step === "upload" && (
        <section className="flex flex-col gap-4 rounded-xl border p-6">
          <div className="flex flex-col gap-2 sm:flex-row sm:items-center sm:justify-between">
            <div>
              <h3 className="font-medium">Download MintMark CSV Template</h3>
              <p className="text-sm text-muted-foreground">
                Fill title, category, price, grading company (NGC / PCGS / SANGS / RAW), and image URLs.
              </p>
            </div>
            <a
              href={templateHref}
              download="mintmark-bulk-listings-template.csv"
              className="inline-flex h-10 items-center justify-center gap-2 rounded-md border px-4 text-sm font-medium hover:bg-muted"
            >
              <DownloadIcon className="size-4" aria-hidden />
              Download MintMark CSV Template (.csv)
            </a>
          </div>

          <div
            className={cn(
              "flex flex-col items-center justify-center gap-3 rounded-xl border border-dashed px-6 py-14 text-center transition-colors",
              dragging ? "border-amber-500 bg-amber-500/5" : "border-slate-300 dark:border-slate-700",
            )}
            onDragEnter={(event) => {
              event.preventDefault();
              setDragging(true);
            }}
            onDragOver={(event) => {
              event.preventDefault();
              setDragging(true);
            }}
            onDragLeave={(event) => {
              event.preventDefault();
              setDragging(false);
            }}
            onDrop={(event) => {
              event.preventDefault();
              setDragging(false);
              handleCsvFile(event.dataTransfer.files?.[0]);
            }}
          >
            <FileSpreadsheetIcon className="size-10 text-amber-500" aria-hidden />
            <p className="text-sm font-medium">{fileName ?? "Drop your .csv file here"}</p>
            <p className="text-xs text-muted-foreground">or click to browse</p>
            <label className="inline-flex cursor-pointer items-center gap-2 rounded-md bg-amber-500 px-4 py-2 text-sm font-semibold text-black hover:bg-amber-400">
              <UploadIcon className="size-4" aria-hidden />
              Choose CSV
              <input
                type="file"
                accept=".csv,text/csv"
                className="sr-only"
                onChange={(event) => {
                  handleCsvFile(event.target.files?.[0]);
                  event.target.value = "";
                }}
              />
            </label>
          </div>
        </section>
      )}

      {step === "preview" && (
        <section className="flex flex-col gap-4">
          <div className="flex flex-wrap items-center justify-between gap-3 rounded-lg border bg-muted/40 px-4 py-3 text-sm">
            <p>
              <span className="font-semibold text-emerald-600">{validCount}</span> valid ·{" "}
              <span className="font-semibold text-amber-600">{warningCount}</span> warnings ·{" "}
              <span className="font-semibold text-destructive">{errorCount}</span> errors
            </p>
            <div className="flex gap-2">
              <Button type="button" variant="outline" size="sm" onClick={() => setStep("upload")}>
                Re-upload CSV
              </Button>
              <Button
                type="button"
                size="sm"
                className="bg-amber-500 text-black hover:bg-amber-400"
                disabled={validCount === 0}
                onClick={() => setStep("publish")}
              >
                Continue to publish
              </Button>
            </div>
          </div>

          <div className="overflow-x-auto rounded-xl border">
            <table className="min-w-full text-left text-sm">
              <thead className="bg-slate-950 text-xs tracking-wide text-amber-100 uppercase">
                <tr>
                  <th className="px-3 py-2">#</th>
                  <th className="px-3 py-2">Photo</th>
                  {EDITABLE_COLUMNS.map((col) => (
                    <th key={col.key} className="px-3 py-2 whitespace-nowrap">
                      {col.label}
                    </th>
                  ))}
                  <th className="px-3 py-2">Status</th>
                </tr>
              </thead>
              <tbody>
                {rows.map((row) => {
                  const cover = row.coverImageUrl.trim();
                  const valid = isBulkDraftRowValid(row);
                  return (
                    <tr
                      key={row.id}
                      className={cn(
                        "border-t align-top",
                        !valid && "bg-red-500/5",
                        valid && row.warnings.length > 0 && "bg-amber-500/5",
                      )}
                    >
                      <td className="px-3 py-2 text-xs text-muted-foreground">{row.sourceRow}</td>
                      <td className="px-3 py-2">
                        <div className="flex flex-col items-start gap-1">
                          <div className="relative size-12 overflow-hidden rounded-md border bg-muted">
                            {cover ? (
                              // eslint-disable-next-line @next/next/no-img-element
                              <img src={cover} alt="" className="size-full object-cover" />
                            ) : (
                              <div className="flex size-full items-center justify-center text-muted-foreground">
                                <ImagePlusIcon className="size-4" aria-hidden />
                              </div>
                            )}
                          </div>
                          {!cover && (
                            <button
                              type="button"
                              className="text-[0.65rem] font-medium text-amber-700 hover:underline dark:text-amber-400"
                              onClick={() => setPhotoDrawerRowId(row.id)}
                            >
                              Upload Missing Photos
                            </button>
                          )}
                        </div>
                      </td>
                      {EDITABLE_COLUMNS.map((col) => (
                        <td key={col.key} className="px-2 py-2">
                          <Input
                            value={row[col.key]}
                            onChange={(event) => updateCell(row.id, col.key, event.target.value)}
                            className={cn(
                              "h-8 min-w-[7rem] text-xs",
                              col.wide && "min-w-[12rem]",
                              row.fieldErrors[col.key] && "border-destructive",
                            )}
                            aria-invalid={Boolean(row.fieldErrors[col.key])}
                          />
                          {row.fieldErrors[col.key] && (
                            <p className="mt-0.5 text-[0.65rem] text-destructive">{row.fieldErrors[col.key]}</p>
                          )}
                        </td>
                      ))}
                      <td className="px-3 py-2 text-xs">
                        {valid ? (
                          <span className="inline-flex items-center gap-1 text-emerald-600">
                            <CheckCircle2Icon className="size-3.5" aria-hidden />
                            Ready
                          </span>
                        ) : (
                          <span className="text-destructive">Needs fixes</span>
                        )}
                        {row.warnings.map((warning) => (
                          <p key={warning} className="mt-1 text-amber-700 dark:text-amber-400">
                            {warning}
                          </p>
                        ))}
                      </td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
          </div>
        </section>
      )}

      {step === "publish" && (
        <section className="flex flex-col gap-4 rounded-xl border p-6">
          <div className="rounded-lg border border-amber-500/30 bg-amber-500/10 px-4 py-3 text-sm">
            Ready to import <span className="font-semibold">{validCount}</span> valid listing
            {validCount === 1 ? "" : "s"}
            {warningCount > 0 && (
              <>
                {" "}
                (<span className="font-semibold">{warningCount}</span> warning{warningCount === 1 ? "" : "s"})
              </>
            )}
            {errorCount > 0 && (
              <>
                {" "}
                — <span className="font-semibold text-destructive">{errorCount}</span> invalid row
                {errorCount === 1 ? "" : "s"} will be skipped
              </>
            )}
            .
          </div>
          <div className="flex flex-wrap gap-3">
            <Button type="button" variant="outline" onClick={() => setStep("preview")} disabled={isPending}>
              Back to preview
            </Button>
            <Button
              type="button"
              disabled={isPending || validCount === 0}
              onClick={handlePublish}
              className="bg-amber-500 px-6 font-bold text-black hover:bg-amber-400"
            >
              {isPending && <Loader2Icon className="animate-spin" aria-hidden />}
              Publish All Listings
            </Button>
          </div>
        </section>
      )}

      {photoRow && (
        <div className="fixed inset-0 z-50 flex items-end justify-center bg-black/50 p-4 sm:items-center">
          <div className="w-full max-w-md rounded-xl border bg-background p-5 shadow-xl">
            <div className="mb-3 flex items-start justify-between gap-3">
              <div>
                <h3 className="font-semibold">Upload Missing Photos</h3>
                <p className="text-sm text-muted-foreground line-clamp-1">{photoRow.title || `Row ${photoRow.sourceRow}`}</p>
              </div>
              <button type="button" onClick={() => setPhotoDrawerRowId(null)} aria-label="Close">
                <XIcon className="size-4" />
              </button>
            </div>
            <label className="flex cursor-pointer flex-col items-center gap-2 rounded-lg border border-dashed px-4 py-10 text-center hover:border-amber-500">
              <ImagePlusIcon className="size-8 text-amber-500" aria-hidden />
              <span className="text-sm font-medium">Drop cover photo or click to browse</span>
              <input
                type="file"
                accept="image/*"
                className="sr-only"
                onChange={(event) => {
                  attachPhoto(photoRow.id, event.target.files?.[0]);
                  event.target.value = "";
                }}
              />
            </label>
            <p className="mt-3 text-xs text-muted-foreground">
              Or paste a public image URL into the Cover URL cell in the grid.
            </p>
          </div>
        </div>
      )}
    </div>
  );
}
