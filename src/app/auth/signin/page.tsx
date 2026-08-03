import Link from "next/link";
import { FlaskConicalIcon } from "lucide-react";

import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Alert, AlertDescription, AlertTitle } from "@/components/ui/alert";
import { AuthForm } from "@/components/auth/AuthForm";
import { DevUserSwitcher } from "@/components/auth/DevUserSwitcher";
import { isDevLoginEnabled } from "@/lib/dev-users";

export const dynamic = "force-dynamic";

export default function SignInPage() {
  return (
    <main className="mx-auto flex w-full max-w-md flex-col gap-6 px-4 py-12">
      <div className="flex flex-col gap-1 text-center">
        <Link href="/" className="text-lg font-semibold">
          CoinVault SA
        </Link>
        <p className="text-sm text-muted-foreground">Sign in to buy, sell, and manage your listings.</p>
      </div>

      <Card>
        <CardHeader>
          <CardTitle>Welcome</CardTitle>
          <CardDescription>Sign in to your account, or create a new one.</CardDescription>
        </CardHeader>
        <CardContent>
          <AuthForm />
        </CardContent>
      </Card>

      {isDevLoginEnabled() && (
        <Card>
          <CardHeader>
            <CardTitle className="flex items-center gap-1.5">
              <FlaskConicalIcon className="size-4" />
              Demo accounts (dev only)
            </CardTitle>
            <CardDescription>
              Skip account creation and sign in as a pre-seeded demo user for each subscription tier.
            </CardDescription>
          </CardHeader>
          <CardContent className="flex flex-col gap-3">
            <Alert>
              <AlertTitle>For local testing only</AlertTitle>
              <AlertDescription>
                This panel only renders outside production and is not shown to real users.
              </AlertDescription>
            </Alert>
            <DevUserSwitcher variant="buttons" />
          </CardContent>
        </Card>
      )}
    </main>
  );
}
