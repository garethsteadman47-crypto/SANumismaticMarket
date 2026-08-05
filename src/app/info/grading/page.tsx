import type { Metadata } from "next";
import {
  ClockIcon,
  GlobeIcon,
  MapPinIcon,
  ScaleIcon,
  ShieldCheckIcon,
  SparklesIcon,
} from "lucide-react";
import type { LucideIcon } from "lucide-react";

import { SITE_NAME } from "@/lib/constants";
import { cn } from "@/lib/utils";

export const metadata: Metadata = {
  title: `Grading & Certification — ${SITE_NAME}`,
  description:
    "Compare SANGS, NGC, and PCGS standards, pricing, and submission guidelines for South African collectors.",
};

const SHELDON_ROWS = [
  { grade: "1–15", band: "Poor – Fine", note: "Heavy wear; major devices still identifiable." },
  { grade: "20–45", band: "VF – XF", note: "Moderate to light wear; remaining detail is sharp." },
  { grade: "50–58", band: "AU", note: "About Uncirculated — trace friction on the highest points." },
  { grade: "MS-60 – MS-70", band: "Mint State", note: "No circulation wear. MS-70 is flawless under magnification." },
  { grade: "PF-60 – PF-70", band: "Proof", note: "Special striking for collectors; mirrored fields, frosted devices." },
] as const;

type ServiceCard = {
  id: string;
  name: string;
  fullName: string;
  accent: string;
  icon: LucideIcon;
  focus: string;
  location: string;
  pricing: string;
  keyDetail: string;
  bullets: string[];
};

const SERVICES: ServiceCard[] = [
  {
    id: "sangs",
    name: "SANGS",
    fullName: "South African Numismatic Grading Service",
    accent: "border-emerald-500/35 bg-emerald-500/5",
    icon: MapPinIcon,
    focus: "Local South African market — highly accessible for domestic traders.",
    location: "South Africa (no international shipping required).",
    pricing:
      "Varies by item. Generally the most cost-effective for domestic trading, though some premium international buyers may prefer NGC or PCGS.",
    keyDetail: "Quickest turnaround times for local ZAR and Union coins.",
    bullets: [
      "Strong familiarity with ZAR, Union, and Republic series",
      "Ideal when the buyer pool is primarily South African",
      "Lower logistics friction than US-based submissions",
    ],
  },
  {
    id: "ngc",
    name: "NGC",
    fullName: "Numismatic Guaranty Company",
    accent: "border-sky-500/35 bg-sky-500/5",
    icon: GlobeIcon,
    focus: "International liquidity — a global market standard.",
    location: "USA / international offices (requires international courier).",
    pricing:
      "Tiered in USD (e.g. Economy ~$25/coin for values under $300, up to $80+ for Express). Additional handling and international shipping fees apply.",
    keyDetail: "Ideal for high-value ZAR coins, premium bullion, and lots destined for international auction.",
    bullets: [
      "Deep population reports and EdgeView holders",
      "Strong recognition with overseas bidders",
      "Plan for courier, insurance, and FX on top of grading fees",
    ],
  },
  {
    id: "pcgs",
    name: "PCGS",
    fullName: "Professional Coin Grading Service",
    accent: "border-amber-500/40 bg-amber-500/5",
    icon: SparklesIcon,
    focus: "International liquidity with a reputation for strict grading.",
    location: "USA / international offices (requires international courier).",
    pricing:
      "Tiered in USD (e.g. Modern ~$17–$30/coin; Regular ~$38 for values up to $2,500). Gold Shield and imaging fees often apply.",
    keyDetail: "Widely respected globally; often commands a slight premium in the US market for elite vintage coins.",
    bullets: [
      "Secure Plus holders and True View imaging",
      "Favoured for top-end Union and world rarities",
      "Budget for imaging / Gold Shield add-ons on premium pieces",
    ],
  },
];

export default function GradingPage() {
  return (
    <main className="min-h-full bg-slate-950 text-slate-100">
      <div className="relative overflow-hidden border-b border-slate-800">
        <div className="pointer-events-none absolute inset-0 bg-[radial-gradient(ellipse_at_top,_rgba(245,158,11,0.14),_transparent_55%),radial-gradient(ellipse_at_bottom_right,_rgba(56,189,248,0.08),_transparent_45%)]" />
        <div className="relative mx-auto flex max-w-6xl flex-col gap-4 px-4 py-14 sm:py-16">
          <p className="text-xs font-medium tracking-[0.2em] text-amber-400/90 uppercase">
            More Info · Grading & Certification
          </p>
          <h1 className="font-heading max-w-3xl text-3xl font-semibold tracking-tight text-white sm:text-4xl md:text-5xl">
            Understanding Coin Grading & Certification
          </h1>
          <p className="max-w-2xl text-base leading-relaxed text-slate-400 sm:text-lg">
            A comprehensive guide to SANGS, NGC, and PCGS standards, pricing, and submission guidelines for South
            African collectors.
          </p>
        </div>
      </div>

      <div className="mx-auto flex max-w-6xl flex-col gap-14 px-4 py-12">
        {/* Sheldon scale */}
        <section className="flex flex-col gap-5">
          <div className="flex items-center gap-2">
            <ScaleIcon className="size-5 text-amber-400" aria-hidden />
            <h2 className="font-heading text-xl font-semibold text-white sm:text-2xl">The Sheldon Scale</h2>
          </div>
          <p className="max-w-3xl text-sm leading-relaxed text-slate-400">
            Modern third-party grading is built on the Sheldon 1–70 numeric scale. Circulated grades sit below 60;
            Mint State uses the <span className="text-slate-200">MS</span> prefix and Proof uses{" "}
            <span className="text-slate-200">PF</span> (or PR). A single point can move thousands of rand on key dates.
          </p>
          <div className="overflow-hidden rounded-xl border border-slate-800 bg-slate-900/60">
            <table className="w-full text-left text-sm">
              <thead className="bg-slate-900 text-xs tracking-wide text-slate-500 uppercase">
                <tr>
                  <th className="px-4 py-3 font-medium">Grade</th>
                  <th className="px-4 py-3 font-medium">Band</th>
                  <th className="hidden px-4 py-3 font-medium sm:table-cell">What it means</th>
                </tr>
              </thead>
              <tbody>
                {SHELDON_ROWS.map((row) => (
                  <tr key={row.grade} className="border-t border-slate-800">
                    <td className="px-4 py-3 font-medium tabular-nums text-amber-100">{row.grade}</td>
                    <td className="px-4 py-3 text-slate-200">{row.band}</td>
                    <td className="hidden px-4 py-3 text-slate-400 sm:table-cell">{row.note}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </section>

        {/* Service cards */}
        <section className="flex flex-col gap-5">
          <h2 className="font-heading text-xl font-semibold text-white sm:text-2xl">Service comparison</h2>
          <div className="grid gap-4 lg:grid-cols-3">
            {SERVICES.map((service) => {
              const Icon = service.icon;
              return (
                <article
                  key={service.id}
                  className={cn(
                    "flex flex-col gap-4 rounded-2xl border p-5 shadow-lg shadow-black/20",
                    service.accent,
                  )}
                >
                  <header className="flex items-start gap-3">
                    <span className="flex size-10 shrink-0 items-center justify-center rounded-xl bg-black/30 ring-1 ring-white/10">
                      <Icon className="size-5 text-slate-100" aria-hidden />
                    </span>
                    <div>
                      <h3 className="font-heading text-lg font-semibold text-white">{service.name}</h3>
                      <p className="text-xs text-slate-400">{service.fullName}</p>
                    </div>
                  </header>

                  <dl className="flex flex-col gap-3 text-sm">
                    <div>
                      <dt className="text-xs font-medium tracking-wide text-slate-500 uppercase">Focus</dt>
                      <dd className="mt-1 text-slate-300">{service.focus}</dd>
                    </div>
                    <div>
                      <dt className="text-xs font-medium tracking-wide text-slate-500 uppercase">Location</dt>
                      <dd className="mt-1 text-slate-300">{service.location}</dd>
                    </div>
                    <div>
                      <dt className="text-xs font-medium tracking-wide text-slate-500 uppercase">Pricing</dt>
                      <dd className="mt-1 text-slate-300">{service.pricing}</dd>
                    </div>
                    <div className="rounded-xl border border-white/10 bg-black/25 px-3 py-2.5">
                      <dt className="flex items-center gap-1.5 text-xs font-medium tracking-wide text-amber-400/90 uppercase">
                        <ClockIcon className="size-3.5" aria-hidden />
                        Key detail
                      </dt>
                      <dd className="mt-1.5 text-slate-200">{service.keyDetail}</dd>
                    </div>
                  </dl>

                  <ul className="mt-auto flex flex-col gap-2 border-t border-white/10 pt-4">
                    {service.bullets.map((bullet) => (
                      <li key={bullet} className="flex gap-2 text-xs leading-snug text-slate-400">
                        <ShieldCheckIcon className="mt-0.5 size-3.5 shrink-0 text-slate-500" aria-hidden />
                        {bullet}
                      </li>
                    ))}
                  </ul>
                </article>
              );
            })}
          </div>
        </section>

        {/* MintMark stance */}
        <aside className="rounded-2xl border border-amber-500/25 bg-gradient-to-br from-amber-500/10 via-slate-900 to-slate-950 px-5 py-6 sm:px-7">
          <p className="text-xs font-medium tracking-[0.18em] text-amber-400 uppercase">MintMark&apos;s stance</p>
          <p className="mt-3 max-w-3xl text-sm leading-relaxed text-slate-300 sm:text-base">
            MintMark supports the trading of coins graded by SANGS, NGC, and PCGS. When listing an item, please
            accurately input the grading service and the certification serial number so buyers can verify the
            slab&apos;s authenticity.
          </p>
        </aside>
      </div>
    </main>
  );
}
