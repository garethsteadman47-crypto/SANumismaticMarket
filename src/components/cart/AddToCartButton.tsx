"use client";

import { ShoppingCartIcon } from "lucide-react";
import { toast } from "sonner";

import { Button } from "@/components/ui/button";
import { useCart } from "@/components/cart/CartProvider";

export function AddToCartButton({
  listingId,
  title,
  priceCents,
  image,
  disabled,
}: {
  listingId: string;
  title: string;
  priceCents: number;
  image: string | null;
  disabled?: boolean;
}) {
  const { addItem } = useCart();

  function handleClick() {
    const added = addItem({ listingId, title, priceCents, image });
    if (added) {
      toast.success("Added to cart.");
    } else {
      toast.info("This item is already in your cart.");
    }
  }

  return (
    <Button type="button" size="lg" variant="secondary" disabled={disabled} onClick={handleClick}>
      <ShoppingCartIcon />
      Add to Cart
    </Button>
  );
}
