"use client";

import { createContext, useCallback, useContext, useMemo, useSyncExternalStore } from "react";

/**
 * Lightweight, client-only "Add to Cart" convenience feature.
 *
 * There's no multi-item cart checkout in this app — every purchase still
 * goes through the existing per-listing escrow checkout flow. This cart is
 * just a saved-for-later list (persisted to `localStorage`) so the "Add to
 * Cart" button on the PDP has somewhere real to put items; the `/cart` page
 * links each item back to its own individual checkout.
 *
 * Uses `useSyncExternalStore` (rather than `useState` + `useEffect`) to read
 * this external, mutable store — the officially recommended pattern for
 * exactly this case, and it avoids both a hydration mismatch (via
 * `getServerSnapshot`) and the "don't setState synchronously in an effect"
 * lint rule that a naive `useEffect(() => setItems(...), [])` would trip.
 */

export interface CartItem {
  listingId: string;
  title: string;
  priceCents: number;
  image: string | null;
  addedAt: string;
}

const STORAGE_KEY = "coinvault:cart";

type Listener = () => void;
const listeners = new Set<Listener>();
let cachedSnapshot: CartItem[] | null = null;

function readStoredCart(): CartItem[] {
  try {
    const raw = window.localStorage.getItem(STORAGE_KEY);
    if (!raw) return [];
    const parsed = JSON.parse(raw);
    return Array.isArray(parsed) ? parsed : [];
  } catch {
    return [];
  }
}

function getSnapshot(): CartItem[] {
  if (cachedSnapshot === null) {
    cachedSnapshot = readStoredCart();
  }
  return cachedSnapshot;
}

// `useSyncExternalStore` requires `getServerSnapshot` to return the exact
// same reference on every call — a fresh `[]` literal each time trips
// React's "should be cached to avoid an infinite loop" warning.
const EMPTY_CART: CartItem[] = [];

function getServerSnapshot(): CartItem[] {
  return EMPTY_CART;
}

function subscribe(listener: Listener): () => void {
  listeners.add(listener);
  window.addEventListener("storage", listener);
  return () => {
    listeners.delete(listener);
    window.removeEventListener("storage", listener);
  };
}

function writeCart(items: CartItem[]): void {
  cachedSnapshot = items;
  window.localStorage.setItem(STORAGE_KEY, JSON.stringify(items));
  listeners.forEach((listener) => listener());
}

interface CartContextValue {
  items: CartItem[];
  addItem: (item: Omit<CartItem, "addedAt">) => boolean;
  removeItem: (listingId: string) => void;
  clear: () => void;
}

const CartContext = createContext<CartContextValue | null>(null);

export function CartProvider({ children }: { children: React.ReactNode }) {
  const items = useSyncExternalStore(subscribe, getSnapshot, getServerSnapshot);

  const addItem = useCallback((item: Omit<CartItem, "addedAt">) => {
    const current = getSnapshot();
    if (current.some((existing) => existing.listingId === item.listingId)) {
      return false;
    }
    writeCart([...current, { ...item, addedAt: new Date().toISOString() }]);
    return true;
  }, []);

  const removeItem = useCallback((listingId: string) => {
    writeCart(getSnapshot().filter((item) => item.listingId !== listingId));
  }, []);

  const clear = useCallback(() => writeCart([]), []);

  const value = useMemo(() => ({ items, addItem, removeItem, clear }), [items, addItem, removeItem, clear]);

  return <CartContext.Provider value={value}>{children}</CartContext.Provider>;
}

export function useCart(): CartContextValue {
  const ctx = useContext(CartContext);
  if (!ctx) {
    throw new Error("useCart must be used within a CartProvider");
  }
  return ctx;
}
