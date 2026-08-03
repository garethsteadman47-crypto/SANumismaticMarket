import type { SubscriptionTier, UserRole } from "@prisma/client";
import type { DefaultSession } from "next-auth";

declare module "next-auth" {
  interface Session {
    user: {
      id: string;
      role: UserRole;
      subscriptionTier: SubscriptionTier;
    } & DefaultSession["user"];
  }

  interface User {
    role?: UserRole;
    subscriptionTier?: SubscriptionTier;
  }
}

declare module "@auth/core/jwt" {
  interface JWT {
    id?: string;
    role?: UserRole;
    subscriptionTier?: SubscriptionTier;
  }
}
