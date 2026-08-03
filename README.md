# SA Numismatic Marketplace

A secure, peer-to-peer / B2C marketplace for high-value collectible coins, banknotes, and bullion, built with a mobile-responsive, API-first architecture so the same backend can power a React Native/Expo app in Phase 2.

## Tech stack

- **Frontend:** Next.js (App Router), React, TypeScript, Tailwind CSS, shadcn/ui
- **Backend:** Next.js API Routes / Server Actions
- **Database & ORM:** MongoDB + Prisma ORM (`prisma` / `@prisma/client` pinned to **6.19.x** — see note below)
- **Auth:** NextAuth (Auth.js) with the Prisma adapter
- **File storage:** UploadThing / AWS S3 (for listing photos and mandatory unboxing/packing videos) — wired up in a later step
- **Hosting target:** Vercel

> **Why Prisma 6, not 7?** Prisma 7 dropped first-class MongoDB support in favor of a SQL-only query-compiler engine. Since this project's datastore is MongoDB, it is pinned to the latest Prisma 6 release (`prisma-client-js` generator) until Prisma ships a supported MongoDB path on 7.

## Getting started

```bash
npm install
cp .env.example .env   # fill in a real MongoDB Atlas connection string (must be a replica set)
npx prisma generate
npm run dev
```

Open [http://localhost:3000](http://localhost:3000) to view the app.

## Project structure

```
prisma/schema.prisma   Database schema (Users, Subscriptions, Listings,
                        Verifications, Orders/Escrow, Invoices, Ad Placements)
src/app/                Next.js App Router pages & API routes
src/components/ui/      shadcn/ui components
src/lib/db.ts            Prisma Client singleton
```

## Build roadmap

1. **Project initialization & database design** ✅ (this step)
2. Core verification & listing engine (mock SANGS/NGC/PCGS/Hern's lookups, anti-fraud certificate lockout)
3. Fee & escrow utility functions (tiered commission schedule, subscription overrides, payout timing)
4. Frontend scaffolding & market views (homepage, categories, product detail with valuation graphs)
5. Checkout & payout pipeline (OTP-based delivery confirmation, dual invoicing)
