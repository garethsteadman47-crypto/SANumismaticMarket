import { ListingImage } from "@/components/ListingImage";
import Link from "next/link";
import { notFound } from "next/navigation";
import { CopyIcon, ImageOffIcon, PackageIcon } from "lucide-react";
import { OrderStatus } from "@prisma/client";

import { auth } from "@/lib/auth";
import { getOrderForViewer } from "@/lib/orders";
import { canTransitionToSettled } from "@/lib/utils/escrow";
import { formatZarCents } from "@/lib/utils/currency";
import { BUYER_PROTECTION_LABEL, PLATFORM_LEGAL_NAME } from "@/lib/constants";
import { Alert, AlertDescription, AlertTitle } from "@/components/ui/alert";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Separator } from "@/components/ui/separator";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { OrderStatusBadge } from "@/components/orders/OrderStatusBadge";
import { SellerShippingForm } from "@/components/orders/SellerShippingForm";
import { DeliveryOtpVerifyForm } from "@/components/orders/DeliveryOtpVerifyForm";
import { BuyerUnboxingForm } from "@/components/orders/BuyerUnboxingForm";
import { DisputeDialog } from "@/components/orders/DisputeDialog";
import { SettleNowButton } from "@/components/orders/SettleNowButton";
import { InvoiceView } from "@/components/orders/InvoiceView";
import { TrustBadge } from "@/components/TrustBadge";

export const dynamic = "force-dynamic";

const OBJECT_ID_PATTERN = /^[0-9a-fA-F]{24}$/;

export default async function OrderPage({ params }: { params: Promise<{ id: string }> }) {
  const { id } = await params;
  if (!OBJECT_ID_PATTERN.test(id)) {
    notFound();
  }

  const session = await auth();
  if (!session?.user) {
    return (
      <main className="mx-auto flex w-full max-w-md flex-col items-center gap-4 px-4 py-16 text-center">
        <h1 className="text-xl font-semibold">Sign in to continue</h1>
        <p className="text-sm text-muted-foreground">You need an account to view this order.</p>
        <Button nativeButton={false} render={<Link href="/auth/signin" />}>
          Sign in
        </Button>
      </main>
    );
  }

  const order = await getOrderForViewer(id, session.user.id);
  if (!order) {
    notFound();
  }

  const isBuyer = order.buyerId === session.user.id;
  const isSeller = order.sellerId === session.user.id;
  const canSettleNow = canTransitionToSettled({ status: order.status, escrowHoldReleaseAt: order.escrowHoldReleaseAt });
  const coverImage = order.listing.images[0];
  const otp = order.deliveryOtp;
  const evidence = order.unboxingEvidence;

  const showOtpCard = otp && (order.status === OrderStatus.PAID_ESCROW || order.status === OrderStatus.IN_TRANSIT);
  const showShippingForm = isSeller && order.status === OrderStatus.PAID_ESCROW;
  const showOtpVerifyForm = order.status === OrderStatus.IN_TRANSIT;
  const showHoldSection = order.status === OrderStatus.HOLD_48H;
  const unboxingEligibleStatuses: OrderStatus[] = [OrderStatus.HOLD_48H, OrderStatus.DISPUTE, OrderStatus.SETTLED];
  const showUnboxingForm = isBuyer && unboxingEligibleStatuses.includes(order.status);
  const showDisputeButton = showHoldSection && (isBuyer || isSeller);

  return (
    <main className="mx-auto flex w-full max-w-3xl flex-col gap-6 px-4 py-10 print:max-w-full">
      <div className="flex flex-col gap-1">
        <div className="flex items-center gap-2">
          <h1 className="text-2xl font-semibold">Order</h1>
          <OrderStatusBadge status={order.status} />
        </div>
        <p className="text-sm text-muted-foreground">Order ID: {order.id}</p>
      </div>

      <Card>
        <CardContent className="flex items-center gap-4">
          <div className="relative size-16 shrink-0 overflow-hidden rounded-md bg-muted">
            {coverImage ? (
              <ListingImage src={coverImage} alt={order.listing.title} fill className="object-cover" />
            ) : (
              <div className="flex h-full items-center justify-center text-muted-foreground">
                <ImageOffIcon className="size-5" />
              </div>
            )}
          </div>
          <div className="flex flex-1 flex-col gap-1">
            <Link href={`/listings/${order.listing.id}`} className="font-medium hover:underline">
              {order.listing.title}
            </Link>
            <div className="flex items-center gap-2 text-xs text-muted-foreground">
              <span>Buyer: {order.buyer.name ?? order.buyer.email}</span>
              <span>·</span>
              <span>Seller: {order.seller.name ?? order.seller.email}</span>
              <TrustBadge tier={order.seller.subscriptionTier} className="text-[0.6rem]" />
            </div>
            {order.trackingNumber && (
              <p className="text-xs text-muted-foreground">
                {order.courierName ?? "Courier"} tracking: {order.trackingNumber}
              </p>
            )}
          </div>
          <span className="font-semibold">{formatZarCents(order.itemPriceCents)}</span>
        </CardContent>
      </Card>

      <Tabs defaultValue="overview">
        <TabsList>
          <TabsTrigger value="overview">Overview</TabsTrigger>
          <TabsTrigger value="invoices">Invoices ({order.invoices.length})</TabsTrigger>
        </TabsList>

        <TabsContent value="overview" className="flex flex-col gap-4 pt-2">
          {showOtpCard && otp && (
            <Card>
              <CardHeader>
                <CardTitle className="flex items-center gap-1.5 text-base">
                  <PackageIcon className="size-4" />
                  Your delivery code
                </CardTitle>
                <CardDescription>
                  Give this 6-digit code to the courier when your order arrives — it confirms delivery and starts
                  the seller&apos;s payout.
                </CardDescription>
              </CardHeader>
              <CardContent>
                <div className="flex items-center gap-2">
                  <span className="rounded-lg border bg-muted px-4 py-2 text-2xl font-bold tracking-widest">
                    {otp.code}
                  </span>
                  <CopyIcon className="size-4 text-muted-foreground" />
                </div>
              </CardContent>
            </Card>
          )}

          {showShippingForm && <SellerShippingForm orderId={order.id} courierName={order.courierName} />}

          {order.status === OrderStatus.PAID_ESCROW && isBuyer && (
            <Alert>
              <AlertTitle>Waiting for the seller to ship</AlertTitle>
              <AlertDescription>
                You&apos;ll be able to confirm delivery with your code above once the seller marks this order as
                shipped.
              </AlertDescription>
            </Alert>
          )}

          {showOtpVerifyForm && <DeliveryOtpVerifyForm orderId={order.id} />}

          {showHoldSection && (
            <Card>
              <CardHeader>
                <CardTitle className="text-base">48-hour {BUYER_PROTECTION_LABEL} hold</CardTitle>
                <CardDescription>
                  Delivery was confirmed on {order.deliveredAt?.toLocaleString("en-ZA")}. Funds release to the
                  seller{" "}
                  {order.escrowHoldReleaseAt ? `on ${order.escrowHoldReleaseAt.toLocaleString("en-ZA")}` : "soon"}.
                </CardDescription>
              </CardHeader>
              <CardContent className="flex flex-wrap items-center gap-2">
                {canSettleNow ? (
                  <SettleNowButton orderId={order.id} />
                ) : (
                  <p className="text-sm text-muted-foreground">
                    The hold hasn&apos;t expired yet — check back after the release time above.
                  </p>
                )}
                {showDisputeButton && <DisputeDialog orderId={order.id} />}
              </CardContent>
            </Card>
          )}

          {order.status === OrderStatus.DISPUTE && (
            <Alert variant="destructive">
              <AlertTitle>Dispute open</AlertTitle>
              <AlertDescription>
                <p>{order.disputeReason}</p>
                <p className="mt-1 text-xs">
                  Opened {order.disputeOpenedAt?.toLocaleString("en-ZA")}. Your {BUYER_PROTECTION_LABEL} funds are
                  locked until this is resolved.
                </p>
              </AlertDescription>
            </Alert>
          )}

          {order.status === OrderStatus.SETTLED && (
            <Alert>
              <AlertTitle>Order settled</AlertTitle>
              <AlertDescription>
                Settled on {order.settledAt?.toLocaleString("en-ZA")}. The seller received{" "}
                {order.sellerPayoutCents != null ? formatZarCents(order.sellerPayoutCents) : "their payout"}. See
                the Invoices tab for the full breakdown.
              </AlertDescription>
            </Alert>
          )}

          {showUnboxingForm && (
            <BuyerUnboxingForm orderId={order.id} existingUrl={evidence?.buyerUnboxingVideoUrl} />
          )}

          {(evidence?.sellerPackingVideoUrl || evidence?.buyerUnboxingVideoUrl) && (
            <Card>
              <CardHeader>
                <CardTitle className="text-base">Video evidence</CardTitle>
              </CardHeader>
              <CardContent className="flex flex-col gap-2 text-sm">
                {evidence?.sellerPackingVideoUrl && (
                  <div className="flex items-center gap-2">
                    <Badge variant="outline">Seller packing video</Badge>
                    <a
                      href={evidence.sellerPackingVideoUrl}
                      target="_blank"
                      rel="noreferrer"
                      className="truncate text-muted-foreground hover:underline"
                    >
                      {evidence.sellerPackingVideoUrl}
                    </a>
                  </div>
                )}
                {evidence?.buyerUnboxingVideoUrl && (
                  <div className="flex items-center gap-2">
                    <Badge variant="outline">Buyer unboxing video</Badge>
                    <a
                      href={evidence.buyerUnboxingVideoUrl}
                      target="_blank"
                      rel="noreferrer"
                      className="truncate text-muted-foreground hover:underline"
                    >
                      {evidence.buyerUnboxingVideoUrl}
                    </a>
                  </div>
                )}
              </CardContent>
            </Card>
          )}
        </TabsContent>

        <TabsContent value="invoices" className="flex flex-col gap-4 pt-2">
          {order.invoices.length === 0 ? (
            <p className="py-8 text-center text-sm text-muted-foreground">
              Invoices are generated automatically once this order settles.
            </p>
          ) : (
            <>
              <Separator />
              {order.invoices.map((invoice) => (
                <InvoiceView
                  key={invoice.id}
                  invoice={invoice}
                  fromLabel={
                    invoice.issuedById === order.sellerId
                      ? order.seller.name ?? order.seller.email
                      : PLATFORM_LEGAL_NAME
                  }
                  toLabel={
                    invoice.issuedToId === order.buyerId
                      ? order.buyer.name ?? order.buyer.email
                      : order.seller.name ?? order.seller.email
                  }
                />
              ))}
            </>
          )}
        </TabsContent>
      </Tabs>
    </main>
  );
}
