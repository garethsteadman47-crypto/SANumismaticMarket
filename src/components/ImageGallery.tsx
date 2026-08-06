"use client";

import { useState } from "react";
import { ImageOffIcon } from "lucide-react";

import { ListingImage } from "@/components/ListingImage";
import { cn } from "@/lib/utils";

export function ImageGallery({ images, title }: { images: string[]; title: string }) {
  const [activeIndex, setActiveIndex] = useState(0);

  if (images.length === 0) {
    return (
      <div className="flex aspect-square w-full items-center justify-center rounded-lg bg-slate-900/60 text-muted-foreground">
        <ImageOffIcon className="size-10" />
      </div>
    );
  }

  return (
    <div className="flex flex-col gap-3">
      <div className="aspect-square bg-slate-900/60 rounded-lg relative overflow-hidden p-2">
        <div className="relative size-full">
          <ListingImage
            src={images[activeIndex]}
            alt={title}
            fill
            priority
            sizes="(min-width: 1024px) 40vw, 90vw"
            className="object-contain w-full h-full"
          />
        </div>
      </div>
      {images.length > 1 && (
        <div className="flex gap-2 overflow-x-auto">
          {images.map((src, index) => (
            <button
              key={`${index}-${src.slice(0, 48)}`}
              type="button"
              onClick={() => setActiveIndex(index)}
              className={cn(
                "aspect-square relative size-16 shrink-0 overflow-hidden rounded-md border-2 bg-slate-900/60 p-1 transition-colors",
                index === activeIndex ? "border-primary" : "border-transparent"
              )}
              aria-label={`View photo ${index + 1}`}
            >
              <ListingImage src={src} alt="" fill className="object-contain w-full h-full" />
            </button>
          ))}
        </div>
      )}
    </div>
  );
}
