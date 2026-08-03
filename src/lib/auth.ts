import NextAuth from "next-auth";
import Credentials from "next-auth/providers/credentials";
import { PrismaAdapter } from "@auth/prisma-adapter";
import bcrypt from "bcryptjs";

import { db } from "@/lib/db";

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
