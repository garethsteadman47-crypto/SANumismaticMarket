"use client";

import { useState, useTransition } from "react";
import { toast } from "sonner";
import { Loader2Icon } from "lucide-react";

import { subscribeNewsletterAction } from "@/actions/info";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";

export function NewsletterSubscribeForm() {
  const [email, setEmail] = useState("");
  const [isPending, startTransition] = useTransition();

  function handleSubmit(event: React.FormEvent) {
    event.preventDefault();
    startTransition(async () => {
      const result = await subscribeNewsletterAction(email);
      if (!result.success) {
        toast.error(result.error);
        return;
      }
      toast.success("Subscribed — welcome to MintMark Insights.");
      setEmail("");
    });
  }

  return (
    <form onSubmit={handleSubmit} className="flex flex-col gap-3 sm:flex-row sm:items-end">
      <div className="flex flex-1 flex-col gap-1.5">
        <Label htmlFor="newsletter-email">Email address</Label>
        <Input
          id="newsletter-email"
          type="email"
          required
          autoComplete="email"
          placeholder="you@example.com"
          value={email}
          onChange={(e) => setEmail(e.target.value)}
        />
      </div>
      <Button type="submit" disabled={isPending} className="bg-amber-500 text-white hover:bg-amber-600 sm:min-w-32">
        {isPending && <Loader2Icon className="animate-spin" />}
        Subscribe
      </Button>
    </form>
  );
}
