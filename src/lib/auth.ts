import NextAuth from "next-auth";
import Credentials from "next-auth/providers/credentials";
import { PrismaAdapter } from "@auth/prisma-adapter";
import bcrypt from "bcryptjs";

import { db } from "@/lib/db";
import { findOrCreateUserForPhone, verifyPhoneOtp } from "@/lib/phone-otp";

/**
 * Auth.js (NextAuth v5) configuration.
 *
 * Credentials provider requires JWT sessions (Auth.js does not support
 * database sessions for Credentials-based sign-in), so the Prisma adapter
 * here is mainly future-proofing for OAuth providers added later — it lets
 * `Account` linking work out of the box the moment a provider like Google
 * is added, without any schema changes (see `prisma/schema.prisma`).
 *
 * The sign-in/sign-up UI lives at `/auth/signin` (see `actions/auth.ts` and
 * `app/auth/signin/page.tsx`).
 */
export const { handlers, auth, signIn, signOut } = NextAuth({
  adapter: PrismaAdapter(db),
  session: { strategy: "jwt" },
  pages: {
    signIn: "/auth/signin",
  },
  providers: [
    Credentials({
      name: "Email and password",
      credentials: {
        email: { label: "Email", type: "email" },
        password: { label: "Password", type: "password" },
      },
      async authorize(credentials) {
        const email = credentials?.email?.toString().trim().toLowerCase();
        const password = credentials?.password?.toString();
        if (!email || !password) return null;

        const user = await db.user.findUnique({ where: { email } });
        if (!user?.passwordHash) return null;

        const isValidPassword = await bcrypt.compare(password, user.passwordHash);
        if (!isValidPassword) return null;

        return {
          id: user.id,
          name: user.name,
          email: user.email,
          image: user.image,
          role: user.role,
          subscriptionTier: user.subscriptionTier,
        };
      },
    }),
    // Phone-number OTP sign-in — see `lib/phone-otp.ts` for the challenge/
    // verify logic and `components/auth/PhoneAuthForm.tsx` for the two-step
    // UI (send code -> enter code) that calls this provider via
    // `signIn("phone-otp", { phone, code, redirect: false })`.
    Credentials({
      id: "phone-otp",
      name: "Phone number",
      credentials: {
        phone: { label: "Phone", type: "text" },
        code: { label: "Code", type: "text" },
      },
      async authorize(credentials) {
        const phone = credentials?.phone?.toString().trim();
        const code = credentials?.code?.toString().trim();
        if (!phone || !code) return null;

        const result = await verifyPhoneOtp(phone, code);
        if (!result.success) return null;

        const user = await findOrCreateUserForPhone(phone);
        const fullUser = await db.user.findUnique({ where: { id: user.id } });
        if (!fullUser) return null;

        return {
          id: fullUser.id,
          name: fullUser.name,
          email: fullUser.email,
          image: fullUser.image,
          role: fullUser.role,
          subscriptionTier: fullUser.subscriptionTier,
        };
      },
    }),
  ],
  callbacks: {
    async jwt({ token, user }) {
      if (user) {
        token.id = user.id;
        token.role = user.role;
        token.subscriptionTier = user.subscriptionTier;
      }
      return token;
    },
    async session({ session, token }) {
      if (session.user && token.id) {
        session.user.id = token.id;
        session.user.role = token.role ?? "USER";
        session.user.subscriptionTier = token.subscriptionTier ?? "STANDARD";
      }
      return session;
    },
  },
});
