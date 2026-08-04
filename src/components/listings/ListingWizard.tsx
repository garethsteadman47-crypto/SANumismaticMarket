"use client";

import { useMemo, useState, useTransition } from "react";
import { useRouter } from "next/navigation";
import { toast } from "sonner";
import {
  CheckIcon,
  GavelIcon,
  ImagePlusIcon,
  Loader2Icon,
  PackageIcon,
  ShieldCheckIcon,
  TagIcon,
} from "lucide-react";
import {
  ListingCategory,
  ListingType,
  PreciousMetal,
  SubscriptionTier,
  VerificationProvider,
} from "@prisma/client";

import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardFooter, CardHeader, CardTitle } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { Switch } from "@/components/ui/switch";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { createListingAction } from "@/actions/listing";
import { checkCertificateAction } from "@/actions/verification";
import { CATEGORY_LABELS } from "@/lib/categories";
import { formatZarCents, randsToCents } from "@/lib/utils/currency";
import { calculateOrderFeeBreakdown, getVerificationFeeCents } from "@/lib/utils/fees";
import { cn } from "@/lib/utils";

const STEPS = [
  { id: 1, label: "Identification", icon: TagIcon },
  { id: 2, label: "Specifications", icon: PackageIcon },
  { id: 3, label: "Pricing", icon: GavelIcon },
  { id: 4, label: "Media & Review", icon: ImagePlusIcon },
] as const;

const GRADE_PROVIDERS = [
  VerificationProvider.NGC,
  VerificationProvider.PCGS,
  VerificationProvider.SA_MINT,
  VerificationProvider.ANACS,
] as const;

type SaleFormat = "FIXED" | "AUCTION";

interface WizardState {
  title: string;
  description: string;
  category: ListingCategory;
  listingType: ListingType;
  metal: PreciousMetal;
  condition: string;
  year: string;
  denomination: string;
  certificateId: string;
  verificationProvider: VerificationProvider | "";
  weightGrams: string;
  diameterMm: string;
  packageLengthCm: string;
  packageWidthCm: string;
  packageHeightCm: string;
  saleFormat: SaleFormat;
  priceRands: string;
  acceptsOffers: boolean;
  auctionEndsInDays: string;
  coverImageUrl: string;
  obverseImageUrl: string;
  reverseImageUrl: string;
  certificateImageUrl: string;
}

const INITIAL: WizardState = {
  title: "",
  description: "",
  category: ListingCategory.COINS,
  listingType: ListingType.RAW,
  metal: PreciousMetal.NOT_APPLICABLE,
  condition: "",
  year: "",
  denomination: "",
  certificateId: "",
  verificationProvider: "",
  weightGrams: "",
  diameterMm: "",
  packageLengthCm: "",
  packageWidthCm: "",
  packageHeightCm: "",
  saleFormat: "FIXED",
  priceRands: "",
  acceptsOffers: true,
  auctionEndsInDays: "7",
  coverImageUrl: "",
  obverseImageUrl: "",
  reverseImageUrl: "",
  certificateImageUrl: "",
};

function placeholderImage(seed: string) {
  return `https://picsum.photos/seed/${encodeURIComponent(seed)}/1200/800`;
}

export function ListingWizard({
  sellerTier = SubscriptionTier.STANDARD,
}: {
  sellerTier?: SubscriptionTier;
}) {
  const router = useRouter();
  const [step, setStep] = useState(1);
  const [state, setState] = useState<WizardState>(INITIAL);
  const [isPending, startTransition] = useTransition();
  const [certNote, setCertNote] = useState<string | null>(null);

  function update<K extends keyof WizardState>(key: K, value: WizardState[K]) {
    setState((prev) => ({ ...prev, [key]: value }));
  }

  const priceCents = useMemo(() => {
    const n = Number.parseFloat(state.priceRands);
    if (!Number.isFinite(n) || n <= 0) return 0;
    return randsToCents(n);
  }, [state.priceRands]);

  const verificationFeeCents =
    state.listingType === ListingType.GRADED ? getVerificationFeeCents(sellerTier) : 0;

  const payout =
    priceCents > 0
      ? calculateOrderFeeBreakdown({
          itemPriceCents: priceCents,
          subscriptionTier: sellerTier,
          verificationFeeCents,
        })
      : null;

  function validateStep(current: number): string | null {
    if (current === 1) {
      if (state.title.trim().length < 3) return "Enter a title (at least 3 characters).";
      if (state.description.trim().length < 10) return "Enter a fuller description.";
      if (state.listingType === ListingType.GRADED) {
        if (!state.verificationProvider) return "Select a grading service.";
        if (state.certificateId.trim().length < 4) return "Enter the slab serial number.";
        if (!state.condition.trim()) return "Enter the certified grade (e.g. MS-70).";
      }
    }
    if (current === 2) {
      if (!state.weightGrams) return "Enter the item weight in grams (required for courier quotes).";
    }
    if (current === 3) {
      if (priceCents <= 0) return "Enter a valid ZAR price.";
      if (state.saleFormat === "AUCTION" && !state.auctionEndsInDays) {
        return "Choose auction duration.";
      }
    }
    if (current === 4) {
      if (!state.coverImageUrl && !state.obverseImageUrl) {
        return "Add at least a cover or obverse image URL.";
      }
    }
    return null;
  }

  function goNext() {
    const error = validateStep(step);
    if (error) {
      toast.error(error);
      return;
    }
    setStep((s) => Math.min(4, s + 1));
  }

  function goBack() {
    setStep((s) => Math.max(1, s - 1));
  }

  async function handleVerifyPreview() {
    if (!state.verificationProvider || state.certificateId.trim().length < 4) {
      toast.error("Select a grading service and enter the slab serial first.");
      return;
    }
    const result = await checkCertificateAction(
      state.verificationProvider as VerificationProvider,
      state.certificateId
    );
    if (!result.ok) {
      toast.error(result.error);
      setCertNote(null);
      return;
    }
    setCertNote("Verified upon listing confirmation — shield eligibility checked.");
    toast.success("Certificate lookup succeeded.");
  }

  function handleSubmit() {
    const error = validateStep(4);
    if (error) {
      toast.error(error);
      return;
    }

    const images = [
      state.coverImageUrl,
      state.obverseImageUrl,
      state.reverseImageUrl,
      state.certificateImageUrl,
    ].filter(Boolean);

    // Fallback placeholders so local demos without UploadThing still publish.
    if (images.length === 0) {
      images.push(placeholderImage(state.title || "mintmark-listing"));
    }

    startTransition(async () => {
      const result = await createListingAction({
        title: state.title,
        description: state.description,
        category: state.category,
        listingType: state.listingType,
        metal: state.metal,
        condition: state.condition || undefined,
        year: state.year ? Number(state.year) : undefined,
        denomination: state.denomination || undefined,
        weightGrams: state.weightGrams ? Number(state.weightGrams) : undefined,
        diameterMm: state.diameterMm ? Number(state.diameterMm) : undefined,
        packageLengthCm: state.packageLengthCm ? Number(state.packageLengthCm) : undefined,
        packageWidthCm: state.packageWidthCm ? Number(state.packageWidthCm) : undefined,
        packageHeightCm: state.packageHeightCm ? Number(state.packageHeightCm) : undefined,
        priceCents,
        acceptsOffers: state.saleFormat === "FIXED" ? state.acceptsOffers : false,
        saleFormat: state.saleFormat,
        auctionEndsInDays: state.saleFormat === "AUCTION" ? Number(state.auctionEndsInDays) : undefined,
        images,
        coverImageUrl: state.coverImageUrl || undefined,
        obverseImageUrl: state.obverseImageUrl || undefined,
        reverseImageUrl: state.reverseImageUrl || undefined,
        certificateImageUrl: state.certificateImageUrl || undefined,
        certificateId: state.listingType === ListingType.GRADED ? state.certificateId : undefined,
        verificationProvider:
          state.listingType === ListingType.GRADED ? state.verificationProvider || undefined : undefined,
      });

      if (!result.success) {
        toast.error(result.error);
        return;
      }

      toast.success(result.auctionId ? "Auction published." : "Listing published.");
      router.push(result.auctionId ? `/auctions/${result.auctionId}` : `/listings/${result.listingId}`);
    });
  }

  return (
    <div className="flex flex-col gap-6">
      {/* Progress */}
      <ol className="grid grid-cols-4 gap-2">
        {STEPS.map((s) => {
          const Icon = s.icon;
          const active = step === s.id;
          const done = step > s.id;
          return (
            <li key={s.id} className="flex flex-col gap-1.5">
              <div
                className={cn(
                  "h-1.5 rounded-full transition-colors",
                  done || active ? "bg-amber-500" : "bg-muted"
                )}
              />
              <div
                className={cn(
                  "flex items-center gap-1.5 text-xs font-medium",
                  active ? "text-foreground" : "text-muted-foreground"
                )}
              >
                {done ? <CheckIcon className="size-3.5 text-amber-600" /> : <Icon className="size-3.5" />}
                <span className="hidden sm:inline">{s.label}</span>
                <span className="sm:hidden">{s.id}</span>
              </div>
            </li>
          );
        })}
      </ol>

      <Card>
        <CardHeader>
          <CardTitle className="font-heading text-xl">{STEPS[step - 1].label}</CardTitle>
          <CardDescription>
            {step === 1 && "Core identification and grading details."}
            {step === 2 && "Physical specs used for PostNet / The Courier Guy shipping quotes."}
            {step === 3 && "Choose Buy Now or Live Auction and set your ZAR strategy."}
            {step === 4 && "Add media slots and confirm before publishing."}
          </CardDescription>
        </CardHeader>

        <CardContent className="flex flex-col gap-5">
          {step === 1 && (
            <>
              <div className="flex flex-col gap-1.5">
                <Label htmlFor="title">Item title</Label>
                <Input
                  id="title"
                  value={state.title}
                  onChange={(e) => update("title", e.target.value)}
                  placeholder="e.g. 1898 ZAR Full Pond — NGC AU58"
                />
              </div>
              <div className="flex flex-col gap-1.5">
                <Label htmlFor="description">Full description</Label>
                <Textarea
                  id="description"
                  rows={5}
                  value={state.description}
                  onChange={(e) => update("description", e.target.value)}
                  placeholder="Provenance, eye appeal, strike notes, packaging…"
                />
              </div>
              <div className="grid gap-4 sm:grid-cols-2">
                <div className="flex flex-col gap-1.5">
                  <Label>Category</Label>
                  <Select
                    value={state.category}
                    onValueChange={(v) => v && update("category", v as ListingCategory)}
                  >
                    <SelectTrigger>
                      <SelectValue />
                    </SelectTrigger>
                    <SelectContent>
                      {Object.values(ListingCategory).map((c) => (
                        <SelectItem key={c} value={c}>
                          {CATEGORY_LABELS[c]}
                        </SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                </div>
                <div className="flex flex-col gap-1.5">
                  <Label>Metal</Label>
                  <Select value={state.metal} onValueChange={(v) => v && update("metal", v as PreciousMetal)}>
                    <SelectTrigger>
                      <SelectValue />
                    </SelectTrigger>
                    <SelectContent>
                      {Object.values(PreciousMetal).map((m) => (
                        <SelectItem key={m} value={m}>
                          {m.replaceAll("_", " ")}
                        </SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                </div>
              </div>

              <div className="flex flex-col gap-2">
                <Label>Grade selection</Label>
                <div className="grid grid-cols-2 gap-2">
                  <button
                    type="button"
                    onClick={() => update("listingType", ListingType.RAW)}
                    className={cn(
                      "rounded-lg border px-3 py-3 text-left text-sm transition-colors",
                      state.listingType === ListingType.RAW
                        ? "border-amber-500 bg-amber-500/10"
                        : "hover:bg-muted"
                    )}
                  >
                    <div className="font-medium">Raw / Ungraded</div>
                    <div className="text-xs text-muted-foreground">No slab — condition notes optional</div>
                  </button>
                  <button
                    type="button"
                    onClick={() => update("listingType", ListingType.GRADED)}
                    className={cn(
                      "rounded-lg border px-3 py-3 text-left text-sm transition-colors",
                      state.listingType === ListingType.GRADED
                        ? "border-amber-500 bg-amber-500/10"
                        : "hover:bg-muted"
                    )}
                  >
                    <div className="font-medium">Certified / Graded</div>
                    <div className="text-xs text-muted-foreground">Slabbed with serial number</div>
                  </button>
                </div>
              </div>

              {state.listingType === ListingType.GRADED && (
                <div className="flex flex-col gap-4 rounded-lg border border-amber-500/30 bg-amber-500/5 p-4">
                  <div className="grid gap-4 sm:grid-cols-2">
                    <div className="flex flex-col gap-1.5">
                      <Label>Grading service</Label>
                      <Select
                        value={state.verificationProvider || undefined}
                        onValueChange={(v) => v && update("verificationProvider", v as VerificationProvider)}
                      >
                        <SelectTrigger>
                          <SelectValue placeholder="Select service" />
                        </SelectTrigger>
                        <SelectContent>
                          {GRADE_PROVIDERS.map((p) => (
                            <SelectItem key={p} value={p}>
                              {p === "SA_MINT" ? "SA Mint" : p}
                            </SelectItem>
                          ))}
                        </SelectContent>
                      </Select>
                    </div>
                    <div className="flex flex-col gap-1.5">
                      <Label htmlFor="grade">Grade</Label>
                      <Input
                        id="grade"
                        value={state.condition}
                        onChange={(e) => update("condition", e.target.value)}
                        placeholder="MS-70, PF-69, AU58…"
                      />
                    </div>
                  </div>
                  <div className="flex flex-col gap-1.5">
                    <Label htmlFor="slab">Slab serial number</Label>
                    <Input
                      id="slab"
                      value={state.certificateId}
                      onChange={(e) => update("certificateId", e.target.value)}
                      placeholder="Required — verified upon listing confirmation"
                    />
                    <p className="text-xs text-muted-foreground">
                      Verified upon listing confirmation against the selected registry.
                    </p>
                  </div>
                  <Button type="button" variant="outline" size="sm" onClick={handleVerifyPreview}>
                    <ShieldCheckIcon />
                    Preview verification
                  </Button>
                  {certNote && <p className="text-xs text-amber-800 dark:text-amber-300">{certNote}</p>}
                </div>
              )}

              <div className="grid gap-4 sm:grid-cols-2">
                <div className="flex flex-col gap-1.5">
                  <Label htmlFor="year">Year</Label>
                  <Input
                    id="year"
                    inputMode="numeric"
                    value={state.year}
                    onChange={(e) => update("year", e.target.value)}
                    placeholder="1898"
                  />
                </div>
                <div className="flex flex-col gap-1.5">
                  <Label htmlFor="denom">Denomination</Label>
                  <Input
                    id="denom"
                    value={state.denomination}
                    onChange={(e) => update("denomination", e.target.value)}
                    placeholder="1 Pond, 1 oz Krugerrand…"
                  />
                </div>
              </div>
            </>
          )}

          {step === 2 && (
            <>
              <div className="grid gap-4 sm:grid-cols-2">
                <div className="flex flex-col gap-1.5">
                  <Label htmlFor="weight">Weight (grams)</Label>
                  <Input
                    id="weight"
                    inputMode="decimal"
                    value={state.weightGrams}
                    onChange={(e) => update("weightGrams", e.target.value)}
                    placeholder="31.1"
                  />
                </div>
                <div className="flex flex-col gap-1.5">
                  <Label htmlFor="diameter">Diameter (mm)</Label>
                  <Input
                    id="diameter"
                    inputMode="decimal"
                    value={state.diameterMm}
                    onChange={(e) => update("diameterMm", e.target.value)}
                    placeholder="32.7"
                  />
                </div>
              </div>
              <div>
                <Label className="mb-2 block">Packaging dimensions (cm)</Label>
                <p className="mb-3 text-xs text-muted-foreground">
                  Used for automated courier shipping quotes via PostNet / The Courier Guy API.
                </p>
                <div className="grid grid-cols-3 gap-3">
                  <div className="flex flex-col gap-1.5">
                    <Label htmlFor="len">Length</Label>
                    <Input
                      id="len"
                      inputMode="decimal"
                      value={state.packageLengthCm}
                      onChange={(e) => update("packageLengthCm", e.target.value)}
                    />
                  </div>
                  <div className="flex flex-col gap-1.5">
                    <Label htmlFor="wid">Width</Label>
                    <Input
                      id="wid"
                      inputMode="decimal"
                      value={state.packageWidthCm}
                      onChange={(e) => update("packageWidthCm", e.target.value)}
                    />
                  </div>
                  <div className="flex flex-col gap-1.5">
                    <Label htmlFor="hei">Height</Label>
                    <Input
                      id="hei"
                      inputMode="decimal"
                      value={state.packageHeightCm}
                      onChange={(e) => update("packageHeightCm", e.target.value)}
                    />
                  </div>
                </div>
              </div>
            </>
          )}

          {step === 3 && (
            <>
              <div className="grid grid-cols-2 gap-2">
                <button
                  type="button"
                  onClick={() => update("saleFormat", "FIXED")}
                  className={cn(
                    "rounded-lg border px-3 py-3 text-left text-sm",
                    state.saleFormat === "FIXED" ? "border-amber-500 bg-amber-500/10" : "hover:bg-muted"
                  )}
                >
                  <div className="font-medium">Fixed Price (Buy Now)</div>
                  <div className="text-xs text-muted-foreground">Instant purchase at your asking price</div>
                </button>
                <button
                  type="button"
                  onClick={() => update("saleFormat", "AUCTION")}
                  className={cn(
                    "rounded-lg border px-3 py-3 text-left text-sm",
                    state.saleFormat === "AUCTION" ? "border-amber-500 bg-amber-500/10" : "hover:bg-muted"
                  )}
                >
                  <div className="font-medium">Live Auction</div>
                  <div className="text-xs text-muted-foreground">Competitive bidding with countdown</div>
                </button>
              </div>

              <div className="flex flex-col gap-1.5">
                <Label htmlFor="price">
                  {state.saleFormat === "AUCTION" ? "Starting bid (ZAR)" : "Asking price (ZAR)"}
                </Label>
                <Input
                  id="price"
                  inputMode="decimal"
                  value={state.priceRands}
                  onChange={(e) => update("priceRands", e.target.value)}
                  placeholder="12500.00"
                />
              </div>

              {state.saleFormat === "AUCTION" && (
                <div className="flex flex-col gap-1.5">
                  <Label>Auction duration (days)</Label>
                  <Select
                    value={state.auctionEndsInDays}
                    onValueChange={(v) => v && update("auctionEndsInDays", v)}
                  >
                    <SelectTrigger>
                      <SelectValue />
                    </SelectTrigger>
                    <SelectContent>
                      {["3", "5", "7", "10", "14"].map((d) => (
                        <SelectItem key={d} value={d}>
                          {d} days
                        </SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                </div>
              )}

              {state.saleFormat === "FIXED" && (
                <div className="flex items-center justify-between rounded-lg border px-3 py-3">
                  <div>
                    <div className="text-sm font-medium">Accept offers</div>
                    <div className="text-xs text-muted-foreground">
                      Minimum offer locked at 70% of asking price
                    </div>
                  </div>
                  <Switch
                    checked={state.acceptsOffers}
                    onCheckedChange={(checked) => update("acceptsOffers", checked)}
                  />
                </div>
              )}

              {payout && (
                <div className="rounded-lg border bg-slate-50 p-4 text-sm dark:bg-slate-950">
                  <div className="mb-2 font-heading font-semibold">Net payout estimate</div>
                  <dl className="grid grid-cols-2 gap-y-1.5">
                    <dt className="text-muted-foreground">Gross</dt>
                    <dd className="text-right font-medium">{formatZarCents(payout.itemPriceCents)}</dd>
                    <dt className="text-muted-foreground">
                      Commission ({(payout.commissionRateBps / 100).toFixed(2)}%)
                    </dt>
                    <dd className="text-right">-{formatZarCents(payout.commissionAmountCents)}</dd>
                    <dt className="text-muted-foreground">Verification fee</dt>
                    <dd className="text-right">
                      {payout.verificationFeeCents === 0
                        ? "Waived"
                        : `-${formatZarCents(payout.verificationFeeCents)}`}
                    </dd>
                    <dt className="text-muted-foreground">VAT on fees</dt>
                    <dd className="text-right">-{formatZarCents(payout.platformVatCents)}</dd>
                    <dt className="font-medium">Estimated net</dt>
                    <dd className="text-right font-semibold text-amber-700 dark:text-amber-400">
                      {formatZarCents(payout.sellerPayoutCents)}
                    </dd>
                  </dl>
                </div>
              )}
            </>
          )}

          {step === 4 && (
            <>
              <p className="text-sm text-muted-foreground">
                Drag-and-drop upload lands with UploadThing next — paste image URLs into labeled slots for now.
              </p>
              {(
                [
                  ["coverImageUrl", "Cover photo"],
                  ["obverseImageUrl", "Obverse (front)"],
                  ["reverseImageUrl", "Reverse (back)"],
                  ["certificateImageUrl", "Certificate / slab serial"],
                ] as const
              ).map(([key, label]) => (
                <div
                  key={key}
                  className="flex flex-col gap-1.5 rounded-lg border border-dashed border-slate-300 bg-slate-50/50 p-4 dark:border-slate-700 dark:bg-slate-950/40"
                >
                  <Label htmlFor={key} className="flex items-center gap-2">
                    <ImagePlusIcon className="size-4 text-muted-foreground" />
                    {label}
                  </Label>
                  <Input
                    id={key}
                    value={state[key]}
                    onChange={(e) => update(key, e.target.value)}
                    placeholder="https://…"
                  />
                </div>
              ))}

              <div className="rounded-lg border bg-slate-950 p-5 text-slate-100">
                <h3 className="font-heading text-lg font-semibold text-amber-100">Final summary</h3>
                <dl className="mt-3 grid gap-2 text-sm sm:grid-cols-2">
                  <div>
                    <dt className="text-slate-400">Title</dt>
                    <dd>{state.title || "—"}</dd>
                  </div>
                  <div>
                    <dt className="text-slate-400">Format</dt>
                    <dd>{state.saleFormat === "AUCTION" ? "Live Auction" : "Buy Now"}</dd>
                  </div>
                  <div>
                    <dt className="text-slate-400">Grade</dt>
                    <dd>
                      {state.listingType === ListingType.GRADED
                        ? `${state.verificationProvider || "—"} ${state.condition || ""}`.trim()
                        : "Raw / Ungraded"}
                    </dd>
                  </div>
                  <div>
                    <dt className="text-slate-400">Price</dt>
                    <dd>{priceCents > 0 ? formatZarCents(priceCents) : "—"}</dd>
                  </div>
                  <div>
                    <dt className="text-slate-400">Weight</dt>
                    <dd>{state.weightGrams ? `${state.weightGrams} g` : "—"}</dd>
                  </div>
                  <div>
                    <dt className="text-slate-400">Offers</dt>
                    <dd>
                      {state.saleFormat === "FIXED"
                        ? state.acceptsOffers
                          ? "Accepted (min 70%)"
                          : "Disabled"
                        : "N/A (auction)"}
                    </dd>
                  </div>
                </dl>
              </div>
            </>
          )}
        </CardContent>

        <CardFooter className="flex justify-between gap-2">
          <Button type="button" variant="outline" onClick={goBack} disabled={step === 1 || isPending}>
            Back
          </Button>
          {step < 4 ? (
            <Button type="button" className="bg-amber-500 text-slate-950 hover:bg-amber-400" onClick={goNext}>
              Continue
            </Button>
          ) : (
            <Button
              type="button"
              className="bg-amber-500 text-slate-950 hover:bg-amber-400"
              onClick={handleSubmit}
              disabled={isPending}
            >
              {isPending && <Loader2Icon className="animate-spin" />}
              Publish {state.saleFormat === "AUCTION" ? "auction" : "listing"}
            </Button>
          )}
        </CardFooter>
      </Card>
    </div>
  );
}
