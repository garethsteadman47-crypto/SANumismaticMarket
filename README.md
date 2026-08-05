# SA Numismatic Marketplace

A secure peer-to-peer / B2C marketplace for high-value South African collectible coins, banknotes, and bullion. The web app is API-first: the same Prisma-backed business logic that powers Server Actions is also exposed under `/api/v1/*` for a future React Native / Expo client (Phase 2).

## Architecture overview

| Layer | Choice |
| --- | --- |
| UI | Next.js App Router, React 19, TypeScript, Tailwind CSS v4, shadcn/ui |
| Auth | Auth.js (NextAuth v5) — Credentials + Prisma adapter, JWT sessions |
| Business logic | Pure modules in `src/lib/*` (testable without a Next request) |
| Web mutations | Thin `"use server"` wrappers in `src/actions/*` |
| Mobile / external clients | REST JSON under `src/app/api/v1/*` calling the same `lib/*` functions |
| Data | MongoDB + Prisma **6.19.x** (`prisma-client-js`) |
| Hosting | Vercel (cron for 48h escrow settlement) |

### Database design choices

- **Prisma 6, not 7** — Prisma 7 dropped first-class MongoDB support. Stay on 6.19.x until an official Mongo path exists on 7.
- **Money as integer ZA cents** — never floating-point for prices, fees, or VAT.
- **MongoDB composite types** for embedded docs: `Address`, `BankAccount`, `DeliveryOtp`, `UnboxingEvidence`, `InvoiceLineItem`.
- **Anti-fraud `CertificateLock`** with a unique `certificateId` so one graded certificate can only back one active listing at a time.
- **Order state machine** — `DRAFT → PAID_ESCROW → IN_TRANSIT → DELIVERED → HOLD_48H | DISPUTE → SETTLED` (plus `CANCELLED` / `REFUNDED`). Gold sellers settle instantly after OTP; Standard / Silver enter a 48-hour hold.
- **Dual SARS invoices** on settlement — Seller→Buyer purchase receipt and Platform→Seller tax invoice (commission + cert fee + 15% VAT).

```
prisma/schema.prisma          Canonical data model
src/lib/listings.ts           Create listing + certificate lock
src/lib/orders.ts             Escrow transitions, OTP, disputes, settle
src/lib/api/verification.ts   Mock SANGS / NGC / PCGS / Hern’s lookups
src/lib/utils/{fees,escrow,invoicing}.ts
src/actions/*                 Server Action adapters (web)
src/app/api/v1/*              REST adapters (mobile-ready)
src/lib/env.ts                Zod env validation (fail-fast in production)
```

## Local setup

### 1. Install

```bash
npm install
cp .env.example .env
```

### 2. Ephemeral MongoDB replica set (recommended for local dev)

Prisma transactions require a replica set. Atlas clusters already are; locally use the memory server:

```bash
# Terminal A — keeps mongod alive and prints a DATABASE_URL
npm run db:memory
```

Copy the printed `DATABASE_URL` into `.env`, then:

```bash
# Terminal B
npx prisma generate
npm run db:seed
npm run dev
```

Open [http://localhost:3000](http://localhost:3000).

### 3. Demo accounts

Seeded by `npm run db:seed`. On Vercel, visiting `/login` also upserts these accounts
into whatever `DATABASE_URL` the deploy uses (so Atlas works without a manual seed).

| Tier | Email | Password |
| --- | --- | --- |
| Dealer (SAAND) | `bassani@demo.local` | `DemoPass123!` |
| Gold | `pretoriagold@demo.local` | `DemoPass123!` |
| Silver | `unionhunter@demo.local` | `DemoPass123!` |
| Standard | `casual@demo.local` | `DemoPass123!` |

One-click demo buttons on `/login` show in non-production and on Vercel **preview**
deploys (or when `DEMO_LOGIN_ENABLED=1`).

## Environment variables

See `.env.example` for the full list. Critical keys:

| Variable | Required | Notes |
| --- | --- | --- |
| `DATABASE_URL` | **always** | MongoDB replica-set URI. Note: use `AUTH_SECRET`, not the `BETTER_AUTH_SECRET` key that `npx auth secret` now prints (that CLI defaults to the unrelated Better Auth library) |
| `AUTH_SECRET` | **always** | Any strong random string, e.g. `openssl rand -hex 32` |
| `NEXTAUTH_URL` | recommended | e.g. `http://localhost:3000` or your Vercel URL |
| `UPLOADTHING_TOKEN` | recommended | Listing images + unboxing videos (feature not yet wired — safe to leave unset for now) |
| `CRON_SECRET` | recommended | Bearer token for `/api/v1/cron/settle`; unset just means that route runs unauthenticated |

`src/lib/env.ts` validates configuration via Zod. Only `DATABASE_URL` and `AUTH_SECRET` are boot-blocking — a real production runtime (`NODE_ENV=production`, not a `next build` compile) throws and refuses to boot if either is missing, since the app cannot function without them. Every other key above is optional: a missing one only degrades that specific feature and logs a `[env]` warning, it never crashes the server. Force the same checks locally with `ENFORCE_ENV_VALIDATION=1`.

## REST API (`/api/v1`) — Phase 2 mobile surface

All routes return `{ success: true, data }` or `{ success: false, error }` JSON. Auth uses the same Auth.js session cookie as the web app (Expo can adopt a cookie-aware fetch client; a dedicated Bearer token can be layered later without rewriting `lib/*`).

| Method | Path | Auth | Purpose |
| --- | --- | --- | --- |
| `GET` | `/api/v1/listings` | public | Active catalog (`?category=&limit=&cursor=`) |
| `POST` | `/api/v1/listings` | session | Create listing (`createListing`) |
| `GET` | `/api/v1/listings/:id` | public | Listing detail |
| `POST` | `/api/v1/verify` | public | Certificate lookup + lock check |
| `GET` | `/api/v1/orders/:id/otp` | session | Read delivery OTP (buyer/seller) |
| `POST` | `/api/v1/orders/:id/otp` | session | Confirm delivery (`verifyDeliveryOtp`) |
| `GET` | `/api/v1/orders/:id/invoices` | session | Dual invoice JSON for download/print |
| `GET` | `/api/v1/cron/settle` | `CRON_SECRET` bearer | Settle all expired 48h holds (daily, see `vercel.json`) |

Server Actions in `src/actions/*` remain the web UI entry points; they call the identical business modules.

## Testing

```bash
# Unit tests (no Mongo required)
npm test

# Integration tests (spin up mongodb-memory-server replica set automatically)
npm run test:integration

# Lint + production build
npm run lint
npm run build
```

Vitest configs:

- `vitest.config.mts` — unit tests (`*.test.ts`, excludes `*.integration.test.ts`)
- `vitest.integration.config.mts` — DB-backed listing + order lifecycle suites

## Vercel deployment checklist

1. **Create a MongoDB Atlas cluster** (replica set) and database user. Put the connection string in `DATABASE_URL`.
2. **Set env vars** in the Vercel project (Production + Preview as appropriate):
   - `DATABASE_URL`, `AUTH_SECRET`, `NEXTAUTH_URL` (your production URL)
   - `UPLOADTHING_TOKEN`, `CRON_SECRET`
   - Optional payment / OAuth / S3 keys from `.env.example`
3. **Deploy** — `vercel.json` already registers cron `0 0 * * *` (daily at midnight UTC) → `/api/v1/cron/settle`.
4. **Protect cron** — Vercel Cron sends `Authorization: Bearer $CRON_SECRET` when `CRON_SECRET` is set; the route rejects unauthorized callers in production.
5. **Seed demo data (optional, non-prod only)**:
   ```bash
   DATABASE_URL="..." npm run db:seed
   ```
   Do **not** seed demo passwords into a live production marketplace that handles real money.
6. **Smoke test** — sign-in, create graded listing (certificate verify), checkout → ship → OTP → settle / hold, open Invoices tab; hit `GET /api/v1/listings`.

## Scripts

| Script | Description |
| --- | --- |
| `npm run dev` | Next.js dev server |
| `npm run build` / `npm start` | Production build & serve |
| `npm test` | Unit tests |
| `npm run test:integration` | Integration tests |
| `npm run lint` | ESLint |
| `npm run db:memory` | Ephemeral Mongo replica set |
| `npm run db:seed` | Idempotent demo seed (`prisma/seed.ts`) — ≥15 listings, live auctions, indexes |

## Build roadmap

1. Project initialization & database design ✅
2. Verification & listing engine ✅
3. Fee & escrow utilities ✅
4. Frontend scaffolding & market views ✅
5. Checkout & payout pipeline ✅
6. **Production polish & mobile API readiness** ✅ (this phase)
7. Phase 2 — React Native / Expo client consuming `/api/v1`
