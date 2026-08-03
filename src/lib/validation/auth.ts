import { z } from "zod";

export const signInSchema = z.object({
  email: z.string().trim().email("Enter a valid email address."),
  password: z.string().min(1, "Enter your password."),
});
export type SignInInput = z.infer<typeof signInSchema>;

export const signUpSchema = z.object({
  name: z.string().trim().min(2, "Enter your full name.").max(80),
  email: z.string().trim().email("Enter a valid email address."),
  password: z.string().min(8, "Password must be at least 8 characters."),
});
export type SignUpInput = z.infer<typeof signUpSchema>;

/**
 * Shared result type for the auth Server Actions in `actions/auth.ts`.
 * Deliberately kept out of that "use server" file — Next.js restricts
 * Server Action modules to exporting only async functions, and even a
 * type-only export there can break the dev-mode Server Actions transform.
 */
export type AuthActionResult = { success: true } | { success: false; error: string };
