import NextAuth from "next-auth";
import Credentials from "next-auth/providers/credentials";
import Google from "next-auth/providers/google";
import { PrismaAdapter } from "@auth/prisma-adapter";
import bcrypt from "bcryptjs";

import { db } from "@/lib/db";
import { findOrCreateUserForPhone, verifyPhoneOtp } from "@/lib/phone-otp";

const googleConfigured = Boolean(process.env.GOOGLE_CLIENT_ID && process.env.GOOGLE_CLIENT_SECRET);

/**
 * Auth.js (NextAuth v5) configuration.
 *
 * Providers: email/password, phone OTP (+27), and Google OAuth when
 * GOOGLE_CLIENT_ID / GOOGLE_CLIENT_SECRET are set. SA Coin Club SSO is a
 * UI placeholder until their IdP credentials ship.
 */
export const { handlers, auth, signIn, signOut } = NextAuth({
  // Required behind proxies / preview hosts (Cursor VM, Vercel, etc.). Without
  // this, Auth.js throws UntrustedHost and credential sign-in surfaces as
  // "Invalid email or password."
  trustHost: true,
  adapter: PrismaAdapter(db),
  session: { strategy: "jwt" },
  pages: {
    signIn: "/login",
  },
  providers: [
    ...(googleConfigured
      ? [
          Google({
            clientId: process.env.GOOGLE_CLIENT_ID!,
            clientSecret: process.env.GOOGLE_CLIENT_SECRET!,
            allowDangerousEmailAccountLinking: true,
          }),
        ]
      : []),
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
      if (token.id && !token.subscriptionTier) {
        const dbUser = await db.user.findUnique({
          where: { id: token.id as string },
          select: { role: true, subscriptionTier: true },
        });
        if (dbUser) {
          token.role = dbUser.role;
          token.subscriptionTier = dbUser.subscriptionTier;
        }
      }
      return token;
    },
    async session({ session, token }) {
      if (session.user && token.id) {
        session.user.id = token.id as string;
        session.user.role = (token.role as "USER" | "ADMIN" | "SUPPORT") ?? "USER";
        session.user.subscriptionTier =
          (token.subscriptionTier as "STANDARD" | "SILVER" | "GOLD" | "DEALER") ?? "STANDARD";
      }
      return session;
    },
  },
});
