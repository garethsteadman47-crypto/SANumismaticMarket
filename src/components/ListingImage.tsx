"use client";

import Image from "next/image";
import { ImageOffIcon } from "lucide-react";

import { isDataImageUrl } from "@/lib/listing-media";
import { cn } from "@/lib/utils";

type ListingImageProps = {
  src: string | null | undefined;
  alt: string;
  fill?: boolean;
  width?: number;
  height?: number;
  sizes?: string;
  priority?: boolean;
  className?: string;
  /** Wrapper class when using fill mode (needs a positioned parent). */
};

/**
 * Renders listing photos from either remote HTTPS URLs or `data:image` base64
 * strings persisted in MongoDB. next/image cannot optimize data URLs, so those
 * fall back to a plain <img>.
 */
export function ListingImage({
  src,
  alt,
  fill = false,
  width,
  height,
  sizes,
  priority,
  className,
}: ListingImageProps) {
  if (!src) {
    return (
      <div className={cn("flex items-center justify-center bg-muted text-muted-foreground", fill && "absolute inset-0 size-full", className)}>
        <ImageOffIcon className="size-8" aria-hidden />
      </div>
    );
  }

  if (isDataImageUrl(src) || src.startsWith("blob:")) {
    return (
      // eslint-disable-next-line @next/next/no-img-element -- data/blob URLs are not supported by next/image optimization
      <img
        src={src}
        alt={alt}
        className={cn(fill && "absolute inset-0 size-full", className)}
        loading={priority ? "eager" : "lazy"}
      />
    );
  }

  if (fill) {
    return (
      <Image
        src={src}
        alt={alt}
        fill
        sizes={sizes}
        priority={priority}
        className={className}
        unoptimized={false}
      />
    );
  }

  return (
    <Image
      src={src}
      alt={alt}
      width={width ?? 400}
      height={height ?? 400}
      sizes={sizes}
      priority={priority}
      className={className}
    />
  );
}
