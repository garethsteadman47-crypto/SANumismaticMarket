import { redirect } from "next/navigation";

/** Legacy /about → More Info About Us. */
export default function AboutRedirectPage() {
  redirect("/info/about");
}
