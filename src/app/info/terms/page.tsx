import type { Metadata } from "next";

import { InfoPageShell } from "@/components/info/InfoPageShell";
import { BUYER_PROTECTION_LABEL, PLATFORM_LEGAL_NAME, SITE_NAME } from "@/lib/constants";

export const metadata: Metadata = {
  title: `Terms & Conditions — ${SITE_NAME}`,
  description: "Buyer protection, seller duties, verification fees, and dispute rules for the MintMark marketplace.",
};

const SECTIONS = [
  {
    title: "1. Buyer Protection & escrow payout conditions",
    paragraphs: [
      `When you complete checkout on ${SITE_NAME}, cleared funds are held under ${BUYER_PROTECTION_LABEL} until delivery is confirmed and the inspection window closes without a valid dispute.`,
      "Payouts to sellers release automatically after a successful OTP delivery confirmation and the applicable hold period (instant for Gold and Dealer tiers; a short hold for Standard and Silver).",
      "Buyers must inspect items promptly on receipt. Claims for misdescription, non-delivery, or suspected counterfeits must be opened within the stated protection window with supporting evidence (photos, video, tracking).",
    ],
  },
  {
    title: "2. Seller responsibilities, authenticity & counterfeit penalties",
    paragraphs: [
      "Sellers warrant that listings are accurate, that they hold clear title, and that graded pieces match the cited certificate numbers from NGC, PCGS, or SANGS.",
      "Listing a counterfeit, altered, or knowingly misrepresented item is grounds for immediate removal, account suspension, forfeiture of held funds where lawful, and reporting to SAAND or law enforcement where appropriate.",
      "Sellers must ship with a tracked courier, provide packing evidence when requested, and respond to buyer messages within two business days during an active order.",
    ],
  },
  {
    title: "3. Verification fee structure",
    paragraphs: [
      "Optional registry verification at checkout cross-checks certificate numbers against the issuing authority. The standard fee is R15.00 (ZAR), deducted as a platform service charge.",
      "Gold Power Trader and Verified Dealer memberships waive the R15 verification fee on eligible checkouts. Standard and Silver tiers pay the fee when verification is selected.",
      "Verification improves buyer confidence but does not replace independent inspection. Registry downtime may delay shield awards without voiding the sale.",
    ],
  },
  {
    title: "4. Dispute resolution & courier responsibility",
    paragraphs: [
      `${PLATFORM_LEGAL_NAME} mediates disputes using listing evidence, courier tracking, unboxing media, and grading registry data. Bad-faith claims may result in account restrictions.`,
      "Risk of loss in transit follows the courier's terms once a valid tracking number is provided. Sellers should insure high-value parcels; buyers should note visible damage with the courier on receipt.",
      "Unresolved disputes after mediation may be escalated to SAAND (for dealer members) or pursued under South African consumer and contract law. These Terms are governed by the laws of the Republic of South Africa.",
    ],
  },
] as const;

export default function TermsPage() {
  return (
    <InfoPageShell
      title="Terms & Conditions"
      description={`Legal terms for trading on ${SITE_NAME}, operated by ${PLATFORM_LEGAL_NAME}. This summary is provided for clarity and does not replace formal agreements presented at checkout.`}
    >
      <p className="text-sm text-muted-foreground">
        Last updated: 5 August 2026. By creating an account or completing a purchase you agree to these terms.
      </p>
      <div className="flex flex-col gap-8">
        {SECTIONS.map((section) => (
          <section key={section.title} className="flex flex-col gap-3">
            <h2 className="font-heading text-xl font-semibold">{section.title}</h2>
            {section.paragraphs.map((paragraph) => (
              <p key={paragraph.slice(0, 48)} className="text-sm leading-relaxed text-muted-foreground">
                {paragraph}
              </p>
            ))}
          </section>
        ))}
      </div>
    </InfoPageShell>
  );
}
