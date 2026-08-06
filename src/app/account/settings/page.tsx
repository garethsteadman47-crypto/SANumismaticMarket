import type { Metadata } from "next";
import Link from "next/link";
import { redirect } from "next/navigation";
import { SettingsIcon } from "lucide-react";

import { AccountSubpageShell } from "@/components/account/AccountSubpageShell";
import { buttonVariants } from "@/components/ui/button";
import { auth } from "@/lib/auth";
import { SITE_NAME } from "@/lib/constants";
import { cn } from "@/lib/utils";

export const metadata: Metadata = {
  title: `Settings & Edit — ${SITE_NAME}`,
  description: "Edit your MintMark collector profile, contact details, and account preferences.",
};

export default async function AccountSettingsPage() {
  const session = await auth();
  if (!session?.user?.id) {
    redirect("/login?callbackUrl=/account/settings");
  }

  return (
    <AccountSubpageShell
      activeHref="/account/settings"
      icon={SettingsIcon}
      title="Settings & Edit"
      description="Update your display name, contact details, bio, avatar, and banner — keep your collector profile current."
    >
      <section className="rounded-2xl border border-slate-800 bg-slate-900/60 p-6 shadow-xl shadow-black/20 sm:p-8">
        <h2 className="text-lg font-semibold text-white">Profile settings</h2>
        <p className="mt-2 text-sm leading-relaxed text-slate-400">
          Open the profile editor to change your public collector card, location, phone number, and gallery
          imagery. Notification and privacy preferences will land here as they roll out.
        </p>
        <div className="mt-6 flex flex-wrap gap-3">
          <Link
            href="/account?edit=1"
            className={cn(buttonVariants({ size: "sm" }), "bg-amber-500 text-white hover:bg-amber-600")}
          >
            Edit profile
          </Link>
          <Link
            href="/account"
            className={cn(buttonVariants({ variant: "outline", size: "sm" }), "border-slate-700 text-slate-200")}
          >
            View profile
          </Link>
        </div>
        <ul className="mt-6 space-y-3">
          {[
            "Display name, bio, and location",
            "Phone number for order coordination",
            "Avatar and banner imagery",
            "Upcoming: email & shipping notification preferences",
          ].map((bullet) => (
            <li
              key={bullet}
              className="flex gap-3 rounded-lg border border-slate-800/80 bg-slate-950/50 px-4 py-3 text-sm text-slate-300"
            >
              <span className="mt-1.5 size-1.5 shrink-0 rounded-full bg-amber-500" aria-hidden />
              {bullet}
            </li>
          ))}
        </ul>
      </section>
    </AccountSubpageShell>
  );
}
