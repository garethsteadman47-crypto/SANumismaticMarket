import { redirect } from "next/navigation";

/**
 * Legacy `/auctions` index — the Live Auctions experience now lives on the
 * unified marketplace at `/listings?format=AUCTION` so category sidebar,
 * search, and sort stay in sync with Buy Now.
 */
export default function AuctionsIndexRedirectPage() {
  redirect("/listings?format=AUCTION&sort=ending_soon");
}
