"use client";

import { useState, useTransition } from "react";
import { toast } from "sonner";
import { Loader2Icon } from "lucide-react";
import { ContactSubject } from "@prisma/client";

import { submitContactMessageAction } from "@/actions/info";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";

const SUBJECT_OPTIONS: { value: ContactSubject; label: string }[] = [
  { value: "GENERAL", label: "General" },
  { value: "DISPUTE", label: "Dispute" },
  { value: "SAAND_VERIFICATION", label: "SAAND Verification" },
  { value: "ADVERTISING", label: "Advertising" },
];

export function ContactForm() {
  const [name, setName] = useState("");
  const [email, setEmail] = useState("");
  const [subject, setSubject] = useState<ContactSubject>("GENERAL");
  const [message, setMessage] = useState("");
  const [isPending, startTransition] = useTransition();

  function handleSubmit(event: React.FormEvent) {
    event.preventDefault();
    startTransition(async () => {
      const result = await submitContactMessageAction({ name, email, subject, message });
      if (!result.success) {
        toast.error(result.error);
        return;
      }
      toast.success("Message sent — we typically reply within 24 hours.");
      setName("");
      setEmail("");
      setSubject("GENERAL");
      setMessage("");
    });
  }

  return (
    <form onSubmit={handleSubmit} className="flex flex-col gap-4">
      <div className="grid gap-4 sm:grid-cols-2">
        <div className="flex flex-col gap-1.5">
          <Label htmlFor="contact-name">Name</Label>
          <Input
            id="contact-name"
            required
            autoComplete="name"
            value={name}
            onChange={(e) => setName(e.target.value)}
          />
        </div>
        <div className="flex flex-col gap-1.5">
          <Label htmlFor="contact-email">Email</Label>
          <Input
            id="contact-email"
            type="email"
            required
            autoComplete="email"
            value={email}
            onChange={(e) => setEmail(e.target.value)}
          />
        </div>
      </div>

      <div className="flex flex-col gap-1.5">
        <Label htmlFor="contact-subject">Subject</Label>
        <Select value={subject} onValueChange={(value) => setSubject(value as ContactSubject)}>
          <SelectTrigger id="contact-subject" className="w-full">
            <SelectValue />
          </SelectTrigger>
          <SelectContent>
            {SUBJECT_OPTIONS.map((option) => (
              <SelectItem key={option.value} value={option.value}>
                {option.label}
              </SelectItem>
            ))}
          </SelectContent>
        </Select>
      </div>

      <div className="flex flex-col gap-1.5">
        <Label htmlFor="contact-message">Message</Label>
        <Textarea
          id="contact-message"
          required
          rows={6}
          value={message}
          onChange={(e) => setMessage(e.target.value)}
          placeholder="How can we help?"
        />
      </div>

      <Button type="submit" disabled={isPending} className="w-fit bg-amber-500 text-white hover:bg-amber-600">
        {isPending && <Loader2Icon className="animate-spin" />}
        Send message
      </Button>
    </form>
  );
}
