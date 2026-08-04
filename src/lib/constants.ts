/**
 * Single source of truth for site branding — name, page metadata, and the
 * "buyer protection" phrase used in place of raw "escrow" wording anywhere
 * the app talks to buyers/sellers. Update here, not by hunting for string
 * literals across pages/components.
 */

export const SITE_NAME = "MintMark";

export const SITE_TITLE = "MintMark | The Premier Coin and Bullion Marketplace";

export const SITE_DESCRIPTION =
  "Buy, sell, and bid on verified coins, bullion, and numismatic collectables with 100% Buyer Protection.";

/** The buyer-facing name for the escrow mechanism — the underlying `OrderStatus.PAID_ESCROW` etc. business logic is unchanged, only the copy shown to users. */
export const BUYER_PROTECTION_LABEL = "MintMark Buyer Protection";

/** Legal/entity name used as the issuer on the platform-to-seller tax invoice. */
export const PLATFORM_LEGAL_NAME = "MintMark (Pty) Ltd";

/**
 * Broad browse taxonomy labels (parent / children). The interactive tree
 * lives in `lib/numismatic-taxonomy.ts`; this constant is the merchandising
 * source of truth for navigation copy (no ampersands).
 */
export const BROWSE_TAXONOMY_LABELS = {
  zar: {
    label: "ZAR",
    children: [
      "Veldpond",
      "Ponde",
      "Half Ponde",
      "Crowns (5 Shillings)",
      "Half Crowns (2.5 Shillings)",
      "Florins (2 Shillings)",
      "Shillings",
      "Sixpences (6d)",
      "Threepences (3d)",
      "Pennies",
      "Half Pennies",
      "Farthings",
    ],
  },
  union: {
    label: "Union",
    children: [
      "Crowns",
      "Half Crowns",
      "Florins",
      "Shillings",
      "Sixpences",
      "Threepences",
      "Pennies",
      "Half Pennies",
      "Farthings",
    ],
  },
  republic: {
    label: "Republic",
    children: ["R2", "R1", "R5", "50c", "20c", "10c", "5c", "2c", "1c", "1/2c"],
  },
  bullion: {
    label: "Bullion",
    children: ["Silver Krugerrands", "Gold Krugerrands", "Fractional Bullion", "Bars"],
  },
  sets: {
    label: "Sets",
    children: ["Proof Sets", "Mint Sets", "Wildlife Series (Big Five)", "Natura Sets", "Protea Sets"],
  },
  banknotes: {
    label: "Banknotes",
    children: ["ZAR Notes", "Union Notes", "Republic Notes", "Global Specimen", "Vintage European"],
  },
} as const;
