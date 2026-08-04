"use client";

import { useState, useTransition } from "react";
import { useForm, Controller } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { toast } from "sonner";
import { Loader2Icon, TriangleAlertIcon } from "lucide-react";
import { ListingCategory, ListingType, PreciousMetal, VerificationProvider } from "@prisma/client";

import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardFooter, CardHeader, CardTitle } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { Alert, AlertDescription, AlertTitle } from "@/components/ui/alert";
import { ShieldBadge } from "@/components/ShieldBadge";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { createListingSchema, type CreateListingInput } from "@/lib/validation/listing";
import { formatZarCents, randsToCents } from "@/lib/utils/currency";
import { getProviderLabel, type CheckCertificateResult } from "@/lib/api/verification";
import { CATEGORY_LABELS } from "@/lib/categories";
import { checkCertificateAction } from "@/actions/verification";
import { createListingAction } from "@/actions/listing";

const METAL_LABELS: Record<PreciousMetal, string> = {
  GOLD: "Gold",
  SILVER: "Silver",
  PLATINUM: "Platinum",
  PALLADIUM: "Palladium",
  COPPER: "Copper",
  BRONZE: "Bronze",
  NICKEL: "Nickel",
  STEEL: "Steel",
  OTHER: "Other",
  NOT_APPLICABLE: "Not applicable",
};

const LISTING_TYPE_LABELS: Record<ListingType, string> = {
  RAW: "Raw (ungraded)",
  GRADED: "Graded (has a certificate)",
  BULLION: "Bullion",
};

type FormValues = CreateListingInput;

const DEFAULT_VALUES: Partial<FormValues> = {
  metal: PreciousMetal.NOT_APPLICABLE,
  listingType: ListingType.RAW,
  priceCents: 0,
  images: [],
};

export function ListingForm() {
  const [isSubmitting, startSubmitTransition] = useTransition();
  const [isVerifying, startVerifyTransition] = useTransition();
  const [verification, setVerification] = useState<CheckCertificateResult | null>(null);
  const [verifiedKey, setVerifiedKey] = useState<string | null>(null);
  const [priceRands, setPriceRands] = useState<string>("");
  const [imagesText, setImagesText] = useState<string>("");

  const {
    register,
    control,
    handleSubmit,
    watch,
    setValue,
    formState: { errors },
    reset,
  } = useForm<FormValues>({
    resolver: zodResolver(createListingSchema),
    defaultValues: DEFAULT_VALUES,
  });

  const listingType = watch("listingType");
  const certificateId = watch("certificateId");
  const verificationProvider = watch("verificationProvider");
  const isGraded = listingType === ListingType.GRADED;

  const currentKey = `${verificationProvider ?? ""}:${(certificateId ?? "").trim().toUpperCase()}`;
  const isVerifiedForCurrentInput = verification?.ok === true && verifiedKey === currentKey;

  async function handleVerify() {
    if (!verificationProvider) {
      toast.error("Select a certifying registry first.");
      return;
    }
    if (!certificateId || certificateId.trim().length < 4) {
      toast.error("Enter a valid certificate ID first.");
      return;
    }

    startVerifyTransition(async () => {
      const result = await checkCertificateAction(verificationProvider as VerificationProvider, certificateId);
      setVerification(result);
      setVerifiedKey(currentKey);

      if (!result.ok) {
        toast.error(result.error);
        return;
      }
      if (result.alreadyLocked) {
        toast.warning("This certificate is already attached to another active listing.");
        return;
      }
      toast.success(`${getProviderLabel(verificationProvider as VerificationProvider)} verified this certificate.`);
    });
  }

  function onSubmit(values: FormValues) {
    if (values.listingType === ListingType.GRADED && !isVerifiedForCurrentInput) {
      toast.error("Please verify the certificate before submitting a graded listing.");
      return;
    }
    if (values.listingType === ListingType.GRADED && verification?.ok && verification.alreadyLocked) {
      toast.error("This certificate is already locked to another active listing.");
      return;
    }

    startSubmitTransition(async () => {
      const result = await createListingAction(values);
      if (!result.success) {
        toast.error(result.error);
        return;
      }
      toast.success(
        result.shieldAwarded
          ? "Listing published with the Verified Authentic Shield!"
          : "Listing published!"
      );
      reset(DEFAULT_VALUES);
      setVerification(null);
      setVerifiedKey(null);
      setPriceRands("");
      setImagesText("");
    });
  }

  const successResult = verification?.ok ? verification : null;

  return (
    <form onSubmit={handleSubmit(onSubmit)} className="mx-auto flex max-w-2xl flex-col gap-4">
      <Card>
        <CardHeader>
          <CardTitle>Listing details</CardTitle>
          <CardDescription>Tell buyers what you&apos;re selling.</CardDescription>
        </CardHeader>
        <CardContent className="flex flex-col gap-4">
          <div className="flex flex-col gap-1.5">
            <Label htmlFor="title">Title</Label>
            <Input id="title" placeholder="1898 ZAR Single Pond, MS64" {...register("title")} />
            {errors.title && <p className="text-xs text-destructive">{errors.title.message}</p>}
          </div>

          <div className="flex flex-col gap-1.5">
            <Label htmlFor="description">Description</Label>
            <Textarea
              id="description"
              rows={5}
              placeholder="Describe the item's history, condition, and anything a buyer should know."
              {...register("description")}
            />
            {errors.description && <p className="text-xs text-destructive">{errors.description.message}</p>}
          </div>

          <div className="grid grid-cols-1 gap-4 sm:grid-cols-2">
            <div className="flex flex-col gap-1.5">
              <Label htmlFor="category">Category</Label>
              <Controller
                control={control}
                name="category"
                render={({ field }) => (
                  <Select value={field.value ?? ""} onValueChange={field.onChange}>
                    <SelectTrigger id="category" className="w-full">
                      <SelectValue placeholder="Select a category" />
                    </SelectTrigger>
                    <SelectContent>
                      {Object.values(ListingCategory).map((value) => (
                        <SelectItem key={value} value={value}>
                          {CATEGORY_LABELS[value]}
                        </SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                )}
              />
              {errors.category && <p className="text-xs text-destructive">{errors.category.message}</p>}
            </div>

            <div className="flex flex-col gap-1.5">
              <Label htmlFor="listingType">Listing type</Label>
              <Controller
                control={control}
                name="listingType"
                render={({ field }) => (
                  <Select value={field.value} onValueChange={field.onChange}>
                    <SelectTrigger id="listingType" className="w-full">
                      <SelectValue placeholder="Select a listing type" />
                    </SelectTrigger>
                    <SelectContent>
                      {Object.values(ListingType).map((value) => (
                        <SelectItem key={value} value={value}>
                          {LISTING_TYPE_LABELS[value]}
                        </SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                )}
              />
            </div>

            <div className="flex flex-col gap-1.5">
              <Label htmlFor="metal">Metal</Label>
              <Controller
                control={control}
                name="metal"
                render={({ field }) => (
                  <Select value={field.value} onValueChange={field.onChange}>
                    <SelectTrigger id="metal" className="w-full">
                      <SelectValue placeholder="Select a metal" />
                    </SelectTrigger>
                    <SelectContent>
                      {Object.values(PreciousMetal).map((value) => (
                        <SelectItem key={value} value={value}>
                          {METAL_LABELS[value]}
                        </SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                )}
              />
            </div>

            <div className="flex flex-col gap-1.5">
              <Label htmlFor="year">Year</Label>
              <Input id="year" type="number" placeholder="1898" {...register("year")} />
              {errors.year && <p className="text-xs text-destructive">{errors.year.message}</p>}
            </div>

            <div className="flex flex-col gap-1.5">
              <Label htmlFor="denomination">Denomination</Label>
              <Input id="denomination" placeholder="1 Pond" {...register("denomination")} />
            </div>

            <div className="flex flex-col gap-1.5">
              <Label htmlFor="condition">Condition / grade note</Label>
              <Input id="condition" placeholder="Uncirculated" {...register("condition")} />
            </div>

            <div className="flex flex-col gap-1.5">
              <Label htmlFor="weightGrams">Weight (g)</Label>
              <Input id="weightGrams" type="number" step="0.01" {...register("weightGrams")} />
            </div>

            <div className="flex flex-col gap-1.5">
              <Label htmlFor="purityPercent">Purity (%)</Label>
              <Input id="purityPercent" type="number" step="0.01" {...register("purityPercent")} />
            </div>
          </div>

          <div className="flex flex-col gap-1.5">
            <Label htmlFor="priceRands">Price (ZAR)</Label>
            <Input
              id="priceRands"
              type="number"
              min="1"
              step="0.01"
              placeholder="15000"
              value={priceRands}
              onChange={(event) => {
                const raw = event.target.value;
                setPriceRands(raw);
                setValue("priceCents", randsToCents(Number(raw || 0)), { shouldValidate: false });
              }}
            />
            {errors.priceCents && <p className="text-xs text-destructive">{errors.priceCents.message}</p>}
          </div>

          <div className="flex flex-col gap-1.5">
            <Label htmlFor="images">Image URLs (one per line)</Label>
            <Textarea
              id="images"
              rows={3}
              placeholder={"https://example.com/photo-front.jpg\nhttps://example.com/photo-back.jpg"}
              value={imagesText}
              onChange={(event) => {
                const raw = event.target.value;
                setImagesText(raw);
                const images = raw
                  .split("\n")
                  .map((line) => line.trim())
                  .filter(Boolean);
                setValue("images", images, { shouldValidate: false });
              }}
            />
            {errors.images && <p className="text-xs text-destructive">{errors.images.message as string}</p>}
          </div>
        </CardContent>
      </Card>

      {isGraded && (
        <Card>
          <CardHeader>
            <CardTitle>Certificate verification</CardTitle>
            <CardDescription>
              Verify your certificate to fetch its Grade, Mintage, and Historical Value, and earn the Verified
              Authentic Shield. A flat R15 verification fee applies — it&apos;s only deducted from your payout if
              the item sells.
            </CardDescription>
          </CardHeader>
          <CardContent className="flex flex-col gap-4">
            <div className="grid grid-cols-1 gap-4 sm:grid-cols-2">
              <div className="flex flex-col gap-1.5">
                <Label htmlFor="verificationProvider">Certifying registry</Label>
                <Controller
                  control={control}
                  name="verificationProvider"
                  render={({ field }) => (
                    <Select value={field.value ?? ""} onValueChange={field.onChange}>
                      <SelectTrigger id="verificationProvider" className="w-full">
                        <SelectValue placeholder="Select a registry" />
                      </SelectTrigger>
                      <SelectContent>
                        {Object.values(VerificationProvider).map((value) => (
                          <SelectItem key={value} value={value}>
                            {getProviderLabel(value)}
                          </SelectItem>
                        ))}
                      </SelectContent>
                    </Select>
                  )}
                />
                {errors.verificationProvider && (
                  <p className="text-xs text-destructive">{errors.verificationProvider.message}</p>
                )}
              </div>

              <div className="flex flex-col gap-1.5">
                <Label htmlFor="certificateId">Certificate ID</Label>
                <div className="flex gap-2">
                  <Input id="certificateId" placeholder="e.g. NGC-1234567" {...register("certificateId")} />
                  <Button type="button" variant="secondary" onClick={handleVerify} disabled={isVerifying}>
                    {isVerifying ? <Loader2Icon className="animate-spin" /> : null}
                    Verify
                  </Button>
                </div>
                {errors.certificateId && <p className="text-xs text-destructive">{errors.certificateId.message}</p>}
              </div>
            </div>

            {verification && !verification.ok && (
              <Alert variant="destructive">
                <TriangleAlertIcon />
                <AlertTitle>Verification failed</AlertTitle>
                <AlertDescription>{verification.error}</AlertDescription>
              </Alert>
            )}

            {successResult && successResult.alreadyLocked && (
              <Alert variant="destructive">
                <TriangleAlertIcon />
                <AlertTitle>Certificate already listed</AlertTitle>
                <AlertDescription>
                  This certificate is already attached to another active listing and cannot be listed again until
                  that listing is sold or removed.
                </AlertDescription>
              </Alert>
            )}

            {successResult && !successResult.alreadyLocked && (
              <div className="flex flex-col gap-2 rounded-lg border border-emerald-600/30 bg-emerald-50 p-3 dark:bg-emerald-950/30">
                <div className="flex items-center gap-2">
                  <ShieldBadge />
                  <span className="text-xs text-muted-foreground">
                    via {getProviderLabel(successResult.lookup.provider)} · {successResult.lookup.latencyMs}ms
                  </span>
                </div>
                <dl className="grid grid-cols-2 gap-2 text-sm sm:grid-cols-3">
                  {successResult.lookup.grade && (
                    <div>
                      <dt className="text-xs text-muted-foreground">Grade</dt>
                      <dd className="font-medium">{successResult.lookup.grade}</dd>
                    </div>
                  )}
                  {successResult.lookup.catalogNumber && (
                    <div>
                      <dt className="text-xs text-muted-foreground">Catalog #</dt>
                      <dd className="font-medium">{successResult.lookup.catalogNumber}</dd>
                    </div>
                  )}
                  {successResult.lookup.mintage != null && (
                    <div>
                      <dt className="text-xs text-muted-foreground">Mintage</dt>
                      <dd className="font-medium">{successResult.lookup.mintage.toLocaleString()}</dd>
                    </div>
                  )}
                  {successResult.lookup.estimatedValueCents != null && (
                    <div>
                      <dt className="text-xs text-muted-foreground">Historical value</dt>
                      <dd className="font-medium">{formatZarCents(successResult.lookup.estimatedValueCents)}</dd>
                    </div>
                  )}
                </dl>
                {successResult.lookup.historicalNotes && (
                  <p className="text-sm text-muted-foreground">{successResult.lookup.historicalNotes}</p>
                )}
              </div>
            )}
          </CardContent>
        </Card>
      )}

      <CardFooter className="justify-end gap-2 rounded-xl border bg-transparent!">
        <Button type="submit" disabled={isSubmitting}>
          {isSubmitting ? <Loader2Icon className="animate-spin" /> : null}
          Publish listing
        </Button>
      </CardFooter>
    </form>
  );
}
