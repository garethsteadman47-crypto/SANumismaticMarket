import { AwardIcon, PackageCheckIcon, ScanSearchIcon, ShieldCheckIcon, TruckIcon, WalletIcon } from "lucide-react";

import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { MintMarkLogo } from "@/components/MintMarkLogo";
import { SITE_NAME } from "@/lib/constants";

export const metadata = {
  title: `About Us — ${SITE_NAME}`,
  description: "South Africa's most trusted, verified marketplace for rare coinage, bullion, and numismatic collectables.",
};

const PROTECTION_STEPS = [
  {
    icon: WalletIcon,
    title: "1. Secure Checkout",
    description: "Your payment is held securely the moment you buy — the seller isn't paid out until you've confirmed the item arrived as described.",
  },
  {
    icon: TruckIcon,
    title: "2. Seller Ships via PostNet/Courier Guy",
    description: "The seller packs and ships your item with a trusted carrier, providing a tracking number and packing footage.",
  },
  {
    icon: ScanSearchIcon,
    title: "3. Buyer Inspects",
    description: "You confirm delivery with a unique code and get a window to inspect the item before funds release.",
  },
  {
    icon: PackageCheckIcon,
    title: "4. Seller Paid",
    description: "Once everything checks out, the seller is paid — instantly for our top-tier dealers, or after a short protection window for others.",
  },
];

const VERIFICATION_POINTS = [
  {
    icon: AwardIcon,
    title: "SAAND member integration",
    description: "We work alongside the South African Association of Numismatic Dealers' standards for ethical trading and dispute resolution.",
  },
  {
    icon: ShieldCheckIcon,
    title: "NGC / PCGS / SANGS slab verification",
    description: "Graded coins are cross-checked against the issuing registry's records before a listing earns our Verified Authentic Shield.",
  },
  {
    icon: ScanSearchIcon,
    title: "Anti-fraud certificate lockout",
    description: "Every verified certificate number is locked to a single active listing at a time — it's technically impossible to list the same slabbed coin twice while a sale is in progress.",
  },
];

export default function AboutPage() {
  return (
    <main className="mx-auto flex w-full max-w-4xl flex-col gap-14 px-4 py-12">
      <section className="flex flex-col items-center gap-4 text-center">
        <MintMarkLogo size={56} />
        <h1 className="text-3xl font-semibold">About {SITE_NAME}</h1>
        <p className="max-w-2xl text-muted-foreground">
          South Africa&apos;s most trusted, verified marketplace for rare coinage, bullion, and numismatic
          collectables — built for collectors and dealers who demand certainty on every trade.
        </p>
      </section>

      <section className="flex flex-col gap-4">
        <h2 className="text-xl font-semibold">Our Mission</h2>
        <p className="text-muted-foreground">
          High-value collectibles deserve a marketplace as careful as the items themselves. {SITE_NAME} exists to
          make buying and selling rare coins, banknotes, and precious-metal bullion in South Africa as safe,
          transparent, and liquid as possible — pairing independent authenticity verification with buyer-protected
          payments so every trade closes with confidence on both sides.
        </p>
      </section>

      <section className="flex flex-col gap-6">
        <div>
          <h2 className="text-xl font-semibold">How Buyer Protection Works</h2>
          <p className="text-sm text-muted-foreground">Four simple steps stand between every buyer and every seller.</p>
        </div>
        <div className="grid grid-cols-1 gap-4 sm:grid-cols-2">
          {PROTECTION_STEPS.map(({ icon: Icon, title, description }) => (
            <Card key={title}>
              <CardHeader>
                <div className="mb-1 flex size-9 items-center justify-center rounded-full bg-amber-500/10 text-amber-600">
                  <Icon className="size-5" />
                </div>
                <CardTitle className="text-base">{title}</CardTitle>
                <CardDescription>{description}</CardDescription>
              </CardHeader>
            </Card>
          ))}
        </div>
      </section>

      <section className="flex flex-col gap-6">
        <div>
          <h2 className="text-xl font-semibold">Our Verification Standard</h2>
          <p className="text-sm text-muted-foreground">
            Every graded listing on {SITE_NAME} passes through independent checks before it earns the Verified
            Authentic Shield.
          </p>
        </div>
        <div className="flex flex-col gap-3">
          {VERIFICATION_POINTS.map(({ icon: Icon, title, description }) => (
            <Card key={title}>
              <CardContent className="flex items-start gap-3">
                <div className="mt-0.5 flex size-9 shrink-0 items-center justify-center rounded-full bg-emerald-600/10 text-emerald-600">
                  <Icon className="size-5" />
                </div>
                <div className="flex flex-col gap-0.5">
                  <span className="font-medium">{title}</span>
                  <span className="text-sm text-muted-foreground">{description}</span>
                </div>
              </CardContent>
            </Card>
          ))}
        </div>
      </section>
    </main>
  );
}
