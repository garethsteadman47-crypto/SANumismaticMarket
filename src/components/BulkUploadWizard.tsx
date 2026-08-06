"use client";

import { useCallback, useEffect, useMemo, useRef, useState, useTransition } from "react";
import { useRouter } from "next/navigation";
import { toast } from "sonner";
import {
  ArrowLeftIcon,
  CheckCircle2Icon,
  DownloadIcon,
  FileSpreadsheetIcon,
  ImagePlusIcon,
  ImagesIcon,
  Loader2Icon,
  SparklesIcon,
  UploadIcon,
  XIcon,
} from "lucide-react";

import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import {
  buildBulkCsvTemplate,
  emptyRowMedia,
  isBulkDraftRowPublishable,
  isBulkDraftRowValid,
  parseBulkCsvToDraftRows,
  rowPhotoStatus,
  validateBulkDraftRow,
  type BulkCsvHeader,
  type BulkDraftRow,
  type BulkPhotoPoolItem,
  type MediaSlotId,
} from "@/lib/bulk-listings";
import { autoMatchPhotosToRows } from "@/lib/bulk-photo-match";
import { cn } from "@/lib/utils";

const METADATA_COLUMNS: { key: BulkCsvHeader; label: string; wide?: boolean }[] = [
  { key: "title", label: "Title", wide: true },
  { key: "description", label: "Description", wide: true },
  { key: "category", label: "Category" },
  { key: "priceRands", label: "Price (R)" },
  { key: "condition", label: "Grade" },
  { key: "gradingCompany", label: "Grading" },
  { key: "certificateId", label: "Cert #" },
];

const MEDIA_SLOTS: { id: MediaSlotId; label: string; required?: boolean }[] = [
  { id: "cover", label: "Cover" },
  { id: "obverse", label: "Obverse", required: true },
  { id: "reverse", label: "Reverse", required: true },
  { id: "slab", label: "Slab / Cert" },
];

type WizardStep = "csv" | "photos" | "allocate";

const IMAGE_ACCEPT = "image/jpeg,image/png,image/webp,.jpg,.jpeg,.png,.webp";

function createPoolItem(file: File): BulkPhotoPoolItem {
  return {
    id: `photo-${Date.now()}-${Math.random().toString(36).slice(2, 9)}`,
    name: file.name,
    previewUrl: URL.createObjectURL(file),
    file,
  };
}

function revokePoolItem(item: BulkPhotoPoolItem | null | undefined) {
  if (item?.previewUrl?.startsWith("blob:")) {
    URL.revokeObjectURL(item.previewUrl);
  }
}

async function uploadImageFile(file: File): Promise<string> {
  const form = new FormData();
  form.append("file", file);
  const response = await fetch("/api/uploads/image", { method: "POST", body: form });
  const payload = (await response.json().catch(() => null)) as
    | { success: true; data: { url: string } }
    | { success: false; error: string }
    | null;
  if (!response.ok || !payload || payload.success === false) {
    throw new Error(payload && "error" in payload ? payload.error : "Image upload failed.");
  }
  return payload.data.url;
}

export function BulkUploadWizard({ onBack }: { onBack?: () => void }) {
  const router = useRouter();
  const [step, setStep] = useState<WizardStep>("csv");
  const [fileName, setFileName] = useState<string | null>(null);
  const [rows, setRows] = useState<BulkDraftRow[]>([]);
  const [photoPool, setPhotoPool] = useState<BulkPhotoPoolItem[]>([]);
  const [csvDragging, setCsvDragging] = useState(false);
  const [photoDragging, setPhotoDragging] = useState(false);
  const [slotPicker, setSlotPicker] = useState<{ rowId: string; slot: MediaSlotId } | null>(null);
  const [dragOverSlot, setDragOverSlot] = useState<{ rowId: string; slot: MediaSlotId } | null>(null);
  const [progressMessage, setProgressMessage] = useState<string | null>(null);
  const [isPending, startTransition] = useTransition();
  const pickerRef = useRef<HTMLDivElement>(null);

  const templateHref = useMemo(() => {
    const blob = new Blob([buildBulkCsvTemplate()], { type: "text/csv;charset=utf-8" });
    return URL.createObjectURL(blob);
  }, []);

  useEffect(() => {
    return () => {
      URL.revokeObjectURL(templateHref);
    };
  }, [templateHref]);

  useEffect(() => {
    function onPointerDown(event: MouseEvent) {
      if (!slotPicker) return;
      if (pickerRef.current && !pickerRef.current.contains(event.target as Node)) {
        setSlotPicker(null);
      }
    }
    document.addEventListener("mousedown", onPointerDown);
    return () => document.removeEventListener("mousedown", onPointerDown);
  }, [slotPicker]);

  const validMetaCount = rows.filter(isBulkDraftRowValid).length;
  const publishableCount = rows.filter(isBulkDraftRowPublishable).length;
  const completePhotoCount = rows.filter((row) => rowPhotoStatus(row) === "complete").length;

  const handleCsvFile = useCallback((file: File | undefined) => {
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
      toast.success(`Parsed ${parsed.rows.length} row${parsed.rows.length === 1 ? "" : "s"}.`);
    };
    reader.onerror = () => toast.error("Could not read that CSV file.");
    reader.readAsText(file);
  }, []);

  function updateCell(rowId: string, key: BulkCsvHeader, value: string) {
    setRows((prev) =>
      prev.map((row) => {
        if (row.id !== rowId) return row;
        return validateBulkDraftRow({ ...row, [key]: value });
      }),
    );
  }

  function addPhotosToPool(files: FileList | File[]) {
    const accepted = Array.from(files).filter((file) => {
      const type = file.type.toLowerCase();
      const name = file.name.toLowerCase();
      return (
        type === "image/jpeg" ||
        type === "image/png" ||
        type === "image/webp" ||
        /\.(jpe?g|png|webp)$/.test(name)
      );
    });
    if (accepted.length === 0) {
      toast.error("Please drop JPEG, PNG, or WEBP images.");
      return;
    }
    const items = accepted.map(createPoolItem);
    setPhotoPool((prev) => [...prev, ...items]);
    toast.success(`Added ${items.length} photo${items.length === 1 ? "" : "s"} to the pool.`);
  }

  function removeFromPool(photoId: string) {
    setPhotoPool((prev) => {
      const target = prev.find((item) => item.id === photoId);
      revokePoolItem(target);
      return prev.filter((item) => item.id !== photoId);
    });
  }

  function clearPool() {
    setPhotoPool((prev) => {
      prev.forEach(revokePoolItem);
      return [];
    });
  }

  function assignPhotoToSlot(rowId: string, slot: MediaSlotId, photo: BulkPhotoPoolItem) {
    setRows((prevRows) => {
      const target = prevRows.find((row) => row.id === rowId);
      const displaced = target?.media[slot] ?? null;

      setPhotoPool((prevPool) => {
        const withoutAssigned = prevPool.filter((item) => item.id !== photo.id);
        if (displaced && displaced.id !== photo.id && !withoutAssigned.some((item) => item.id === displaced.id)) {
          return [...withoutAssigned, displaced];
        }
        return withoutAssigned;
      });

      return prevRows.map((row) => {
        if (row.id !== rowId) return row;
        return validateBulkDraftRow({ ...row, media: { ...row.media, [slot]: photo } });
      });
    });
    setSlotPicker(null);
  }

  function clearSlot(rowId: string, slot: MediaSlotId) {
    setRows((prevRows) => {
      const target = prevRows.find((row) => row.id === rowId);
      const photo = target?.media[slot] ?? null;
      if (photo) {
        setPhotoPool((pool) => (pool.some((item) => item.id === photo.id) ? pool : [...pool, photo]));
      }
      return prevRows.map((item) => {
        if (item.id !== rowId) return item;
        return validateBulkDraftRow({
          ...item,
          media: { ...item.media, [slot]: null },
        });
      });
    });
  }

  function runAutoMatch() {
    const result = autoMatchPhotosToRows(rows, photoPool);
    setRows(result.rows.map(validateBulkDraftRow));
    setPhotoPool(result.remainingPool);
    if (result.assignedCount === 0) {
      toast.message("No filename matches found. Drag photos from the pool into slots.");
    } else {
      toast.success(`Auto-matched ${result.assignedCount} photo${result.assignedCount === 1 ? "" : "s"}.`);
    }
  }

  function handlePublish() {
    const ready = rows.filter(isBulkDraftRowPublishable);
    if (ready.length === 0) {
      toast.error("Assign Obverse + Reverse photos and fix metadata errors before publishing.");
      return;
    }

    startTransition(async () => {
      try {
        const publishRows: BulkDraftRow[] = [];

        for (let index = 0; index < ready.length; index++) {
          const row = ready[index];
          setProgressMessage(`Uploading images for listing ${index + 1} of ${ready.length}…`);

          const mediaUrls: Partial<Record<MediaSlotId, string>> = {};
          for (const slot of MEDIA_SLOTS) {
            const photo = row.media[slot.id];
            if (!photo?.file) continue;
            mediaUrls[slot.id] = await uploadImageFile(photo.file);
          }

          if (!mediaUrls.obverse || !mediaUrls.reverse) {
            throw new Error(`Row ${row.sourceRow}: Obverse and Reverse uploads are required.`);
          }

          publishRows.push({
            ...row,
            coverImageUrl: mediaUrls.cover || mediaUrls.obverse || "",
            obverseImageUrl: mediaUrls.obverse,
            reverseImageUrl: mediaUrls.reverse,
            slabImageUrl: mediaUrls.slab || "",
            media: emptyRowMedia(),
            fieldErrors: {},
            warnings: [],
          });
        }

        setProgressMessage(`Creating ${publishRows.length} listings…`);

        const response = await fetch("/api/listings/bulk", {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({
            filename: fileName,
            rows: publishRows.map((row) => ({
              ...row,
              mediaUrls: {
                cover: row.coverImageUrl || undefined,
                obverse: row.obverseImageUrl || undefined,
                reverse: row.reverseImageUrl || undefined,
                slab: row.slabImageUrl || undefined,
              },
            })),
          }),
        });

        const payload = (await response.json().catch(() => null)) as
          | {
              success: true;
              data: {
                successCount: number;
                errorCount: number;
                errors: { row: number; message: string }[];
              };
            }
          | { success: false; error: string }
          | null;

        if (!response.ok || !payload || payload.success === false) {
          toast.error(payload && "error" in payload ? payload.error : "Bulk publish failed.");
          setProgressMessage(null);
          return;
        }

        toast.success(
          `Published ${payload.data.successCount} listing${payload.data.successCount === 1 ? "" : "s"}.`,
        );
        if (payload.data.errorCount > 0) {
          toast.message(`${payload.data.errorCount} row(s) could not be published.`);
        }
        setProgressMessage(null);
        router.push("/account/sales");
        router.refresh();
      } catch (error) {
        setProgressMessage(null);
        toast.error(error instanceof Error ? error.message : "Bulk publish failed.");
      }
    });
  }

  const stepIndex = step === "csv" ? 1 : step === "photos" ? 2 : 3;

  return (
    <div className="flex flex-col gap-6">
      <div className="flex flex-wrap items-center justify-between gap-3">
        <div className="flex items-center gap-2">
          {onBack && (
            <Button type="button" variant="ghost" size="sm" onClick={onBack} disabled={isPending}>
              <ArrowLeftIcon className="size-4" aria-hidden />
              Back
            </Button>
          )}
          <div>
            <h2 className="font-heading text-xl font-semibold">Bulk CSV Importer</h2>
            <p className="text-sm text-muted-foreground">
              Step {stepIndex} of 3 — metadata CSV, photo pool, then visual allocation.
            </p>
          </div>
        </div>
        <ol className="flex flex-wrap gap-2 text-xs font-medium">
          {(
            [
              ["csv", "CSV metadata"],
              ["photos", "Photo pool"],
              ["allocate", "Allocate"],
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

      {step === "csv" && (
        <section className="flex flex-col gap-4 rounded-xl border p-6">
          <div className="flex flex-col gap-2 sm:flex-row sm:items-center sm:justify-between">
            <div>
              <h3 className="font-medium">Step 1 — CSV metadata import</h3>
              <p className="text-sm text-muted-foreground">
                Upload title, description, category, price, grade, grading service, and cert number. No image URLs
                needed.
              </p>
            </div>
            <a
              href={templateHref}
              download="mintmark-bulk-listings-template.csv"
              className="inline-flex h-10 items-center justify-center gap-2 rounded-md border px-4 text-sm font-medium hover:bg-muted"
            >
              <DownloadIcon className="size-4" aria-hidden />
              Download CSV template
            </a>
          </div>

          <div
            className={cn(
              "flex flex-col items-center justify-center gap-3 rounded-xl border border-dashed px-6 py-14 text-center transition-colors",
              csvDragging ? "border-amber-500 bg-amber-500/5" : "border-slate-300 dark:border-slate-700",
            )}
            onDragEnter={(event) => {
              event.preventDefault();
              setCsvDragging(true);
            }}
            onDragOver={(event) => {
              event.preventDefault();
              setCsvDragging(true);
            }}
            onDragLeave={(event) => {
              event.preventDefault();
              setCsvDragging(false);
            }}
            onDrop={(event) => {
              event.preventDefault();
              setCsvDragging(false);
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

          {rows.length > 0 && (
            <>
              <div className="flex flex-wrap items-center justify-between gap-3 rounded-lg border bg-muted/40 px-4 py-3 text-sm">
                <p>
                  <span className="font-semibold text-emerald-600">{validMetaCount}</span> valid metadata ·{" "}
                  <span className="font-semibold">{rows.length}</span> rows parsed
                </p>
                <div className="flex gap-2">
                  <Button
                    type="button"
                    variant="outline"
                    size="sm"
                    onClick={() => {
                      setRows([]);
                      setFileName(null);
                    }}
                  >
                    Clear
                  </Button>
                  <Button
                    type="button"
                    size="sm"
                    className="bg-amber-500 text-black hover:bg-amber-400"
                    disabled={validMetaCount === 0}
                    onClick={() => setStep("photos")}
                  >
                    Continue to photo pool
                  </Button>
                </div>
              </div>

              <div className="overflow-x-auto rounded-xl border">
                <table className="min-w-full text-left text-sm">
                  <thead className="bg-slate-950 text-xs tracking-wide text-amber-100 uppercase">
                    <tr>
                      <th className="px-3 py-2">#</th>
                      {METADATA_COLUMNS.map((col) => (
                        <th key={col.key} className="px-3 py-2 whitespace-nowrap">
                          {col.label}
                        </th>
                      ))}
                      <th className="px-3 py-2">Status</th>
                    </tr>
                  </thead>
                  <tbody>
                    {rows.map((row) => {
                      const valid = isBulkDraftRowValid(row);
                      return (
                        <tr
                          key={row.id}
                          className={cn("border-t align-top", !valid && "bg-red-500/5")}
                        >
                          <td className="px-3 py-2 text-xs text-muted-foreground">{row.sourceRow}</td>
                          {METADATA_COLUMNS.map((col) => (
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
                                <p className="mt-0.5 text-[0.65rem] text-destructive">
                                  {row.fieldErrors[col.key]}
                                </p>
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
                          </td>
                        </tr>
                      );
                    })}
                  </tbody>
                </table>
              </div>
            </>
          )}
        </section>
      )}

      {step === "photos" && (
        <section className="flex flex-col gap-4 rounded-xl border p-6">
          <div className="flex flex-wrap items-start justify-between gap-3">
            <div>
              <h3 className="font-medium">Step 2 — Bulk photo pool</h3>
              <p className="text-sm text-muted-foreground">
                Drop all coin photos at once. Filenames like <code className="text-xs">row2_front.jpg</code> or{" "}
                <code className="text-xs">NGC88231_rev.jpg</code> help auto-match later.
              </p>
            </div>
            <div className="flex gap-2">
              <Button type="button" variant="outline" size="sm" onClick={() => setStep("csv")}>
                Back to CSV
              </Button>
              <Button
                type="button"
                size="sm"
                className="bg-amber-500 text-black hover:bg-amber-400"
                onClick={() => {
                  if (photoPool.length > 0) runAutoMatch();
                  setStep("allocate");
                }}
              >
                Continue to allocation
              </Button>
            </div>
          </div>

          <div
            className={cn(
              "flex flex-col items-center justify-center gap-3 rounded-xl border border-dashed px-6 py-16 text-center transition-colors",
              photoDragging ? "border-amber-500 bg-amber-500/5" : "border-slate-300 dark:border-slate-700",
            )}
            onDragEnter={(event) => {
              event.preventDefault();
              setPhotoDragging(true);
            }}
            onDragOver={(event) => {
              event.preventDefault();
              setPhotoDragging(true);
            }}
            onDragLeave={(event) => {
              event.preventDefault();
              setPhotoDragging(false);
            }}
            onDrop={(event) => {
              event.preventDefault();
              setPhotoDragging(false);
              addPhotosToPool(event.dataTransfer.files);
            }}
          >
            <ImagesIcon className="size-12 text-amber-500" aria-hidden />
            <p className="text-base font-semibold">Drag & Drop All Coin Photos Here (JPEG, PNG, WEBP)</p>
            <p className="text-xs text-muted-foreground">Select 20–100 images at once</p>
            <label className="inline-flex cursor-pointer items-center gap-2 rounded-md bg-amber-500 px-4 py-2 text-sm font-semibold text-black hover:bg-amber-400">
              <UploadIcon className="size-4" aria-hidden />
              Choose photos
              <input
                type="file"
                accept={IMAGE_ACCEPT}
                multiple
                className="sr-only"
                onChange={(event) => {
                  if (event.target.files) addPhotosToPool(event.target.files);
                  event.target.value = "";
                }}
              />
            </label>
          </div>

          {photoPool.length > 0 && (
            <div className="flex flex-col gap-3">
              <div className="flex items-center justify-between gap-2">
                <p className="text-sm font-medium">
                  {photoPool.length} photo{photoPool.length === 1 ? "" : "s"} in pool
                </p>
                <Button type="button" variant="ghost" size="sm" onClick={clearPool}>
                  Clear pool
                </Button>
              </div>
              <div className="grid grid-cols-3 gap-2 sm:grid-cols-5 md:grid-cols-8">
                {photoPool.map((photo) => (
                  <div key={photo.id} className="group relative overflow-hidden rounded-md border bg-muted">
                    {/* eslint-disable-next-line @next/next/no-img-element */}
                    <img src={photo.previewUrl} alt={photo.name} className="aspect-square w-full object-cover" />
                    <button
                      type="button"
                      className="absolute top-1 right-1 rounded-full bg-black/70 p-0.5 text-white opacity-0 transition-opacity group-hover:opacity-100"
                      onClick={() => removeFromPool(photo.id)}
                      aria-label={`Remove ${photo.name}`}
                    >
                      <XIcon className="size-3" />
                    </button>
                    <p className="truncate px-1 py-0.5 text-[0.6rem] text-muted-foreground">{photo.name}</p>
                  </div>
                ))}
              </div>
            </div>
          )}
        </section>
      )}

      {step === "allocate" && (
        <section className="flex flex-col gap-4 pb-48 lg:flex-row lg:items-start lg:pb-0">
          <div className="flex min-w-0 flex-1 flex-col gap-4">
            <div className="flex flex-wrap items-start justify-between gap-3 rounded-xl border bg-muted/30 px-4 py-3">
              <div>
                <h3 className="font-medium">Step 3 — Visual media allocation</h3>
                <p className="text-sm text-muted-foreground">
                  Drag from the photo pool or click an empty slot. Green rows have Obverse + Reverse.
                </p>
                <p className="mt-1 text-sm">
                  <span className="font-semibold text-emerald-600">{completePhotoCount}</span> complete ·{" "}
                  <span className="font-semibold text-amber-600">{rows.length - completePhotoCount}</span> incomplete ·{" "}
                  <span className="font-semibold">{photoPool.length}</span> unassigned
                </p>
              </div>
              <div className="flex flex-wrap gap-2">
                <Button type="button" variant="outline" size="sm" onClick={() => setStep("photos")} disabled={isPending}>
                  Back to photos
                </Button>
                <Button
                  type="button"
                  variant="outline"
                  size="sm"
                  onClick={runAutoMatch}
                  disabled={isPending || photoPool.length === 0}
                >
                  <SparklesIcon className="size-3.5" aria-hidden />
                  Re-run auto-match
                </Button>
                <Button
                  type="button"
                  size="sm"
                  className="bg-amber-500 font-bold text-black hover:bg-amber-400"
                  disabled={isPending || publishableCount === 0}
                  onClick={handlePublish}
                >
                  {isPending && <Loader2Icon className="animate-spin" aria-hidden />}
                  Publish All ({publishableCount} Items)
                </Button>
              </div>
            </div>

            {progressMessage && (
              <div className="flex items-center gap-2 rounded-lg border border-amber-500/40 bg-amber-500/10 px-4 py-3 text-sm">
                <Loader2Icon className="size-4 animate-spin text-amber-600" aria-hidden />
                {progressMessage}
              </div>
            )}

            <div className="overflow-x-auto rounded-xl border">
              <table className="min-w-full text-left text-sm">
                <thead className="bg-slate-950 text-xs tracking-wide text-amber-100 uppercase">
                  <tr>
                    <th className="px-3 py-2">#</th>
                    <th className="px-3 py-2">Title</th>
                    <th className="px-3 py-2">Cert</th>
                    <th className="px-3 py-2">Media assignment</th>
                    <th className="px-3 py-2">Status</th>
                  </tr>
                </thead>
                <tbody>
                  {rows.map((row) => {
                    const status = rowPhotoStatus(row);
                    const metaOk = isBulkDraftRowValid(row);
                    return (
                      <tr
                        key={row.id}
                        className={cn(
                          "border-t align-top transition-colors",
                          status === "complete" && metaOk && "bg-emerald-500/10",
                          (status === "incomplete" || status === "empty" || !metaOk) && "bg-amber-500/10",
                        )}
                      >
                        <td className="px-3 py-3 text-xs text-muted-foreground">{row.sourceRow}</td>
                        <td className="max-w-[14rem] px-3 py-3">
                          <p className="font-medium line-clamp-2">{row.title || "Untitled"}</p>
                          <p className="text-xs text-muted-foreground">
                            {row.category} · R{row.priceRands}
                          </p>
                        </td>
                        <td className="px-3 py-3 text-xs">
                          {row.gradingCompany || "—"}
                          {row.certificateId ? (
                            <span className="mt-0.5 block text-muted-foreground">{row.certificateId}</span>
                          ) : null}
                        </td>
                        <td className="px-3 py-3">
                          <div className="flex flex-wrap gap-2">
                            {MEDIA_SLOTS.map((slot) => {
                              const assigned = row.media[slot.id];
                              const isOver =
                                dragOverSlot?.rowId === row.id && dragOverSlot.slot === slot.id;
                              const pickerOpen =
                                slotPicker?.rowId === row.id && slotPicker.slot === slot.id;
                              return (
                                <div key={slot.id} className="relative flex w-[4.5rem] flex-col gap-1">
                                  <span className="text-[0.6rem] font-medium tracking-wide text-muted-foreground uppercase">
                                    {slot.label}
                                    {slot.required ? " *" : ""}
                                  </span>
                                  <div
                                    className={cn(
                                      "relative flex aspect-square items-center justify-center overflow-hidden rounded-md border bg-background",
                                      isOver && "border-amber-500 ring-2 ring-amber-500/40",
                                      !assigned && "border-dashed",
                                    )}
                                    onDragOver={(event) => {
                                      event.preventDefault();
                                      setDragOverSlot({ rowId: row.id, slot: slot.id });
                                    }}
                                    onDragLeave={() => setDragOverSlot(null)}
                                    onDrop={(event) => {
                                      event.preventDefault();
                                      setDragOverSlot(null);
                                      const photoId = event.dataTransfer.getData("text/photo-id");
                                      const photo = photoPool.find((item) => item.id === photoId);
                                      if (photo) assignPhotoToSlot(row.id, slot.id, photo);
                                    }}
                                  >
                                    {assigned ? (
                                      <>
                                        {/* eslint-disable-next-line @next/next/no-img-element */}
                                        <img
                                          src={assigned.previewUrl}
                                          alt={assigned.name}
                                          className="size-full object-cover"
                                        />
                                        <button
                                          type="button"
                                          className="absolute top-0.5 right-0.5 rounded-full bg-black/70 p-0.5 text-white"
                                          onClick={() => clearSlot(row.id, slot.id)}
                                          aria-label={`Clear ${slot.label}`}
                                        >
                                          <XIcon className="size-2.5" />
                                        </button>
                                      </>
                                    ) : (
                                      <button
                                        type="button"
                                        className="flex size-full flex-col items-center justify-center gap-0.5 text-muted-foreground hover:bg-muted/60"
                                        onClick={() => setSlotPicker({ rowId: row.id, slot: slot.id })}
                                      >
                                        <ImagePlusIcon className="size-4" aria-hidden />
                                        <span className="text-[0.55rem]">Assign</span>
                                      </button>
                                    )}
                                  </div>
                                  {pickerOpen && (
                                    <div
                                      ref={pickerRef}
                                      className="absolute top-full left-0 z-30 mt-1 w-56 rounded-lg border bg-background p-2 shadow-lg"
                                    >
                                      <p className="mb-2 text-[0.65rem] font-medium text-muted-foreground">
                                        Unassigned photos
                                      </p>
                                      {photoPool.length === 0 ? (
                                        <p className="text-xs text-muted-foreground">Pool is empty.</p>
                                      ) : (
                                        <div className="grid max-h-48 grid-cols-3 gap-1 overflow-y-auto">
                                          {photoPool.map((photo) => (
                                            <button
                                              key={photo.id}
                                              type="button"
                                              className="overflow-hidden rounded border hover:ring-2 hover:ring-amber-500"
                                              onClick={() => assignPhotoToSlot(row.id, slot.id, photo)}
                                              title={photo.name}
                                            >
                                              {/* eslint-disable-next-line @next/next/no-img-element */}
                                              <img
                                                src={photo.previewUrl}
                                                alt={photo.name}
                                                className="aspect-square w-full object-cover"
                                              />
                                            </button>
                                          ))}
                                        </div>
                                      )}
                                    </div>
                                  )}
                                </div>
                              );
                            })}
                          </div>
                        </td>
                        <td className="px-3 py-3 text-xs">
                          {!metaOk ? (
                            <span className="text-destructive">Fix metadata</span>
                          ) : status === "complete" ? (
                            <span className="inline-flex items-center gap-1 text-emerald-700 dark:text-emerald-400">
                              <CheckCircle2Icon className="size-3.5" aria-hidden />
                              Ready
                            </span>
                          ) : (
                            <span className="text-amber-700 dark:text-amber-400">Needs Obverse + Reverse</span>
                          )}
                        </td>
                      </tr>
                    );
                  })}
                </tbody>
              </table>
            </div>
          </div>

          <aside className="fixed right-3 bottom-3 z-20 flex max-h-[40vh] w-[min(100%,16rem)] flex-col rounded-xl border bg-background shadow-xl lg:sticky lg:top-24 lg:max-h-[calc(100vh-8rem)] lg:w-60 lg:shrink-0 lg:shadow-md">
            <div className="flex items-center justify-between border-b px-3 py-2">
              <p className="text-sm font-semibold">Photo pool</p>
              <span className="text-xs text-muted-foreground">{photoPool.length}</span>
            </div>
            <div className="flex-1 space-y-2 overflow-y-auto p-2">
              {photoPool.length === 0 ? (
                <p className="px-1 py-6 text-center text-xs text-muted-foreground">
                  All photos assigned. Add more from step 2 if needed.
                </p>
              ) : (
                photoPool.map((photo) => (
                  <div
                    key={photo.id}
                    draggable
                    onDragStart={(event) => {
                      event.dataTransfer.setData("text/photo-id", photo.id);
                      event.dataTransfer.effectAllowed = "move";
                    }}
                    className="flex cursor-grab items-center gap-2 rounded-md border bg-muted/40 p-1.5 active:cursor-grabbing"
                    title={`Drag to assign: ${photo.name}`}
                  >
                    {/* eslint-disable-next-line @next/next/no-img-element */}
                    <img
                      src={photo.previewUrl}
                      alt={photo.name}
                      className="size-10 shrink-0 rounded object-cover"
                    />
                    <p className="truncate text-[0.65rem] leading-tight">{photo.name}</p>
                  </div>
                ))
              )}
            </div>
            <div className="border-t p-2">
              <label className="flex cursor-pointer items-center justify-center gap-1 rounded-md border border-dashed px-2 py-2 text-xs hover:border-amber-500">
                <UploadIcon className="size-3.5" aria-hidden />
                Add more
                <input
                  type="file"
                  accept={IMAGE_ACCEPT}
                  multiple
                  className="sr-only"
                  onChange={(event) => {
                    if (event.target.files) addPhotosToPool(event.target.files);
                    event.target.value = "";
                  }}
                />
              </label>
            </div>
          </aside>
        </section>
      )}
    </div>
  );
}
