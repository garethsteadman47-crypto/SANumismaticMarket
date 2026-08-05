"use server";

import { z } from "zod";
import { ContactSubject } from "@prisma/client";

import { db } from "@/lib/db";

export type InfoActionResult = { success: true } | { success: false; error: string };

const subscribeSchema = z.object({
  email: z.string().trim().email("Enter a valid email address."),
});

export async function subscribeNewsletterAction(email: string): Promise<InfoActionResult> {
  const parsed = subscribeSchema.safeParse({ email });
  if (!parsed.success) {
    return { success: false, error: parsed.error.issues[0]?.message ?? "Invalid email." };
  }

  const normalized = parsed.data.email.toLowerCase();
  try {
    await db.newsletterSubscriber.upsert({
      where: { email: normalized },
      update: {},
      create: { email: normalized, source: "newsletters_page" },
    });
    return { success: true };
  } catch (err) {
    console.error("[newsletter]", err);
    return { success: false, error: "Could not save your subscription. Please try again." };
  }
}

const contactSchema = z.object({
  name: z.string().trim().min(2, "Enter your name.").max(80),
  email: z.string().trim().email("Enter a valid email address."),
  subject: z.nativeEnum(ContactSubject),
  message: z.string().trim().min(10, "Message must be at least 10 characters.").max(4000),
});

export type ContactFormInput = z.infer<typeof contactSchema>;

export async function submitContactMessageAction(input: ContactFormInput): Promise<InfoActionResult> {
  const parsed = contactSchema.safeParse(input);
  if (!parsed.success) {
    return { success: false, error: parsed.error.issues[0]?.message ?? "Invalid form data." };
  }

  try {
    await db.contactMessage.create({
      data: {
        name: parsed.data.name,
        email: parsed.data.email.toLowerCase(),
        subject: parsed.data.subject,
        message: parsed.data.message,
      },
    });
    return { success: true };
  } catch (err) {
    console.error("[contact]", err);
    return { success: false, error: "Could not send your message. Please try again." };
  }
}
