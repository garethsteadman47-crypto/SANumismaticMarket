"use client";

import { useState, useTransition } from "react";
import { useRouter } from "next/navigation";
import { toast } from "sonner";
import { Loader2Icon, VideoIcon } from "lucide-react";

import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { uploadUnboxingVideoAction } from "@/actions/order";

export function BuyerUnboxingForm({ orderId, existingUrl }: { orderId: string; existingUrl?: string | null }) {
  const [videoUrl, setVideoUrl] = useState(existingUrl ?? "");
  const [isPending, startTransition] = useTransition();
  const router = useRouter();

  function handleSubmit() {
    if (!videoUrl.trim()) {
      toast.error("Enter your unboxing video URL first.");
      return;
    }
    startTransition(async () => {
      const result = await uploadUnboxingVideoAction(orderId, videoUrl.trim());
      if (!result.success) {
        toast.error(result.error);
        return;
      }
      toast.success("Unboxing video saved.");
      router.refresh();
    });
  }

  return (
    <Card>
      <CardHeader>
        <CardTitle className="flex items-center gap-1.5 text-base">
          <VideoIcon className="size-4" />
          Unboxing video
        </CardTitle>
        <CardDescription>
          Mandatory evidence for high-value items: record yourself opening the package and upload it here. This
          protects you in the event of a dispute.
        </CardDescription>
      </CardHeader>
      <CardContent className="flex flex-col gap-3 sm:flex-row sm:items-end">
        <div className="flex flex-1 flex-col gap-1.5">
          <Label htmlFor="unboxingVideoUrl">Video URL</Label>
          <Input
            id="unboxingVideoUrl"
            placeholder="https://example.com/unboxing-video.mp4"
            value={videoUrl}
            onChange={(event) => setVideoUrl(event.target.value)}
          />
        </div>
        <Button type="button" onClick={handleSubmit} disabled={isPending}>
          {isPending && <Loader2Icon className="animate-spin" />}
          {existingUrl ? "Update video" : "Save video"}
        </Button>
      </CardContent>
    </Card>
  );
}
