import Link from "next/link";
import type { Metadata } from "next";

import { AuthForm } from "@/components/auth/AuthForm";
import { AuthProvidersPanel } from "@/components/auth/AuthProvidersPanel";
import { MintMarkLogo } from "@/components/MintMarkLogo";
import { DevUserSwitcher } from "@/components/auth/DevUserSwitcher";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { ensureAllDemoUsers, isDevLoginEnabled } from "@/lib/dev-users";
import { SITE_NAME } from "@/lib/constants";

export const metadata: Metadata = {
  title: `Sign in — ${SITE_NAME}`,
  description: "Sign in with email, Google, South African mobile OTP, or SA Coin Club SSO.",
};

export default async function LoginPage() {
  // Ensure bassani@demo.local (and the other tier demos) exist on whatever
  // DATABASE_URL this deploy uses — including Vercel → Atlas before seed.
  try {
    await ensureAllDemoUsers();
  } catch (err) {
    console.error("[login] ensureAllDemoUsers failed", err);
  }

  const showDemoSwitcher = isDevLoginEnabled();

  return (
    <main className="mx-auto flex w-full max-w-md flex-col gap-6 px-4 py-12">
      <div className="flex flex-col items-center gap-2 text-center">
        <Link href="/" className="flex items-center gap-2">
          <MintMarkLogo size={32} />
          <span className="font-heading text-xl font-semibold">{SITE_NAME}</span>
        </Link>
        <h1 className="font-heading text-2xl font-semibold">Welcome back</h1>
        <p className="text-sm text-muted-foreground">Sign in to buy, sell, and manage your listings.</p>
      </div>

      <Card>
        <CardHeader>
          <CardTitle className="text-base">Email and password</CardTitle>
          <CardDescription>
            Demo: <span className="font-medium text-foreground">bassani@demo.local</span> /{" "}
            <span className="font-medium text-foreground">DemoPass123!</span>
          </CardDescription>
        </CardHeader>
        <CardContent>
          <AuthForm />
        </CardContent>
      </Card>

      <AuthProvidersPanel />

      {showDemoSwitcher && (
        <div className="rounded-lg border border-dashed p-3">
          <p className="mb-2 text-xs text-muted-foreground">One-click demo accounts</p>
          <DevUserSwitcher variant="buttons" />
        </div>
      )}
    </main>
  );
}
