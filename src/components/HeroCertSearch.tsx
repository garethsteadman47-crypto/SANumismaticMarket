"use client";

import { useState, useTransition } from "react";
import { Loader2Icon, SearchIcon, ShieldCheckIcon, ShieldAlertIcon } from "lucide-react";
import { VerificationProvider } from "@prisma/client";

import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { formatZarCents } from "@/lib/utils/currency";

type LookupResult = {
  found: boolean;
  provider: VerificationProvider;
  certificateId: string;
  grade?: string;
  catalogNumber?: string;
  mintage?: number;
  historicalNotes?: string;
  estimatedValueCents?: number;
  shieldEligible: boolean;
};

const PROVIDERS: { value: VerificationProvider; label: string }[] = [
  { value: "NGC", label: "NGC" },
  { value: "PCGS", label: "PCGS" },
  { value: "SANGS", label: "SANGS" },
  { value: "ANACS", label: "ANACS" },
  { value: "SA_MINT", label: "SA Mint" },
  { value: "HERNS", label: "Hern's" },
];

/**
 * Homepage "Verify Any Slab" quick-search — public certificate registry lookup.
 */
export function HeroCertSearch() {
  const [provider, setProvider] = useState<VerificationProvider>("NGC");
  const [certificateId, setCertificateId] = useState("");
  const [error, setError] = useState<string | null>(null);
  const [result, setResult] = useState<(LookupResult & { alreadyLocked?: boolean }) | null>(null);
  const [isPending, startTransition] = useTransition();

  function handleSubmit(event: React.FormEvent) {
    event.preventDefault();
    const cert = certificateId.trim();
    if (cert.length < 4) {
      setError("Enter a certificate ID (at least 4 characters).");
      return;
    }

    setError(null);
    setResult(null);
    startTransition(async () => {
      try {
        const response = await fetch("/api/v1/verify", {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({ provider, certificateId: cert }),
        });
        const payload = (await response.json()) as {
          success: boolean;
          error?: string;
          data?: { lookup: LookupResult; alreadyLocked: boolean; shieldEligible: boolean };
        };
        if (!response.ok || !payload.success || !payload.data) {
          setError(payload.error ?? "Certificate not found.");
          return;
        }
        setResult({ ...payload.data.lookup, alreadyLocked: payload.data.alreadyLocked });
      } catch {
        setError("Could not reach the verification service. Try again.");
      }
    });
  }

  return (
    <section className="mx-auto w-full max-w-7xl px-4">
      <div className="overflow-hidden rounded-2xl border border-slate-800 bg-slate-950 text-slate-50 shadow-xl shadow-black/20">
        <div className="bg-[radial-gradient(ellipse_at_top_left,rgba(245,158,11,0.14),transparent_55%)] px-5 py-6 sm:px-8 sm:py-8">
          <div className="flex flex-col gap-2 sm:flex-row sm:items-end sm:justify-between">
            <div className="flex flex-col gap-1.5">
              <p className="flex items-center gap-1.5 text-xs font-medium tracking-[0.18em] text-amber-400 uppercase">
                <ShieldCheckIcon className="size-3.5" aria-hidden />
                Verify any slab
              </p>
              <h2 className="font-heading text-2xl font-semibold tracking-tight sm:text-3xl">
                Quick certificate lookup
              </h2>
              <p className="max-w-xl text-sm text-slate-400">
                Check NGC, PCGS, SANGS, or SA Mint cert numbers before you bid — including whether the
                slab is already locked to a live MintMark listing.
              </p>
            </div>
          </div>

          <form onSubmit={handleSubmit} className="mt-6 flex flex-col gap-3 sm:flex-row sm:items-end">
            <div className="flex w-full flex-col gap-1.5 sm:w-40">
              <Label htmlFor="hero-cert-provider" className="text-slate-300">
                Registry
              </Label>
              <Select
                value={provider}
                onValueChange={(value) => {
                  if (value) setProvider(value as VerificationProvider);
                }}
              >
                <SelectTrigger id="hero-cert-provider" className="border-slate-700 bg-slate-900 text-slate-100">
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  {PROVIDERS.map((item) => (
                    <SelectItem key={item.value} value={item.value}>
                      {item.label}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
            <div className="flex min-w-0 flex-1 flex-col gap-1.5">
              <Label htmlFor="hero-cert-id" className="text-slate-300">
                Certificate ID
              </Label>
              <Input
                id="hero-cert-id"
                value={certificateId}
                onChange={(event) => setCertificateId(event.target.value)}
                placeholder="e.g. 6892014-001"
                className="border-slate-700 bg-slate-900 text-slate-100 placeholder:text-slate-500"
                maxLength={40}
              />
            </div>
            <Button
              type="submit"
              size="lg"
              disabled={isPending}
              className="bg-amber-500 text-slate-950 hover:bg-amber-400 sm:shrink-0"
            >
              {isPending ? <Loader2Icon className="animate-spin" /> : <SearchIcon />}
              Verify slab
            </Button>
          </form>

          {error && (
            <p className="mt-4 flex items-center gap-2 text-sm text-rose-300" role="alert">
              <ShieldAlertIcon className="size-4 shrink-0" aria-hidden />
              {error}
            </p>
          )}

          {result && (
            <div className="mt-5 grid gap-3 rounded-xl border border-slate-800 bg-slate-900/70 p-4 sm:grid-cols-4">
              <div>
                <p className="text-xs text-slate-500">Grade</p>
                <p className="font-medium text-slate-100">{result.grade ?? result.catalogNumber ?? "—"}</p>
              </div>
              <div>
                <p className="text-xs text-slate-500">Mintage</p>
                <p className="font-medium text-slate-100">
                  {result.mintage != null ? result.mintage.toLocaleString("en-ZA") : "—"}
                </p>
              </div>
              <div>
                <p className="text-xs text-slate-500">Est. value</p>
                <p className="font-medium text-slate-100">
                  {result.estimatedValueCents != null ? formatZarCents(result.estimatedValueCents) : "—"}
                </p>
              </div>
              <div className="flex flex-col gap-1.5">
                <p className="text-xs text-slate-500">Status</p>
                <div className="flex flex-wrap gap-1.5">
                  {result.shieldEligible ? (
                    <Badge className="bg-emerald-500/20 text-emerald-300 hover:bg-emerald-500/20">Shield eligible</Badge>
                  ) : (
                    <Badge variant="outline" className="border-slate-600 text-slate-300">
                      No shield
                    </Badge>
                  )}
                  {result.alreadyLocked ? (
                    <Badge className="bg-amber-500/20 text-amber-200 hover:bg-amber-500/20">Locked on MintMark</Badge>
                  ) : (
                    <Badge variant="outline" className="border-slate-600 text-slate-300">
                      Not listed here
                    </Badge>
                  )}
                </div>
              </div>
              {result.historicalNotes && (
                <p className="sm:col-span-4 text-sm text-slate-400">{result.historicalNotes}</p>
              )}
            </div>
          )}
        </div>
      </div>
    </section>
  );
}
