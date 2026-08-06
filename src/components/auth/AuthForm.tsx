"use client";

import { useState, useTransition } from "react";
import { useRouter } from "next/navigation";
import { signIn } from "next-auth/react";
import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { toast } from "sonner";
import { Loader2Icon } from "lucide-react";

import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { signInSchema, signUpSchema, type SignInInput, type SignUpInput } from "@/lib/validation/auth";
import { signUpAction } from "@/actions/auth";
import { PhoneAuthForm } from "@/components/auth/PhoneAuthForm";

/** Demo account shown on the login card — pre-filled so preview hosts can't mistype it. */
const DEMO_EMAIL = "dealer@gautengcoins.co.za";
const DEMO_PASSWORD = "DemoPass123!";

async function credentialsSignIn(email: string, password: string): Promise<{ ok: boolean; error?: string }> {
  // Client-side Auth.js callback — same path as /api/auth/callback/credentials.
  // Avoids Server Action host mismatches on Cursor/proxy preview URLs that were
  // previously surfaced as "Invalid email or password."
  const result = await signIn("credentials", {
    email,
    password,
    redirect: false,
  });

  if (result?.error) {
    return { ok: false, error: "Invalid email or password." };
  }
  return { ok: true };
}

function SignInPanel() {
  const [isPending, setIsPending] = useState(false);
  const router = useRouter();
  const {
    register,
    handleSubmit,
    formState: { errors },
  } = useForm<SignInInput>({
    resolver: zodResolver(signInSchema),
    defaultValues: { email: DEMO_EMAIL, password: DEMO_PASSWORD },
  });

  async function onSubmit(values: SignInInput) {
    setIsPending(true);
    try {
      const result = await credentialsSignIn(values.email, values.password);
      if (!result.ok) {
        toast.error(result.error);
        return;
      }
      toast.success("Signed in.");
      router.push("/");
      router.refresh();
    } catch {
      toast.error("Sign-in failed. Please try again.");
    } finally {
      setIsPending(false);
    }
  }

  return (
    <form onSubmit={handleSubmit(onSubmit)} className="flex flex-col gap-4" method="post">
      <div className="flex flex-col gap-1.5">
        <Label htmlFor="signin-email">Email</Label>
        <Input id="signin-email" type="email" autoComplete="email" {...register("email")} />
        {errors.email && <p className="text-xs text-destructive">{errors.email.message}</p>}
      </div>
      <div className="flex flex-col gap-1.5">
        <Label htmlFor="signin-password">Password</Label>
        <Input id="signin-password" type="password" autoComplete="current-password" {...register("password")} />
        {errors.password && <p className="text-xs text-destructive">{errors.password.message}</p>}
      </div>
      <Button type="submit" disabled={isPending} className="mt-2">
        {isPending && <Loader2Icon className="animate-spin" />}
        Sign in
      </Button>
    </form>
  );
}

function SignUpPanel() {
  const [isPending, startTransition] = useTransition();
  const router = useRouter();
  const {
    register,
    handleSubmit,
    formState: { errors },
  } = useForm<SignUpInput>({ resolver: zodResolver(signUpSchema) });

  function onSubmit(values: SignUpInput) {
    startTransition(async () => {
      const result = await signUpAction(values);
      if (!result.success) {
        toast.error(result.error);
        return;
      }

      // Account exists — sign in via the client Auth.js path (not the server action).
      const signedIn = await credentialsSignIn(values.email, values.password);
      if (!signedIn.ok) {
        toast.error("Account created — please sign in with your new password.");
        return;
      }
      toast.success("Account created!");
      router.push("/");
      router.refresh();
    });
  }

  return (
    <form onSubmit={handleSubmit(onSubmit)} className="flex flex-col gap-4" method="post">
      <div className="flex flex-col gap-1.5">
        <Label htmlFor="signup-name">Full name</Label>
        <Input id="signup-name" autoComplete="name" {...register("name")} />
        {errors.name && <p className="text-xs text-destructive">{errors.name.message}</p>}
      </div>
      <div className="flex flex-col gap-1.5">
        <Label htmlFor="signup-email">Email</Label>
        <Input id="signup-email" type="email" autoComplete="email" {...register("email")} />
        {errors.email && <p className="text-xs text-destructive">{errors.email.message}</p>}
      </div>
      <div className="flex flex-col gap-1.5">
        <Label htmlFor="signup-password">Password</Label>
        <Input id="signup-password" type="password" autoComplete="new-password" {...register("password")} />
        {errors.password && <p className="text-xs text-destructive">{errors.password.message}</p>}
      </div>
      <Button type="submit" disabled={isPending} className="mt-2">
        {isPending && <Loader2Icon className="animate-spin" />}
        Create account
      </Button>
    </form>
  );
}

export function AuthForm() {
  return (
    <Tabs defaultValue="signin">
      <TabsList className="w-full">
        <TabsTrigger value="signin">Sign in</TabsTrigger>
        <TabsTrigger value="signup">Create account</TabsTrigger>
        <TabsTrigger value="phone">Phone</TabsTrigger>
      </TabsList>
      <TabsContent value="signin" className="pt-2">
        <SignInPanel />
      </TabsContent>
      <TabsContent value="signup" className="pt-2">
        <SignUpPanel />
      </TabsContent>
      <TabsContent value="phone" className="pt-2">
        <PhoneAuthForm />
      </TabsContent>
    </Tabs>
  );
}
