import { TrendingUpIcon } from "lucide-react";

import { getSpotPriceQuote, TROY_OUNCE_GRAMS } from "@/lib/api/spot-prices";
import { formatZarCents } from "@/lib/utils/currency";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { SpotPriceWidget } from "@/components/spot/SpotPriceWidget";

export const dynamic = "force-dynamic";

export const metadata = {
  title: "Live Spot Prices — MintMark",
  description: "Live gold and silver spot prices in South African Rand, per gram and per troy ounce.",
};

export default function SpotPricesPage() {
  const gold = getSpotPriceQuote("GOLD");
  const silver = getSpotPriceQuote("SILVER");

  return (
    <main className="mx-auto flex w-full max-w-4xl flex-col gap-6 px-4 py-6">
      <div className="flex flex-col gap-1">
        <h1 className="flex items-center gap-2 text-3xl font-semibold">
          <TrendingUpIcon className="size-7 text-amber-600" aria-hidden />
          Live Spot Prices
        </h1>
        <p className="text-sm text-muted-foreground">
          Gold (XAU/ZAR) and silver (XAG/ZAR) spot benchmarks, updated live — use these to sanity-check any
          bullion or Krugerrand listing&apos;s melt value.
        </p>
      </div>

      <Card className="bg-muted/40">
        <CardHeader>
          <CardTitle className="text-sm">Quick reference (per gram)</CardTitle>
        </CardHeader>
        <CardContent className="grid grid-cols-2 gap-4 text-sm sm:grid-cols-4">
          <div>
            <dt className="text-xs text-muted-foreground">Gold / gram</dt>
            <dd className="font-semibold">{formatZarCents(gold.pricePerGramCents)}</dd>
          </div>
          <div>
            <dt className="text-xs text-muted-foreground">Gold / troy oz</dt>
            <dd className="font-semibold">{formatZarCents(gold.pricePerOzCents)}</dd>
          </div>
          <div>
            <dt className="text-xs text-muted-foreground">Silver / gram</dt>
            <dd className="font-semibold">{formatZarCents(silver.pricePerGramCents)}</dd>
          </div>
          <div>
            <dt className="text-xs text-muted-foreground">Silver / troy oz</dt>
            <dd className="font-semibold">{formatZarCents(silver.pricePerOzCents)}</dd>
          </div>
        </CardContent>
      </Card>

      <Tabs defaultValue="gold">
        <TabsList>
          <TabsTrigger value="gold">Gold (XAU/ZAR)</TabsTrigger>
          <TabsTrigger value="silver">Silver (XAG/ZAR)</TabsTrigger>
        </TabsList>
        <TabsContent value="gold" className="pt-3">
          <SpotPriceWidget quote={gold} metalLabel="Gold (XAU/ZAR)" />
        </TabsContent>
        <TabsContent value="silver" className="pt-3">
          <SpotPriceWidget quote={silver} metalLabel="Silver (XAG/ZAR)" />
        </TabsContent>
      </Tabs>

      <p className="text-xs text-muted-foreground">
        1 troy oz = {TROY_OUNCE_GRAMS.toFixed(4)}g. Prices shown are a mock live feed for demo purposes — not
        investment advice, and not yet wired to a real bullion/FX data provider.
      </p>
    </main>
  );
}
