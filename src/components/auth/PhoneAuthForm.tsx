"use client";

import { useState, useTransition } from "react";
import { useRouter } from "next/navigation";
import { toast } from "sonner";
import { ArrowLeftIcon, Loader2Icon, PhoneIcon } from "lucide-react";

import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { requestPhoneOtpAction, verifyPhoneOtpAction } from "@/actions/phone-auth";
import { COUNTRY_CODE_OPTIONS, DEFAULT_COUNTRY_CODE, isSupportedCountryCode, isValidSaPhone } from "@/lib/phone";
import { OTP_LENGTH } from "@/lib/otp";

type Step = "phone" | "code";

export function PhoneAuthForm() {
  const [step, setStep] = useState<Step>("phone");
  const [countryCode, setCountryCode] = useState(DEFAULT_COUNTRY_CODE);
  const [localNumber, setLocalNumber] = useState("");
  const [code, setCode] = useState("");
  const [normalizedPhone, setNormalizedPhone] = useState("");
  const [isPending, startTransition] = useTransition();
  const router = useRouter();

  const countrySupported = isSupportedCountryCode(countryCode);
  const phoneLooksValid = countrySupported && isValidSaPhone(localNumber);

  function handleSendCode() {
    if (!phoneLooksValid) return;
    startTransition(async () => {
      const result = await requestPhoneOtpAction(countryCode, localNumber);
      if (!result.success) {
        toast.error(result.error);
        return;
      }
      setNormalizedPhone(result.phone);
      setStep("code");
      if (result.demoCode) {
        toast.info(`Demo mode — your code is ${result.demoCode}`, { duration: 10000 });
      } else {
        toast.success("A 6-digit code was sent to your phone.");
      }
    });
  }

  function handleVerify() {
    startTransition(async () => {
      const result = await verifyPhoneOtpAction(normalizedPhone, code);
      if (!result.success) {
        toast.error(result.error);
        return;
      }
      toast.success("Signed in.");
      router.push("/");
      router.refresh();
    });
  }

  if (step === "code") {
    return (
      <div className="flex flex-col gap-4">
        <button
          type="button"
          onClick={() => setStep("phone")}
          className="flex items-center gap-1 text-xs text-muted-foreground hover:text-foreground"
        >
          <ArrowLeftIcon className="size-3.5" />
          Change number
        </button>
        <div className="flex flex-col gap-1.5">
          <Label htmlFor="phone-otp-code">6-digit code</Label>
          <Input
            id="phone-otp-code"
            inputMode="numeric"
            maxLength={OTP_LENGTH}
            placeholder="123456"
            value={code}
            onChange={(event) => setCode(event.target.value.replace(/\D/g, "").slice(0, OTP_LENGTH))}
          />
          <p className="text-xs text-muted-foreground">Sent to {normalizedPhone}</p>
        </div>
        <Button type="button" disabled={isPending || code.length !== OTP_LENGTH} onClick={handleVerify}>
          {isPending && <Loader2Icon className="animate-spin" />}
          Verify and Sign in
        </Button>
      </div>
    );
  }

  return (
    <div className="flex flex-col gap-4">
      <div className="flex flex-col gap-1.5">
        <Label htmlFor="phone-country-code">Country</Label>
        <Select value={countryCode} onValueChange={(value) => value && setCountryCode(value)}>
          <SelectTrigger id="phone-country-code" className="w-full">
            <SelectValue />
          </SelectTrigger>
          <SelectContent>
            {COUNTRY_CODE_OPTIONS.map((option) => (
              <SelectItem key={option.code} value={option.code}>
                {option.label}
              </SelectItem>
            ))}
          </SelectContent>
        </Select>
      </div>

      <div className="flex flex-col gap-1.5">
        <Label htmlFor="phone-local-number">Mobile number</Label>
        <div className="flex items-center gap-2">
          <span className="flex h-8 shrink-0 items-center rounded-lg border bg-muted px-2 text-sm text-muted-foreground">
            {countryCode}
          </span>
          <Input
            id="phone-local-number"
            inputMode="tel"
            placeholder="082 123 4567"
            value={localNumber}
            onChange={(event) => setLocalNumber(event.target.value)}
          />
        </div>
        {!countrySupported ? (
          <p className="text-xs text-destructive">Currently only South African numbers are supported for sign-in.</p>
        ) : localNumber !== "" && !phoneLooksValid ? (
          <p className="text-xs text-destructive">Enter a valid SA mobile number, e.g. 082 123 4567 or +27 82 123 4567.</p>
        ) : null}
      </div>

      <Button type="button" disabled={!phoneLooksValid || isPending} onClick={handleSendCode}>
        {isPending ? <Loader2Icon className="animate-spin" /> : <PhoneIcon />}
        Send code
      </Button>
    </div>
  );
}
