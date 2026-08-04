import { TrendingDownIcon, TrendingUpIcon } from "lucide-react";

import { Badge } from "@/components/ui/badge";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { SpotPriceChart } from "@/components/spot/SpotPriceChart";
import type { SpotPriceQuote } from "@/lib/api/spot-prices";
import { formatZarCents } from "@/lib/utils/currency";

function ChangeBadge({ percent }: { percent: number }) {
  const isPositive = percent >= 0;
  return (
    <Badge className={isPositive ? "bg-emerald-600 text-white hover:bg-emerald-600" : "bg-destructive/10 text-destructive"}>
      {isPositive ? <TrendingUpIcon /> : <TrendingDownIcon />}
      {isPositive ? "+" : ""}
      {percent.toFixed(2)}%
    </Badge>
  );
}

export function SpotPriceWidget({
  quote,
  metalLabel,
  meltValueCents,
  premiumPercent,
}: {
  quote: SpotPriceQuote;
  metalLabel: string;
  meltValueCents?: number;
  premiumPercent?: number;
}) {
  return (
    <Card>
      <CardHeader>
        <CardTitle className="flex items-center justify-between text-base">
          <span>Live {metalLabel} Spot Price</span>
          <ChangeBadge percent={quote.changePercent24h} />
        </CardTitle>
      </CardHeader>
      <CardContent className="flex flex-col gap-4">
        <div className="grid grid-cols-2 gap-3 text-sm sm:grid-cols-4">
          <div>
            <dt className="text-xs text-muted-foreground">Per gram</dt>
            <dd className="font-semibold">{formatZarCents(quote.pricePerGramCents)}</dd>
          </div>
          <div>
            <dt className="text-xs text-muted-foreground">Per troy oz</dt>
            <dd className="font-semibold">{formatZarCents(quote.pricePerOzCents)}</dd>
          </div>
          <div>
            <dt className="text-xs text-muted-foreground">24h change</dt>
            <dd className={`font-semibold ${quote.changePercent24h >= 0 ? "text-emerald-600" : "text-destructive"}`}>
              {quote.changePercent24h >= 0 ? "+" : ""}
              {quote.changePercent24h.toFixed(2)}%
            </dd>
          </div>
          <div>
            <dt className="text-xs text-muted-foreground">7d change</dt>
            <dd className={`font-semibold ${quote.changePercent7d >= 0 ? "text-emerald-600" : "text-destructive"}`}>
              {quote.changePercent7d >= 0 ? "+" : ""}
              {quote.changePercent7d.toFixed(2)}%
            </dd>
          </div>
        </div>

        {meltValueCents != null && premiumPercent != null && (
          <div className="flex flex-wrap items-center gap-2 rounded-lg border bg-muted/40 p-3 text-sm">
            <span className="text-muted-foreground">Spot Value:</span>
            <span className="font-semibold">{formatZarCents(meltValueCents)}</span>
            <span className="text-muted-foreground">|</span>
            <span className="text-muted-foreground">Listing Premium:</span>
            <span className={`font-semibold ${premiumPercent >= 0 ? "text-amber-600" : "text-emerald-600"}`}>
              {premiumPercent >= 0 ? "+" : ""}
              {premiumPercent.toFixed(1)}%
            </span>
          </div>
        )}

        <SpotPriceChart history24h={quote.history24h} history7d={quote.history7d} metalLabel={metalLabel} />

        <p className="text-xs text-muted-foreground">
          Mock live feed for demo purposes — swap in a real bullion/FX data provider for production. Not
          investment advice.
        </p>
      </CardContent>
    </Card>
  );
}
