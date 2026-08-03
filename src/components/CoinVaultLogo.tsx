/**
 * CoinVault SA brand mark: a stylized gold coin emblem (concentric rim,
 * reeded edge ticks, a "V" monogram) with a small checkmark-shield badge
 * overlapping its lower-right edge to signal buyer-protection / verified
 * authenticity — echoes `ShieldBadge` elsewhere in the app.
 */
export function CoinVaultLogo({ className, size = 28 }: { className?: string; size?: number }) {
  return (
    <svg
      viewBox="0 0 48 48"
      width={size}
      height={size}
      className={className}
      role="img"
      aria-label="CoinVault SA logo"
    >
      <defs>
        <linearGradient id="coinvault-gold" x1="0%" y1="0%" x2="100%" y2="100%">
          <stop offset="0%" stopColor="#fde68a" />
          <stop offset="45%" stopColor="#f59e0b" />
          <stop offset="100%" stopColor="#b45309" />
        </linearGradient>
        <linearGradient id="coinvault-shield" x1="0%" y1="0%" x2="100%" y2="100%">
          <stop offset="0%" stopColor="#34d399" />
          <stop offset="100%" stopColor="#059669" />
        </linearGradient>
      </defs>

      <circle cx="22" cy="22" r="19" fill="url(#coinvault-gold)" stroke="#92400e" strokeWidth="1.5" />
      <circle cx="22" cy="22" r="15" fill="none" stroke="#fef3c7" strokeOpacity="0.7" strokeWidth="1" />

      {/* Reeded-edge ticks around the coin rim. */}
      {Array.from({ length: 20 }).map((_, i) => {
        const angle = (i / 20) * Math.PI * 2;
        const x1 = 22 + Math.cos(angle) * 18;
        const y1 = 22 + Math.sin(angle) * 18;
        const x2 = 22 + Math.cos(angle) * 20;
        const y2 = 22 + Math.sin(angle) * 20;
        return <line key={i} x1={x1} y1={y1} x2={x2} y2={y2} stroke="#92400e" strokeWidth="1" strokeOpacity="0.55" />;
      })}

      <text
        x="22"
        y="28"
        textAnchor="middle"
        fontFamily="Georgia, 'Times New Roman', serif"
        fontWeight="700"
        fontSize="18"
        fill="#78350f"
      >
        V
      </text>

      {/* Checkmark-shield badge, overlapping the coin's lower-right edge. */}
      <path
        d="M35 26 L44 29.5 V37 C44 41 40 44 35 45.5 C30 44 26 41 26 37 V29.5 Z"
        fill="url(#coinvault-shield)"
        stroke="#ffffff"
        strokeWidth="1.4"
      />
      <path
        d="M31 35.3 L34.2 38.5 L39.4 32.5"
        fill="none"
        stroke="#ffffff"
        strokeWidth="2"
        strokeLinecap="round"
        strokeLinejoin="round"
      />
    </svg>
  );
}
