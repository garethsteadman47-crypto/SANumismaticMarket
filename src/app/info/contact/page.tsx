import type { Metadata } from "next";
import { ClockIcon, MailIcon, MessageSquareIcon } from "lucide-react";

import { ContactForm } from "@/components/info/ContactForm";
import { InfoPageShell } from "@/components/info/InfoPageShell";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { SITE_NAME } from "@/lib/constants";

export const metadata: Metadata = {
  title: `Contact Us — ${SITE_NAME}`,
  description: "Reach MintMark support for general queries, disputes, SAAND verification, and advertising.",
};

export default function ContactPage() {
  return (
    <InfoPageShell
      title="Contact Us"
      description="Questions about an order, membership, or advertising? Send a note — our desk aims to reply within one business day."
    >
      <div className="grid gap-8 lg:grid-cols-[1.2fr_0.8fr]">
        <Card>
          <CardHeader>
            <CardTitle className="font-heading text-lg">Send a message</CardTitle>
            <CardDescription>General, dispute, SAAND verification, or advertising enquiries.</CardDescription>
          </CardHeader>
          <CardContent>
            <ContactForm />
          </CardContent>
        </Card>

        <aside className="flex flex-col gap-4">
          <Card>
            <CardHeader className="flex flex-row items-start gap-3 space-y-0">
              <MailIcon className="mt-0.5 size-4 text-amber-600" aria-hidden />
              <div>
                <CardTitle className="text-base">Support email</CardTitle>
                <CardDescription className="mt-1">
                  <a href="mailto:support@mintmark.co.za" className="text-foreground underline-offset-2 hover:underline">
                    support@mintmark.co.za
                  </a>
                </CardDescription>
              </div>
            </CardHeader>
          </Card>
          <Card>
            <CardHeader className="flex flex-row items-start gap-3 space-y-0">
              <ClockIcon className="mt-0.5 size-4 text-amber-600" aria-hidden />
              <div>
                <CardTitle className="text-base">Operating hours</CardTitle>
                <CardDescription className="mt-1">
                  Monday–Friday, 09:00–17:00 SAST. Weekends for urgent dispute triage only.
                </CardDescription>
              </div>
            </CardHeader>
          </Card>
          <Card>
            <CardHeader className="flex flex-row items-start gap-3 space-y-0">
              <MessageSquareIcon className="mt-0.5 size-4 text-amber-600" aria-hidden />
              <div>
                <CardTitle className="text-base">Response window</CardTitle>
                <CardDescription className="mt-1">
                  We aim to respond within <strong className="text-foreground">24 hours</strong> on business days.
                  Dispute threads are prioritised.
                </CardDescription>
              </div>
            </CardHeader>
          </Card>
        </aside>
      </div>
    </InfoPageShell>
  );
}
