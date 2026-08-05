"use client";

import { useEffect, useState, useTransition } from "react";
import { useRouter } from "next/navigation";
import { toast } from "sonner";
import { Loader2Icon } from "lucide-react";

import { updateProfileAction } from "@/actions/profile";
import { Button } from "@/components/ui/button";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";

export type EditableProfile = {
  name: string;
  phoneNumber: string;
  location: string;
  bio: string;
  avatarUrl: string;
  bannerUrl: string;
};

const fieldClass =
  "bg-slate-900 border-slate-800 text-slate-100 placeholder:text-slate-500 focus-visible:border-amber-500 focus-visible:ring-amber-500/30";

export function EditProfileModal({
  open,
  onOpenChange,
  initial,
}: {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  initial: EditableProfile;
}) {
  const router = useRouter();
  const [isPending, startTransition] = useTransition();
  const [form, setForm] = useState<EditableProfile>(initial);

  useEffect(() => {
    if (open) setForm(initial);
  }, [open, initial]);

  function setField<K extends keyof EditableProfile>(key: K, value: EditableProfile[K]) {
    setForm((prev) => ({ ...prev, [key]: value }));
  }

  function handleSave() {
    startTransition(async () => {
      const result = await updateProfileAction({
        name: form.name,
        phoneNumber: form.phoneNumber,
        location: form.location,
        bio: form.bio,
        avatarUrl: form.avatarUrl,
        bannerUrl: form.bannerUrl,
      });
      if (!result.success) {
        toast.error(result.error);
        return;
      }
      toast.success("Profile updated.");
      onOpenChange(false);
      router.refresh();
    });
  }

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-h-[90vh] overflow-y-auto border-slate-800 bg-slate-950 text-slate-100 sm:max-w-lg">
        <DialogHeader>
          <DialogTitle className="font-heading text-xl text-white">Edit profile</DialogTitle>
          <DialogDescription className="text-slate-400">
            Showcase your collecting focus, contact details, and portfolio media.
          </DialogDescription>
        </DialogHeader>

        <div className="flex flex-col gap-4 py-2">
          <div className="grid gap-4 sm:grid-cols-2">
            <div className="flex flex-col gap-1.5 sm:col-span-2">
              <Label htmlFor="profile-name" className="text-slate-300">
                Display name
              </Label>
              <Input
                id="profile-name"
                value={form.name}
                onChange={(e) => setField("name", e.target.value)}
                placeholder="First and last name"
                className={fieldClass}
                autoComplete="name"
              />
            </div>
            <div className="flex flex-col gap-1.5">
              <Label htmlFor="profile-phone" className="text-slate-300">
                Phone number
              </Label>
              <Input
                id="profile-phone"
                value={form.phoneNumber}
                onChange={(e) => setField("phoneNumber", e.target.value)}
                placeholder="+27 …"
                className={fieldClass}
                autoComplete="tel"
              />
            </div>
            <div className="flex flex-col gap-1.5">
              <Label htmlFor="profile-location" className="text-slate-300">
                Location
              </Label>
              <Input
                id="profile-location"
                value={form.location}
                onChange={(e) => setField("location", e.target.value)}
                placeholder="Pretoria, GP"
                className={fieldClass}
              />
            </div>
          </div>

          <div className="flex flex-col gap-1.5">
            <Label htmlFor="profile-bio" className="text-slate-300">
              Collecting focus
            </Label>
            <Textarea
              id="profile-bio"
              value={form.bio}
              onChange={(e) => setField("bio", e.target.value)}
              placeholder="Specializing in ZAR and Union silver."
              rows={4}
              className={fieldClass}
            />
          </div>

          <div className="flex flex-col gap-1.5">
            <Label htmlFor="profile-avatar" className="text-slate-300">
              Avatar image URL
            </Label>
            <Input
              id="profile-avatar"
              value={form.avatarUrl}
              onChange={(e) => setField("avatarUrl", e.target.value)}
              placeholder="https://…"
              className={fieldClass}
            />
          </div>

          <div className="flex flex-col gap-1.5">
            <Label htmlFor="profile-banner" className="text-slate-300">
              Banner image URL
            </Label>
            <Input
              id="profile-banner"
              value={form.bannerUrl}
              onChange={(e) => setField("bannerUrl", e.target.value)}
              placeholder="https://…"
              className={fieldClass}
            />
          </div>
        </div>

        <DialogFooter>
          <Button
            type="button"
            variant="outline"
            className="border-slate-700 bg-transparent text-slate-200 hover:bg-slate-900"
            onClick={() => onOpenChange(false)}
            disabled={isPending}
          >
            Cancel
          </Button>
          <Button
            type="button"
            className="bg-amber-500 text-slate-950 hover:bg-amber-400"
            onClick={handleSave}
            disabled={isPending}
          >
            {isPending && <Loader2Icon className="animate-spin" />}
            Save Changes
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
