"use client";

import { useEffect, useState } from "react";
import { TimerIcon } from "lucide-react";

import { cn } from "@/lib/utils";

function formatRemaining(ms: number): string {
  if (ms <= 0) return "Ended";
  const totalSeconds = Math.floor(ms / 1000);
  const days = Math.floor(totalSeconds / 86400);
  const hours = Math.floor((totalSeconds % 86400) / 3600);
  const minutes = Math.floor((totalSeconds % 3600) / 60);
  const seconds = totalSeconds % 60;

  if (days > 0) return `${days}d ${hours}h ${minutes}m`;
  if (hours > 0) return `${hours}h ${minutes}m ${seconds}s`;
  return `${minutes}m ${seconds}s`;
}

export type CountdownUrgency = "normal" | "amber" | "critical" | "ended";

export function getCountdownUrgency(remainingMs: number): CountdownUrgency {
  if (remainingMs <= 0) return "ended";
  if (remainingMs < 60 * 60 * 1000) return "critical";
  if (remainingMs < 24 * 60 * 60 * 1000) return "amber";
  return "normal";
}

/** Live-ticking countdown with urgency colours for auction end (or start) times. */
export function AuctionCountdown({
  targetIso,
  label,
  className,
  prominent = false,
  /** Use light-on-dark colours (for slate/black panels). Avoids black `text-foreground` on dark backgrounds. */
  onDark = false,
}: {
  targetIso: string;
  label?: string;
  className?: string;
  /** Larger type for cards / status banners. */
  prominent?: boolean;
  onDark?: boolean;
}) {
  const [now, setNow] = useState(() => Date.now());

  useEffect(() => {
    const interval = setInterval(() => setNow(Date.now()), 1000);
    return () => clearInterval(interval);
  }, []);

  const remainingMs = new Date(targetIso).getTime() - now;
  const urgency = getCountdownUrgency(remainingMs);
  const text = formatRemaining(remainingMs);

  return (
    <span
      className={cn(
        "inline-flex items-center gap-1.5 font-medium",
        prominent ? "text-sm sm:text-base" : "text-sm",
        // Default / light surfaces
        !onDark && urgency === "normal" && "text-foreground",
        !onDark && urgency === "amber" && "text-amber-600",
        !onDark && urgency === "critical" && "animate-pulse text-red-600",
        !onDark && urgency === "ended" && "text-muted-foreground",
        // Dark panels (current-bid banner, ticker, etc.)
        onDark && urgency === "normal" && "text-white",
        onDark && urgency === "amber" && "text-amber-300 [text-shadow:0_0_12px_rgba(252,211,77,0.35)]",
        onDark && urgency === "critical" && "animate-pulse text-red-300",
        onDark && urgency === "ended" && "text-slate-400",
        className,
      )}
    >
      <TimerIcon className={cn("shrink-0", prominent ? "size-4" : "size-3.5")} aria-hidden />
      <span>
        {label ? `${label} ${text}` : text}
      </span>
    </span>
  );
}
