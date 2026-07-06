"use client";

import {
  Button,
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
  Input,
  Label,
  Textarea,
} from "@st-manager/ui";
import { useRef, useState } from "react";
import { toast } from "sonner";

import { useAuth } from "@/hooks/useAuth";
import { useProfile, useSaveProfile } from "@/hooks/useProfile";
import type { StudioProfile } from "@/lib/profile/types";

interface ProfileSettingsDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
}

async function readImageFile(file: File): Promise<string> {
  return new Promise((resolve, reject) => {
    const reader = new FileReader();
    reader.onload = () => resolve(String(reader.result ?? ""));
    reader.onerror = () => reject(new Error("Failed to read image"));
    reader.readAsDataURL(file);
  });
}

function ImageUploadField({
  label,
  value,
  onChange,
  disabled = false,
}: {
  label: string;
  value: string;
  onChange: (dataUrl: string) => void;
  disabled?: boolean;
}) {
  const inputRef = useRef<HTMLInputElement>(null);

  return (
    <div className="space-y-2">
      <Label>{label}</Label>
      <div className="flex items-center gap-3">
        {value ? (
          <img src={value} alt={label} className="size-14 rounded-lg border object-cover" />
        ) : (
          <div className="flex size-14 items-center justify-center rounded-lg border border-dashed text-xs text-muted-foreground">
            No image
          </div>
        )}
        <input
          ref={inputRef}
          type="file"
          accept="image/*"
          className="hidden"
          disabled={disabled}
          onChange={async (event) => {
            const file = event.target.files?.[0];
            if (!file) {
              return;
            }
            try {
              onChange(await readImageFile(file));
            } catch {
              toast.error("Could not upload image");
            }
          }}
        />
        <Button
          type="button"
          variant="outline"
          size="sm"
          disabled={disabled}
          onClick={() => inputRef.current?.click()}
        >
          Upload
        </Button>
      </div>
    </div>
  );
}

export function ProfileSettingsDialog({ open, onOpenChange }: ProfileSettingsDialogProps) {
  const { user } = useAuth();
  const profile = useProfile(user);
  const saveProfile = useSaveProfile(user);
  const [draft, setDraft] = useState<StudioProfile | null>(null);

  const form = draft ?? profile;

  function updateField<K extends keyof StudioProfile>(key: K, value: StudioProfile[K]) {
    if (!form) {
      return;
    }
    setDraft({ ...form, [key]: value });
  }

  function handleSave() {
    if (!form || !user) {
      return;
    }

    saveProfile(form);
    toast.success("Profile saved");
    onOpenChange(false);
    setDraft(null);
  }

  if (!user || !form) {
    return null;
  }

  const isOwner = user.role === "owner";

  return (
    <Dialog
      open={open}
      onOpenChange={(next) => {
        onOpenChange(next);
        if (!next) {
          setDraft(null);
        }
      }}
    >
      <DialogContent className="max-h-[90vh] max-w-2xl overflow-y-auto">
        <DialogHeader>
          <DialogTitle>Studio Profile</DialogTitle>
          <DialogDescription>
            {isOwner
              ? "Owner profile details reused for invoices, quotations, and payments."
              : "View your account profile. Owner can edit studio branding."}
          </DialogDescription>
        </DialogHeader>

        <div className="grid gap-4 sm:grid-cols-2">
          <ImageUploadField
            label="Profile Photo"
            value={form.profilePhotoDataUrl}
            disabled={!isOwner}
            onChange={(value) => updateField("profilePhotoDataUrl", value)}
          />
          <ImageUploadField
            label="Studio Logo"
            value={form.logoDataUrl}
            disabled={!isOwner}
            onChange={(value) => updateField("logoDataUrl", value)}
          />
          <ImageUploadField
            label="UPI QR Image"
            value={form.upiQrDataUrl}
            disabled={!isOwner}
            onChange={(value) => updateField("upiQrDataUrl", value)}
          />
          <ImageUploadField
            label="Digital Signature"
            value={form.signatureDataUrl}
            disabled={!isOwner}
            onChange={(value) => updateField("signatureDataUrl", value)}
          />

          <div className="space-y-2">
            <Label>Full Name</Label>
            <Input
              value={form.fullName}
              disabled={!isOwner}
              onChange={(event) => updateField("fullName", event.target.value)}
            />
          </div>
          <div className="space-y-2">
            <Label>Studio Name</Label>
            <Input
              value={form.studioName}
              disabled={!isOwner}
              onChange={(event) => updateField("studioName", event.target.value)}
            />
          </div>
          <div className="space-y-2">
            <Label>Mobile</Label>
            <Input
              value={form.mobile}
              disabled={!isOwner}
              onChange={(event) => updateField("mobile", event.target.value)}
            />
          </div>
          <div className="space-y-2">
            <Label>Email</Label>
            <Input
              value={form.email}
              disabled={!isOwner}
              onChange={(event) => updateField("email", event.target.value)}
            />
          </div>
          <div className="space-y-2 sm:col-span-2">
            <Label>Address</Label>
            <Textarea
              rows={2}
              value={form.address}
              disabled={!isOwner}
              onChange={(event) => updateField("address", event.target.value)}
            />
          </div>
          <div className="space-y-2">
            <Label>Website</Label>
            <Input
              value={form.website}
              disabled={!isOwner}
              onChange={(event) => updateField("website", event.target.value)}
            />
          </div>
          <div className="space-y-2">
            <Label>Facebook</Label>
            <Input
              value={form.facebook}
              disabled={!isOwner}
              onChange={(event) => updateField("facebook", event.target.value)}
            />
          </div>
          <div className="space-y-2">
            <Label>Instagram</Label>
            <Input
              value={form.instagram}
              disabled={!isOwner}
              onChange={(event) => updateField("instagram", event.target.value)}
            />
          </div>
          <div className="space-y-2">
            <Label>YouTube</Label>
            <Input
              value={form.youtube}
              disabled={!isOwner}
              onChange={(event) => updateField("youtube", event.target.value)}
            />
          </div>
        </div>

        <div className="flex justify-end gap-2 pt-2">
          <Button type="button" variant="outline" onClick={() => onOpenChange(false)}>
            Cancel
          </Button>
          {isOwner ? (
            <Button type="button" onClick={handleSave}>
              Save Profile
            </Button>
          ) : null}
        </div>
      </DialogContent>
    </Dialog>
  );
}
