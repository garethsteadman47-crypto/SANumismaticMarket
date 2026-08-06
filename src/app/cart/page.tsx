"use client";

import Link from "next/link";
import { ImageOffIcon, ShoppingCartIcon, Trash2Icon } from "lucide-react";

import { Button } from "@/components/ui/button";
import { Card, CardContent } from "@/components/ui/card";
import { ListingImage } from "@/components/ListingImage";
import { useCart } from "@/components/cart/CartProvider";
import { formatZarCents } from "@/lib/utils/currency";

export default function CartPage() {
  const { items, removeItem, clear } = useCart();

  if (items.length === 0) {
    return (
      <main className="mx-auto flex w-full max-w-2xl flex-col items-center gap-3 px-4 py-16 text-center">
        <ShoppingCartIcon className="size-10 text-muted-foreground" />
        <h1 className="text-xl font-semibold">Your cart is empty</h1>
        <p className="text-sm text-muted-foreground">Browse our collection and add items you&apos;re interested in.</p>
        <Button type="button" nativeButton={false} render={<Link href="/listings" />}>
          Buy Coins
        </Button>
      </main>
    );
  }

  return (
    <main className="mx-auto flex w-full max-w-2xl flex-col gap-6 px-4 py-10">
      <div className="flex items-center justify-between">
        <h1 className="text-2xl font-semibold">Your Cart</h1>
        <Button type="button" variant="ghost" size="sm" onClick={clear}>
          Clear cart
        </Button>
      </div>

      <p className="text-sm text-muted-foreground">
        Each item purchases individually through its own secure checkout — select &quot;Buy Now&quot; on an item
        below when you&apos;re ready.
      </p>

      <div className="flex flex-col gap-3">
        {items.map((item) => (
          <Card key={item.listingId}>
            <CardContent className="flex items-center gap-4">
              <div className="relative size-16 shrink-0 overflow-hidden rounded-md bg-muted">
                {item.image ? (
                  <ListingImage src={item.image} alt={item.title} fill className="object-cover" />
                ) : (
                  <div className="flex h-full items-center justify-center text-muted-foreground">
                    <ImageOffIcon className="size-5" />
                  </div>
                )}
              </div>
              <div className="flex flex-1 flex-col gap-1">
                <Link href={`/listings/${item.listingId}`} className="font-medium hover:underline">
                  {item.title}
                </Link>
                <span className="text-sm text-muted-foreground">{formatZarCents(item.priceCents)}</span>
              </div>
              <Button type="button" size="sm" nativeButton={false} render={<Link href={`/checkout/${item.listingId}`} />}>
                Buy Now
              </Button>
              <Button
                type="button"
                variant="ghost"
                size="icon-sm"
                aria-label="Remove from cart"
                onClick={() => removeItem(item.listingId)}
              >
                <Trash2Icon />
              </Button>
            </CardContent>
          </Card>
        ))}
      </div>
    </main>
  );
}
