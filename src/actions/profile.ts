"use server";

import { z } from "zod";

import { auth } from "@/lib/auth";
import { db } from "@/lib/db";

const optionalUrl = z
  .string()
  .trim()
  .url("Enter a valid URL.")
  .or(z.literal(""))
  .optional()
  .transform((v) => (v && v.length > 0 ? v : null));

export const updateProfileSchema = z.object({
  name: z.string().trim().max(80).optional(),
  phoneNumber: z.string().trim().max(32).optional(),
  location: z.string().trim().max(120).optional(),
  bio: z.string().trim().max(600).optional(),
  avatarUrl: optionalUrl,
  bannerUrl: optionalUrl,
});

export type UpdateProfileInput = z.infer<typeof updateProfileSchema>;
export type UpdateProfileResult = { success: true } | { success: false; error: string };

export async function updateProfileAction(input: UpdateProfileInput): Promise<UpdateProfileResult> {
  const session = await auth();
  if (!session?.user?.id) {
    return { success: false, error: "Sign in to update your profile." };
  }

  const parsed = updateProfileSchema.safeParse(input);
  if (!parsed.success) {
    return { success: false, error: parsed.error.issues[0]?.message ?? "Invalid profile data." };
  }

  const data = parsed.data;
  await db.user.update({
    where: { id: session.user.id },
    data: {
      name: data.name?.length ? data.name : null,
      phoneNumber: data.phoneNumber?.length ? data.phoneNumber : null,
      location: data.location?.length ? data.location : null,
      bio: data.bio?.length ? data.bio : null,
      avatarUrl: data.avatarUrl ?? null,
      bannerUrl: data.bannerUrl ?? null,
      // Keep Auth.js `image` in sync with avatar for session avatars elsewhere.
      ...(data.avatarUrl !== undefined ? { image: data.avatarUrl } : {}),
    },
  });

  return { success: true };
}
