"use client";

import { useState, useTransition } from "react";
import { useRouter } from "next/navigation";
import { toast } from "sonner";
import { BellIcon, FilterXIcon, Loader2Icon, SearchXIcon } from "lucide-react";

import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
} from "@/components/ui/dialog";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { saveSearchAction } from "@/actions/saved-search";

export function BrowseEmptyState({ basePath, queryString }: { basePath: string; queryString: string }) {
  const [label, setLabel] = useState("");
  const [open, setOpen] = useState(false);
  const [isPending, startTransition] = useTransition();
  const router = useRouter();

  function handleSave() {
    startTransition(async () => {
      const result = await saveSearchAction(label || "My saved search", queryString);
      if (!result.success) {
        toast.error(result.error);
        return;
      }
      toast.success("Search saved — we'll add notifications here once new listings can alert you.");
      setOpen(false);
      setLabel("");
    });
  }

  return (
    <Card className="mx-auto max-w-md">
      <CardHeader className="items-center text-center">
        <div className="flex size-12 items-center justify-center rounded-full bg-muted text-muted-foreground">
          <SearchXIcon className="size-6" />
        </div>
        <CardTitle>No listings match these filters</CardTitle>
        <CardDescription>Try clearing a filter, or save this search to check back later.</CardDescription>
      </CardHeader>
      <CardContent className="flex flex-col items-center gap-2">
        <Button type="button" onClick={() => router.push(basePath)}>
          <FilterXIcon />
          Clear Filters
        </Button>

        <Dialog open={open} onOpenChange={setOpen}>
          <DialogTrigger render={<Button type="button" variant="outline" />}>
            <BellIcon />
            Save this search
          </DialogTrigger>
          <DialogContent>
            <DialogHeader>
              <DialogTitle>Save this search</DialogTitle>
              <DialogDescription>
                We&apos;ll keep this exact filter combination on your account so you can revisit it quickly. (New-match
                notifications are coming soon — this saves the search itself for now.)
              </DialogDescription>
            </DialogHeader>
            <div className="flex flex-col gap-1.5">
              <Label htmlFor="saved-search-label">Label</Label>
              <Input
                id="saved-search-label"
                placeholder="e.g. Gold Krugerrands under R50,000"
                value={label}
                onChange={(event) => setLabel(event.target.value)}
              />
            </div>
            <DialogFooter>
              <Button type="button" disabled={isPending} onClick={handleSave}>
                {isPending && <Loader2Icon className="animate-spin" />}
                Save search
              </Button>
            </DialogFooter>
          </DialogContent>
        </Dialog>
      </CardContent>
    </Card>
  );
}
