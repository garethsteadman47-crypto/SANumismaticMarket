"use client";

import { useState, useTransition } from "react";
import { BookmarkIcon, Loader2Icon } from "lucide-react";
import { toast } from "sonner";

import { Button } from "@/components/ui/button";
import { toggleWishlistAction } from "@/actions/wishlist";
import { cn } from "@/lib/utils";

export function WishlistToggle({
  listingId,
  initialWishlisted = false,
  className,
}: {
  listingId: string;
  initialWishlisted?: boolean;
  className?: string;
}) {
  const [wishlisted, setWishlisted] = useState(initialWishlisted);
  const [isPending, startTransition] = useTransition();

  function handleClick(event: React.MouseEvent) {
    event.preventDefault();
    event.stopPropagation();
    startTransition(async () => {
      const result = await toggleWishlistAction(listingId);
      if (!result.success) {
        toast.error(result.error);
        return;
      }
      setWishlisted(result.wishlisted);
      toast.success(result.wishlisted ? "Saved to wishlist" : "Removed from wishlist");
    });
  }

  return (
    <Button
      type="button"
      size="icon-sm"
      variant="secondary"
      className={cn("rounded-full bg-white/90 shadow-sm backdrop-blur dark:bg-slate-900/90", className)}
      onClick={handleClick}
      disabled={isPending}
      aria-label={wishlisted ? "Remove from wishlist" : "Save to wishlist"}
      aria-pressed={wishlisted}
    >
      {isPending ? (
        <Loader2Icon className="size-3.5 animate-spin" />
      ) : (
        <BookmarkIcon className={cn("size-3.5", wishlisted && "fill-amber-500 text-amber-600")} />
      )}
    </Button>
  );
}
