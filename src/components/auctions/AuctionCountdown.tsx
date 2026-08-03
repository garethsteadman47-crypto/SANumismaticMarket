"use client";

import { useEffect, useState } from "react";
import { TimerIcon } from "lucide-react";

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

/** Live-ticking countdown to a target timestamp — used for auction end times (and, if in the future, start times). */
export function AuctionCountdown({ targetIso, label }: { targetIso: string; label?: string }) {
  const [now, setNow] = useState(() => Date.now());

  useEffect(() => {
    const interval = setInterval(() => setNow(Date.now()), 1000);
    return () => clearInterval(interval);
  }, []);

  const remainingMs = new Date(targetIso).getTime() - now;
  const isUrgent = remainingMs > 0 && remainingMs < 60 * 60 * 1000;

  return (
    <span className={`flex items-center gap-1 text-sm font-medium ${isUrgent ? "text-destructive" : ""}`}>
      <TimerIcon className="size-3.5" />
      {label ?? ""} {formatRemaining(remainingMs)}
    </span>
  );
}
