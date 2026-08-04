"use client";

import { useTransition } from "react";
import { useRouter } from "next/navigation";
import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { toast } from "sonner";
import { Loader2Icon } from "lucide-react";

import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { signInSchema, signUpSchema, type SignInInput, type SignUpInput } from "@/lib/validation/auth";
import { signInWithCredentialsAction, signUpAction } from "@/actions/auth";
import { PhoneAuthForm } from "@/components/auth/PhoneAuthForm";

function SignInPanel() {
  const [isPending, startTransition] = useTransition();
  const router = useRouter();
  const {
    register,
    handleSubmit,
    formState: { errors },
  } = useForm<SignInInput>({ resolver: zodResolver(signInSchema) });

  function onSubmit(values: SignInInput) {
    startTransition(async () => {
      const result = await signInWithCredentialsAction(values);
      if (!result.success) {
        toast.error(result.error);
        return;
      }
      toast.success("Signed in.");
      router.push("/");
      router.refresh();
    });
  }

  return (
    <form onSubmit={handleSubmit(onSubmit)} className="flex flex-col gap-4">
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
      toast.success("Account created!");
      router.push("/");
      router.refresh();
    });
  }

  return (
    <form onSubmit={handleSubmit(onSubmit)} className="flex flex-col gap-4">
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
