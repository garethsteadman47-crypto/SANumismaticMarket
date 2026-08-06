"use client";

import { useId, useRef, useState } from "react";
import { ImagePlusIcon, LinkIcon, UploadIcon, XIcon } from "lucide-react";

import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import {
  createEmptyMediaSlot,
  mediaSlotDisplayUrl,
  revokeMediaPreview,
  type ListingMediaSlotId,
  type MediaSlotState,
} from "@/lib/listing-media";
import { cn } from "@/lib/utils";

function isHttpUrl(value: string): boolean {
  return /^https?:\/\//i.test(value.trim());
}

/**
 * Fully controlled media slot — parent owns file / previewUrl / remoteUrl keyed by slot id.
 * Never indexes into a shared File[] array, so Cover/Obverse/Reverse/Slab cannot swap previews.
 */
export function MediaImageSlot({
  slotId,
  label,
  value,
  onChange,
}: {
  slotId: ListingMediaSlotId;
  label: string;
  value: MediaSlotState;
  onChange: (next: MediaSlotState) => void;
}) {
  const inputId = useId();
  const fileInputRef = useRef<HTMLInputElement>(null);
  const [dragging, setDragging] = useState(false);
  const [broken, setBroken] = useState(false);

  const previewSrc = mediaSlotDisplayUrl(value);

  function applyFile(file: File | undefined) {
    if (!file || !file.type.startsWith("image/")) return;
    const objectUrl = URL.createObjectURL(file);
    revokeMediaPreview(value.previewUrl);
    setBroken(false);
    onChange({
      file,
      previewUrl: objectUrl,
      remoteUrl: null,
    });
  }

  function handleUrlChange(raw: string) {
    const trimmed = raw.trim();
    revokeMediaPreview(value.previewUrl);
    setBroken(false);
    onChange({
      file: null,
      previewUrl: isHttpUrl(trimmed) ? trimmed : null,
      remoteUrl: trimmed || null,
    });
  }

  function clear() {
    revokeMediaPreview(value.previewUrl);
    setBroken(false);
    onChange(createEmptyMediaSlot());
    if (fileInputRef.current) fileInputRef.current.value = "";
  }

  return (
    <div
      data-media-slot={slotId}
      className={cn(
        "flex flex-col gap-3 rounded-lg border border-dashed p-4 transition-colors",
        dragging
          ? "border-amber-500 bg-amber-500/5"
          : "border-slate-300 bg-slate-50/50 dark:border-slate-700 dark:bg-slate-950/40",
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
        applyFile(event.dataTransfer.files?.[0]);
      }}
    >
      <div className="flex items-start justify-between gap-3">
        <Label htmlFor={`media-url-${slotId}`} className="flex items-center gap-2">
          <ImagePlusIcon className="size-4 text-muted-foreground" />
          {label}
        </Label>
        {previewSrc && (
          <button
            type="button"
            onClick={clear}
            className="inline-flex items-center gap-1 text-xs text-muted-foreground hover:text-foreground"
          >
            <XIcon className="size-3.5" aria-hidden />
            Clear
          </button>
        )}
      </div>

      <div className="grid gap-3 sm:grid-cols-[120px_1fr]">
        <button
          type="button"
          onClick={() => fileInputRef.current?.click()}
          className="relative flex aspect-square items-center justify-center overflow-hidden rounded-md border border-slate-200 bg-white dark:border-slate-700 dark:bg-slate-900"
          aria-label={`Upload or preview ${label}`}
        >
          {previewSrc && !broken ? (
            // eslint-disable-next-line @next/next/no-img-element
            <img
              src={previewSrc}
              alt={`${label} preview`}
              className="size-full object-cover"
              onError={() => setBroken(true)}
              onLoad={() => setBroken(false)}
            />
          ) : (
            <div className="flex flex-col items-center gap-1 px-2 text-center text-xs text-muted-foreground">
              <UploadIcon className="size-5" aria-hidden />
              <span>Drop image or click</span>
            </div>
          )}
        </button>

        <div className="flex flex-col gap-2">
          <input
            ref={fileInputRef}
            id={inputId}
            type="file"
            accept="image/*"
            className="sr-only"
            onChange={(event) => {
              applyFile(event.target.files?.[0]);
              // Allow re-selecting the same file for this slot.
              event.target.value = "";
            }}
          />

          <Label
            htmlFor={`media-url-${slotId}`}
            className="flex items-center gap-1.5 text-xs font-medium text-muted-foreground"
          >
            <LinkIcon className="size-3.5" aria-hidden />
            Or paste an image URL (e.g., from Imgur, your website, or a grading database).
          </Label>
          <Input
            id={`media-url-${slotId}`}
            type="url"
            value={value.remoteUrl ?? ""}
            onChange={(event) => handleUrlChange(event.target.value)}
            placeholder="https://…"
          />
          {value.file && (
            <p className="text-[0.7rem] text-amber-700 dark:text-amber-400">
              Local file ready for {label}. Paste a public URL above to publish that image instead of a placeholder.
            </p>
          )}
          {broken && value.remoteUrl && isHttpUrl(value.remoteUrl) && (
            <p className="text-[0.7rem] text-destructive">Could not load that image URL — check the link.</p>
          )}
        </div>
      </div>
    </div>
  );
}
