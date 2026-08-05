import type { Metadata } from "next";
import Link from "next/link";
import { ExternalLinkIcon, ShieldCheckIcon, UsersIcon, LandmarkIcon } from "lucide-react";

import { InfoPageShell } from "@/components/info/InfoPageShell";
import { buttonVariants } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { SITE_NAME } from "@/lib/constants";
import { cn } from "@/lib/utils";

export const metadata: Metadata = {
  title: `Societies & Clubs — ${SITE_NAME}`,
  description: "SAAND, SA Coin Club, and South African Numismatic Society — partners and affiliations on MintMark.",
};

const ORGS = [
  {
    id: "saand",
    icon: ShieldCheckIcon,
    name: "SAAND",
    fullName: "South African Association of Numismatic Dealers",
    body: [
      "SAAND sets professional standards for ethical dealing, accurate description, and dispute fairness across the South African trade.",
      "On MintMark, Verified Dealers who are SAAND members display a gold shield badge on listings and profiles. Always confirm the badge on the seller card before high-value purchases.",
    ],
    cta: { href: "/membership", label: "View dealer membership", external: false as boolean },
  },
  {
    id: "coin-club",
    icon: UsersIcon,
    name: "SA Coin Club",
    fullName: "South African Coin Club",
    body: [
      "Membership unlocks community education, events, and preferred access pathways tied to MintMark Silver and Gold plans.",
      "Hern's Handbook catalogue context powers gated valuation charts for eligible members — deepen research without leaving the platform.",
    ],
    cta: { href: "https://coinclub.co.za", label: "Visit coinclub.co.za", external: true as boolean },
  },
  {
    id: "sans",
    icon: LandmarkIcon,
    name: "SANS",
    fullName: "South African Numismatic Society",
    body: [
      "SANS advances historical preservation, scholarly publication, and collector education across South African coinage and exonumia.",
      "Meetings and journals remain a cornerstone of serious study — MintMark encourages members to engage with SANS programmes alongside marketplace activity.",
    ],
    cta: { href: "/info/education", label: "Read grading guides", external: false as boolean },
  },
] as const;

export default function SocietiesPage() {
  return (
    <InfoPageShell
      title="Societies & Affiliations"
      description="The organisations that uphold standards, scholarship, and community across South African numismatics."
    >
      <div className="flex flex-col gap-5">
        {ORGS.map((org) => {
          const Icon = org.icon;
          return (
            <Card key={org.id} className="overflow-hidden">
              <CardHeader className="flex flex-row items-start gap-4 space-y-0 border-b bg-muted/30">
                <span className="flex size-11 shrink-0 items-center justify-center rounded-xl bg-amber-500/10 text-amber-700 dark:text-amber-400">
                  <Icon className="size-5" aria-hidden />
                </span>
                <div>
                  <CardTitle className="font-heading text-xl">{org.name}</CardTitle>
                  <CardDescription className="mt-1">{org.fullName}</CardDescription>
                </div>
              </CardHeader>
              <CardContent className="flex flex-col gap-3 pt-5">
                {org.body.map((paragraph) => (
                  <p key={paragraph.slice(0, 40)} className="text-sm leading-relaxed text-muted-foreground">
                    {paragraph}
                  </p>
                ))}
                {org.cta.external ? (
                  <a
                    href={org.cta.href}
                    target="_blank"
                    rel="noopener noreferrer"
                    className={cn(buttonVariants({ variant: "outline" }), "mt-2 w-fit")}
                  >
                    {org.cta.label}
                    <ExternalLinkIcon />
                  </a>
                ) : (
                  <Link href={org.cta.href} className={cn(buttonVariants({ variant: "outline" }), "mt-2 w-fit")}>
                    {org.cta.label}
                  </Link>
                )}
              </CardContent>
            </Card>
          );
        })}
      </div>
    </InfoPageShell>
  );
}
