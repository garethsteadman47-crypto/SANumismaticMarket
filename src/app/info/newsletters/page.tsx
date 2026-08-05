import type { Metadata } from "next";
import { CalendarIcon } from "lucide-react";

import { NewsletterSubscribeForm } from "@/components/info/NewsletterSubscribeForm";
import { InfoPageShell } from "@/components/info/InfoPageShell";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { SITE_NAME } from "@/lib/constants";

export const metadata: Metadata = {
  title: `Newsletters — ${SITE_NAME}`,
  description: "Subscribe to MintMark Numismatic Insights and browse the monthly archive.",
};

const ARCHIVE = [
  {
    title: "August 2026: ZAR Veldpond Market Trends",
    summary: "Realised prices, rarity premiums, and how veldpond liquidity moved through Q3 auctions.",
    month: "Aug 2026",
  },
  {
    title: "July 2026: Union Silver Mintage Analysis",
    summary: "Florins, shillings, and half-crowns — mintage tables mapped to recent MintMark clears.",
    month: "Jul 2026",
  },
  {
    title: "June 2026: Graded vs Raw Liquidity",
    summary: "When a slab earns its keep, and when raw high-grade pieces still clear faster.",
    month: "Jun 2026",
  },
  {
    title: "May 2026: Krugerrand Spot Spreads",
    summary: "Bullion premiums over melt for 1oz and fractional Krugerrands on the platform.",
    month: "May 2026",
  },
] as const;

export default function NewslettersPage() {
  return (
    <InfoPageShell
      title="MintMark Numismatic Insights"
      description="Market notes, grading explainers, and SA catalogue highlights — delivered monthly to serious collectors and dealers."
    >
      <Card className="border-amber-500/20 bg-gradient-to-br from-amber-500/5 to-transparent">
        <CardHeader>
          <CardTitle className="font-heading text-xl">Subscribe to the newsletter</CardTitle>
          <CardDescription>
            One curated email a month. No auction spam — only insights worth keeping in your archive.
          </CardDescription>
        </CardHeader>
        <CardContent>
          <NewsletterSubscribeForm />
        </CardContent>
      </Card>

      <section className="flex flex-col gap-4">
        <div>
          <h2 className="font-heading text-xl font-semibold">Archive</h2>
          <p className="text-sm text-muted-foreground">Past monthly editions (preview placeholders).</p>
        </div>
        <div className="grid gap-4 sm:grid-cols-2">
          {ARCHIVE.map((edition) => (
            <Card key={edition.title} className="transition-shadow hover:shadow-md">
              <CardHeader className="gap-2">
                <p className="flex items-center gap-1.5 text-xs font-medium tracking-wide text-amber-700 uppercase dark:text-amber-400">
                  <CalendarIcon className="size-3.5" aria-hidden />
                  {edition.month}
                </p>
                <CardTitle className="font-heading text-base leading-snug">{edition.title}</CardTitle>
                <CardDescription>{edition.summary}</CardDescription>
              </CardHeader>
            </Card>
          ))}
        </div>
      </section>
    </InfoPageShell>
  );
}
