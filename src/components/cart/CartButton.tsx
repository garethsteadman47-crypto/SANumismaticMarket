"use client";

import Link from "next/link";
import { ShoppingCartIcon } from "lucide-react";

import { Button } from "@/components/ui/button";
import { useCart } from "@/components/cart/CartProvider";

export function CartButton() {
  const { items } = useCart();

  return (
    <Button type="button" variant="ghost" size="icon" className="relative" nativeButton={false} render={<Link href="/cart" />}>
      <ShoppingCartIcon />
      {items.length > 0 && (
        <span className="absolute -top-1 -right-1 flex size-4 items-center justify-center rounded-full bg-amber-500 text-[0.6rem] font-semibold text-white">
          {items.length > 9 ? "9+" : items.length}
        </span>
      )}
      <span className="sr-only">Cart</span>
    </Button>
  );
}
