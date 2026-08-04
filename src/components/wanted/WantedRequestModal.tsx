"use client";

import { useState, useTransition } from "react";
import { toast } from "sonner";
import { BellIcon, Loader2Icon, SearchIcon } from "lucide-react";

import { Button } from "@/components/ui/button";
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
import { Textarea } from "@/components/ui/textarea";
import { createWantedItemAction } from "@/actions/wishlist";
import { randsToCents } from "@/lib/utils/currency";

export function WantedRequestModal({ triggerLabel = "Create Wanted Request" }: { triggerLabel?: string }) {
  const [open, setOpen] = useState(false);
  const [eraCategory, setEraCategory] = useState("");
  const [targetYear, setTargetYear] = useState("");
  const [minimumGrade, setMinimumGrade] = useState("");
  const [budgetRands, setBudgetRands] = useState("");
  const [notes, setNotes] = useState("");
  const [isPending, startTransition] = useTransition();

  function handleSubmit() {
    const budget = Number.parseFloat(budgetRands);
    if (!eraCategory.trim() || !Number.isFinite(budget) || budget <= 0) {
      toast.error("Enter an era/category and a target budget.");
      return;
    }
    startTransition(async () => {
      const result = await createWantedItemAction({
        eraCategory,
        targetYear: targetYear ? Number(targetYear) : undefined,
        minimumGrade: minimumGrade || undefined,
        budgetCents: randsToCents(budget),
        notes: notes || undefined,
      });
      if (!result.success) {
        toast.error(result.error);
        return;
      }
      toast.success("Wanted request saved — we'll alert you when a match lists.");
      setOpen(false);
      setEraCategory("");
      setTargetYear("");
      setMinimumGrade("");
      setBudgetRands("");
      setNotes("");
    });
  }

  return (
    <Dialog open={open} onOpenChange={setOpen}>
      <DialogTrigger render={<Button type="button" variant="outline" />}>
        <SearchIcon />
        {triggerLabel}
      </DialogTrigger>
      <DialogContent>
        <DialogHeader>
          <DialogTitle>Create Wanted Request</DialogTitle>
          <DialogDescription>
            Tell us what you&apos;re hunting. When a matching coin lists on MintMark, we&apos;ll notify your dashboard
            (email alerts coming soon).
          </DialogDescription>
        </DialogHeader>
        <div className="flex flex-col gap-3">
          <div className="flex flex-col gap-1.5">
            <Label htmlFor="era">Era / Category</Label>
            <Input
              id="era"
              value={eraCategory}
              onChange={(e) => setEraCategory(e.target.value)}
              placeholder="e.g. ZAR Union, Silver Krugerrand"
            />
          </div>
          <div className="grid grid-cols-2 gap-3">
            <div className="flex flex-col gap-1.5">
              <Label htmlFor="year">Target year</Label>
              <Input
                id="year"
                inputMode="numeric"
                value={targetYear}
                onChange={(e) => setTargetYear(e.target.value)}
                placeholder="1967"
              />
            </div>
            <div className="flex flex-col gap-1.5">
              <Label htmlFor="grade">Minimum grade</Label>
              <Input
                id="grade"
                value={minimumGrade}
                onChange={(e) => setMinimumGrade(e.target.value)}
                placeholder="MS65 / AU"
              />
            </div>
          </div>
          <div className="flex flex-col gap-1.5">
            <Label htmlFor="budget">Target budget (ZAR)</Label>
            <Input
              id="budget"
              inputMode="decimal"
              value={budgetRands}
              onChange={(e) => setBudgetRands(e.target.value)}
              placeholder="15000"
            />
          </div>
          <div className="flex flex-col gap-1.5">
            <Label htmlFor="notes">Notes</Label>
            <Textarea id="notes" value={notes} onChange={(e) => setNotes(e.target.value)} rows={3} />
          </div>
        </div>
        <DialogFooter>
          <Button type="button" onClick={handleSubmit} disabled={isPending}>
            {isPending ? <Loader2Icon className="animate-spin" /> : <BellIcon />}
            Save wanted request
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
