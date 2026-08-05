import type { Metadata } from "next";
import {
  BadgeCheckIcon,
  HandIcon,
  LockIcon,
  ScaleIcon,
  ShieldCheckIcon,
  SparklesIcon,
} from "lucide-react";

import { InfoPageShell } from "@/components/info/InfoPageShell";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { BUYER_PROTECTION_LABEL, SITE_NAME } from "@/lib/constants";

export const metadata: Metadata = {
  title: `Education & Guides — ${SITE_NAME}`,
  description: "Coin care, grading standards (NGC, PCGS, SANGS), and how MintMark escrow protects every trade.",
};

const CARE_POINTS = [
  {
    title: "Never clean coins",
    body: "Household polish, abrasives, or dipping destroy original surfaces and tank value. Leave toning alone — collectors pay for originality.",
  },
  {
    title: "Handle by the edge",
    body: "Oils from fingertips etch proof and BU fields. Cotton gloves or edge-only handling keeps surfaces museum-clean.",
  },
  {
    title: "Use proper holders",
    body: "Inert Mylar flips, capsules, or certified slabs — never PVC flips that leach plasticiser and leave green slime.",
  },
  {
    title: "Stable storage",
    body: "Cool, dry, and dark. Avoid garages and attic heat cycles that accelerate toning and condensation.",
  },
] as const;

const GRADING_ROWS = [
  { range: "1–15", label: "Poor to Fine", note: "Heavy wear; major devices visible." },
  { range: "20–45", label: "VF to XF", note: "Moderate to light wear; remaining detail sharp." },
  { range: "50–58", label: "About Uncirculated", note: "Trace friction on high points only." },
  { range: "60–70", label: "Mint State / Proof", note: "No circulation wear; 70 is flawless under magnification." },
] as const;

const SERVICES = [
  {
    name: "NGC",
    body: "Numismatic Guaranty Company — global population reports, EdgeView holders, and strong SA bullion/modern coverage.",
  },
  {
    name: "PCGS",
    body: "Professional Coin Grading Service — Secure Plus holders and a deep true-view image archive favoured by high-end Union collectors.",
  },
  {
    name: "SANGS",
    body: "South African Numismatic Grading Service — local expertise on ZAR, Union, and Republic series with SA-market familiarity.",
  },
] as const;

const ESCROW_STEPS = [
  {
    icon: LockIcon,
    title: "1. Payment held",
    body: "At checkout your funds enter MintMark Buyer Protection — the seller is not paid until delivery checks out.",
  },
  {
    icon: BadgeCheckIcon,
    title: "2. Optional R15 verification",
    body: "Standard and Silver checkouts can add a R15 registry check against NGC / PCGS / SANGS. Gold and Dealer tiers waive the fee.",
  },
  {
    icon: ShieldCheckIcon,
    title: "3. Inspect on arrival",
    body: "Confirm delivery with OTP, then use your protection window to verify the piece matches the listing.",
  },
  {
    icon: SparklesIcon,
    title: "4. Payout releases",
    body: "Clean deals settle to the seller — instantly for top tiers, or after the short hold for others.",
  },
] as const;

export default function EducationPage() {
  return (
    <InfoPageShell
      title="Education & Guides"
      description="Practical care advice, how professional grading works, and a clear walkthrough of MintMark Buyer Protection."
    >
      <section className="flex flex-col gap-4">
        <div className="flex items-center gap-2">
          <HandIcon className="size-5 text-amber-600" aria-hidden />
          <h2 className="font-heading text-xl font-semibold">Numismatic care & handling</h2>
        </div>
        <div className="grid gap-3 sm:grid-cols-2">
          {CARE_POINTS.map((point) => (
            <Card key={point.title}>
              <CardHeader className="pb-2">
                <CardTitle className="text-base">{point.title}</CardTitle>
              </CardHeader>
              <CardContent>
                <p className="text-sm text-muted-foreground">{point.body}</p>
              </CardContent>
            </Card>
          ))}
        </div>
      </section>

      <section className="flex flex-col gap-4">
        <div className="flex items-center gap-2">
          <ScaleIcon className="size-5 text-amber-600" aria-hidden />
          <h2 className="font-heading text-xl font-semibold">Grading scale breakdown</h2>
        </div>
        <p className="text-sm text-muted-foreground">
          <strong className="text-foreground">Raw</strong> coins trade on seller photos and reputation.{" "}
          <strong className="text-foreground">Slabbed</strong> coins are sealed by a grading service with a
          numeric grade — liquidity usually improves, especially above MS/PF 64.
        </p>
        <p className="text-sm text-muted-foreground">
          The Sheldon 1–70 scale underpins modern third-party grading. Mid-points matter: an MS65 and MS66 can
          diverge by thousands of rand on key dates.
        </p>
        <div className="overflow-hidden rounded-xl border">
          <table className="w-full text-left text-sm">
            <thead className="bg-muted/60 text-xs tracking-wide text-muted-foreground uppercase">
              <tr>
                <th className="px-4 py-2.5 font-medium">Grade</th>
                <th className="px-4 py-2.5 font-medium">Band</th>
                <th className="px-4 py-2.5 font-medium">What you see</th>
              </tr>
            </thead>
            <tbody>
              {GRADING_ROWS.map((row) => (
                <tr key={row.range} className="border-t">
                  <td className="px-4 py-3 font-medium tabular-nums">{row.range}</td>
                  <td className="px-4 py-3">{row.label}</td>
                  <td className="px-4 py-3 text-muted-foreground">{row.note}</td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
        <div className="grid gap-3 sm:grid-cols-3">
          {SERVICES.map((service) => (
            <Card key={service.name}>
              <CardHeader className="pb-2">
                <CardTitle className="text-base">{service.name}</CardTitle>
              </CardHeader>
              <CardContent>
                <p className="text-sm text-muted-foreground">{service.body}</p>
              </CardContent>
            </Card>
          ))}
        </div>
      </section>

      <section className="flex flex-col gap-4">
        <div>
          <h2 className="font-heading text-xl font-semibold">{BUYER_PROTECTION_LABEL} & verification</h2>
          <p className="text-sm text-muted-foreground">
            How MintMark keeps funds and authenticity aligned from checkout to payout.
          </p>
        </div>
        <div className="grid gap-3 sm:grid-cols-2">
          {ESCROW_STEPS.map((step) => {
            const Icon = step.icon;
            return (
              <Card key={step.title}>
                <CardHeader className="flex flex-row items-start gap-3 space-y-0">
                  <span className="flex size-9 shrink-0 items-center justify-center rounded-lg bg-amber-500/10 text-amber-700 dark:text-amber-400">
                    <Icon className="size-4" aria-hidden />
                  </span>
                  <div>
                    <CardTitle className="text-base">{step.title}</CardTitle>
                    <CardDescription className="mt-1.5">{step.body}</CardDescription>
                  </div>
                </CardHeader>
              </Card>
            );
          })}
        </div>
      </section>
    </InfoPageShell>
  );
}
