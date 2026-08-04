"use client";

import { useCallback, useId, useRef, useState } from "react";
import { ImagePlusIcon, LinkIcon, UploadIcon, XIcon } from "lucide-react";

import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { cn } from "@/lib/utils";

function isHttpUrl(value: string): boolean {
  return /^https?:\/\//i.test(value.trim());
}

/**
 * Media slot for the listing wizard — supports drag-and-drop files (local preview)
 * and pasteable image URLs with an instant thumbnail.
 */
export function MediaImageSlot({
  id,
  label,
  value,
  onChange,
}: {
  id: string;
  label: string;
  value: string;
  onChange: (url: string) => void;
}) {
  const inputId = useId();
  const fileInputRef = useRef<HTMLInputElement>(null);
  const [dragging, setDragging] = useState(false);
  const [localPreview, setLocalPreview] = useState<string | null>(null);
  const [broken, setBroken] = useState(false);

  const previewSrc = localPreview || (isHttpUrl(value) ? value : value.startsWith("blob:") ? value : "");

  const applyFile = useCallback(
    (file: File | undefined) => {
      if (!file || !file.type.startsWith("image/")) return;
      const objectUrl = URL.createObjectURL(file);
      setLocalPreview((prev) => {
        if (prev?.startsWith("blob:")) URL.revokeObjectURL(prev);
        return objectUrl;
      });
      setBroken(false);
      // Keep a usable URL in state for preview; publish step remaps blob: to a CDN placeholder.
      onChange(objectUrl);
    },
    [onChange],
  );

  function handleUrlChange(raw: string) {
    setLocalPreview(null);
    setBroken(false);
    onChange(raw);
  }

  function clear() {
    if (localPreview?.startsWith("blob:")) URL.revokeObjectURL(localPreview);
    setLocalPreview(null);
    setBroken(false);
    onChange("");
    if (fileInputRef.current) fileInputRef.current.value = "";
  }

  return (
    <div
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
        <Label htmlFor={id} className="flex items-center gap-2">
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
            onChange={(event) => applyFile(event.target.files?.[0])}
          />

          <Label htmlFor={id} className="flex items-center gap-1.5 text-xs font-medium text-muted-foreground">
            <LinkIcon className="size-3.5" aria-hidden />
            Or paste an image URL (e.g., from Imgur, your website, or a grading database).
          </Label>
          <Input
            id={id}
            type="url"
            value={value.startsWith("blob:") ? "" : value}
            onChange={(event) => handleUrlChange(event.target.value)}
            placeholder="https://…"
          />
          {value.startsWith("blob:") && (
            <p className="text-[0.7rem] text-amber-700 dark:text-amber-400">
              Local file preview ready. Paste a public URL above to use that image when publishing.
            </p>
          )}
          {broken && isHttpUrl(value) && (
            <p className="text-[0.7rem] text-destructive">Could not load that image URL — check the link.</p>
          )}
        </div>
      </div>
    </div>
  );
}
