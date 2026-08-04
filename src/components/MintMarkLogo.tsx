/**
 * MintMark brand mark: a sleek, geometric gold coin disc with a bold,
 * minimalist "M" cut into it as negative space (rendered by matching the
 * app's background color rather than a true SVG mask, so it stays crisp
 * and trivially theme-aware via Tailwind's `dark:` variant). The right leg
 * of the "M" resolves into a small checkmark flick — a subtle "Verified"
 * cue integrated directly into the letterform rather than a separate badge.
 */
export function MintMarkLogo({ className, size = 28 }: { className?: string; size?: number }) {
  return (
    <svg
      viewBox="0 0 48 48"
      width={size}
      height={size}
      className={className}
      role="img"
      aria-label="MintMark logo"
    >
      <defs>
        <linearGradient id="mintmark-gold" x1="0%" y1="0%" x2="100%" y2="100%">
          <stop offset="0%" stopColor="#fcd34d" />
          <stop offset="50%" stopColor="#f59e0b" />
          <stop offset="100%" stopColor="#b45309" />
        </linearGradient>
      </defs>

      {/* The struck-coin disc — gold gradient, matching the "text-amber-500 or gold gradient" spec. */}
      <circle cx="24" cy="24" r="21" fill="url(#mintmark-gold)" className="text-amber-500" />
      <circle cx="24" cy="24" r="21" fill="none" stroke="#92400e" strokeOpacity="0.35" strokeWidth="1" />
      <circle cx="24" cy="24" r="17" fill="none" stroke="#fef3c7" strokeOpacity="0.5" strokeWidth="1" />

      {/*
        Negative-space "M": drawn as a background-colored stroke so it
        reads as if punched through the coin. `fill-*`/`stroke-*` here
        follow the page background (white in light mode, slate-950 in
        dark mode) via Tailwind's `dark:` variant — no JS theme detection
        needed. The right leg bends into a short checkmark flick instead
        of ending in a plain vertical stroke.
      */}
      <path
        d="M14 32 L14 16 L24 27 L34 16 L34 25 L38.5 29.5"
        fill="none"
        className="stroke-white dark:stroke-slate-950"
        strokeWidth="5"
        strokeLinecap="round"
        strokeLinejoin="round"
      />
    </svg>
  );
}
