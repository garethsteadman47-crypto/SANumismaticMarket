import Link from "next/link";
import type { Metadata } from "next";

import { AuthProvidersPanel } from "@/components/auth/AuthProvidersPanel";
import { MintMarkLogo } from "@/components/MintMarkLogo";
import { DevUserSwitcher } from "@/components/auth/DevUserSwitcher";
import { isDevLoginEnabled } from "@/lib/dev-users";
import { SITE_NAME } from "@/lib/constants";

export const metadata: Metadata = {
  title: `Sign in — ${SITE_NAME}`,
  description: "Sign in with Google, South African mobile OTP, or SA Coin Club SSO.",
};

export default function LoginPage() {
  return (
    <main className="mx-auto flex w-full max-w-md flex-col gap-6 px-4 py-12">
      <div className="flex flex-col items-center gap-2 text-center">
        <Link href="/" className="flex items-center gap-2">
          <MintMarkLogo size={32} />
          <span className="font-heading text-xl font-semibold">{SITE_NAME}</span>
        </Link>
        <h1 className="font-heading text-2xl font-semibold">Welcome back</h1>
        <p className="text-sm text-muted-foreground">
          Choose Google, mobile OTP, or SA Coin Club to continue.
        </p>
      </div>

      <AuthProvidersPanel />

      {isDevLoginEnabled() && (
        <div className="rounded-lg border border-dashed p-3">
          <p className="mb-2 text-xs text-muted-foreground">Dev demo accounts</p>
          <DevUserSwitcher variant="buttons" />
        </div>
      )}

      <p className="text-center text-xs text-muted-foreground">
        Prefer email?{" "}
        <Link href="/auth/signin" className="underline underline-offset-2 hover:text-foreground">
          Sign in with email and password
        </Link>
      </p>
    </main>
  );
}
