import { redirect } from "next/navigation";

/** Legacy /wishlist → account wishlist tracking. */
export default function WishlistRedirectPage() {
  redirect("/account/wishlist");
}
