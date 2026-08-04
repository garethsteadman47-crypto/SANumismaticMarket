"use client";

import { useState } from "react";
import { signIn } from "next-auth/react";
import { toast } from "sonner";
import { BookOpenIcon, Loader2Icon, SmartphoneIcon } from "lucide-react";

import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { PhoneAuthForm } from "@/components/auth/PhoneAuthForm";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
} from "@/components/ui/dialog";

function GoogleGlyph({ className }: { className?: string }) {
  return (
    <svg className={className} viewBox="0 0 24 24" aria-hidden>
      <path
        fill="#EA4335"
        d="M12 10.2v3.6h5.1c-.2 1.2-.9 2.2-1.9 2.9l3.1 2.4c1.8-1.7 2.9-4.1 2.9-7 0-.7-.1-1.3-.2-1.9H12z"
      />
      <path
        fill="#34A853"
        d="M6.6 14.3l-.8.6-2.3 1.8C5.1 19.4 8.3 21.2 12 21.2c2.4 0 4.4-.8 5.9-2.1l-3.1-2.4c-.8.6-1.9.9-2.8.9-2.2 0-4-1.5-4.7-3.5z"
      />
      <path
        fill="#4A90E2"
        d="M3.5 7.3C2.7 8.8 2.3 10.4 2.3 12s.4 3.2 1.2 4.7l3.1-2.4c-.3-.9-.5-1.6-.5-2.3s.2-1.4.5-2.3L3.5 7.3z"
      />
      <path
        fill="#FBBC05"
        d="M12 4.8c1.3 0 2.5.5 3.4 1.3l2.6-2.6C16.4 2.1 14.4 1.2 12 1.2 8.3 1.2 5.1 3 3.5 6.3l3.1 2.4C7.9 6.3 9.8 4.8 12 4.8z"
      />
    </svg>
  );
}

/** Three auth providers for `/login`: Google OAuth, SA mobile OTP, SA Coin Club SSO. */
export function AuthProvidersPanel() {
  const [googlePending, setGooglePending] = useState(false);

  async function handleGoogle() {
    setGooglePending(true);
    try {
      const result = await signIn("google", { callbackUrl: "/", redirect: false });
      if (result?.error) {
        toast.message("Google sign-in needs GOOGLE_CLIENT_ID / GOOGLE_CLIENT_SECRET in the environment.", {
          description: "Provider is wired — add OAuth credentials to enable it in production.",
        });
        return;
      }
      if (result?.url) {
        window.location.href = result.url;
      }
    } catch {
      toast.message("Google OAuth is configured as a provider placeholder.", {
        description: "Set GOOGLE_CLIENT_ID and GOOGLE_CLIENT_SECRET to activate.",
      });
    } finally {
      setGooglePending(false);
    }
  }

  function handleCoinClub() {
    toast.message("SA Coin Club SSO coming soon", {
      description: "Will unlock full Hern Handbook catalogue access on login.",
    });
  }

  return (
    <Card>
      <CardHeader>
        <CardTitle className="text-base">Sign in options</CardTitle>
        <CardDescription>Pick the method that fits how you collect.</CardDescription>
      </CardHeader>
      <CardContent className="flex flex-col gap-3">
        <Button
          type="button"
          variant="outline"
          size="lg"
          className="w-full justify-start gap-3"
          onClick={handleGoogle}
          disabled={googlePending}
        >
          {googlePending ? <Loader2Icon className="animate-spin" /> : <GoogleGlyph className="size-5" />}
          Continue with Google
        </Button>

        <Dialog>
          <DialogTrigger render={<Button type="button" variant="outline" size="lg" className="w-full justify-start gap-3" />}>
            <SmartphoneIcon className="size-5 text-emerald-600" />
            South African mobile OTP (+27)
          </DialogTrigger>
          <DialogContent className="sm:max-w-md">
            <DialogHeader>
              <DialogTitle>Mobile number verification</DialogTitle>
              <DialogDescription>
                We&apos;ll send a 6-digit SMS code to your +27 number. Outside production the demo code is shown
                on-screen.
              </DialogDescription>
            </DialogHeader>
            <PhoneAuthForm />
          </DialogContent>
        </Dialog>

        <Button
          type="button"
          variant="outline"
          size="lg"
          className="w-full justify-start gap-3 border-slate-800 bg-slate-950 text-amber-100 hover:bg-slate-900 hover:text-amber-50"
          onClick={handleCoinClub}
        >
          <BookOpenIcon className="size-5 text-amber-400" />
          Sign in with SA Coin Club
        </Button>
      </CardContent>
    </Card>
  );
}
