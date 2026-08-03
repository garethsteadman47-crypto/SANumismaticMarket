/**
 * Single source of truth for site branding — name, page metadata, and the
 * "buyer protection" phrase used in place of raw "escrow" wording anywhere
 * the app talks to buyers/sellers. Update here, not by hunting for string
 * literals across pages/components.
 */

export const SITE_NAME = "MintMark";

export const SITE_TITLE = "MintMark | The Premier Coin & Bullion Marketplace";

export const SITE_DESCRIPTION =
  "Buy, sell, and bid on verified coins, bullion, and numismatic collectables with 100% Buyer Protection.";

/** The buyer-facing name for the escrow mechanism — the underlying `OrderStatus.PAID_ESCROW` etc. business logic is unchanged, only the copy shown to users. */
export const BUYER_PROTECTION_LABEL = "MintMark Buyer Protection";

/** Legal/entity name used as the issuer on the platform-to-seller tax invoice. */
export const PLATFORM_LEGAL_NAME = "MintMark (Pty) Ltd";
