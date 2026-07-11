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
import { useEffect, useRef, useState } from "react";
import { toast } from "sonner";

import { useAuth } from "@/hooks/useAuth";
import { useProfile, useSaveProfile } from "@/hooks/useProfile";
import { studioProfileApi } from "@/lib/api-client";
import { getApiErrorMessage } from "@/lib/api-error";
import { mergeServerProfile } from "@/lib/profile/storage";
import type { StudioProfile } from "@/lib/profile/types";
import { tokenStore } from "@/lib/token-store";

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
  const saveLocalProfile = useSaveProfile(user);
  const [draft, setDraft] = useState<StudioProfile | null>(null);
  const [saving, setSaving] = useState(false);
  const [loadingServer, setLoadingServer] = useState(false);

  const form = draft ?? profile;
  const isOwner = user?.role === "owner";

  useEffect(() => {
    if (!open || !user) {
      return;
    }

    let cancelled = false;
    void Promise.resolve()
      .then(() => {
        setLoadingServer(true);
        return studioProfileApi.getProfile();
      })
      .then((serverProfile) => {
        if (cancelled) {
          return;
        }
        const merged = mergeServerProfile(user, serverProfile);
        setDraft(merged);
      })
      .catch(() => {
        // Keep local profile if server sync fails; local edits can still be saved.
      })
      .finally(() => {
        if (!cancelled) {
          setLoadingServer(false);
        }
      });

    return () => {
      cancelled = true;
    };
  }, [open, user]);

  function updateField<K extends keyof StudioProfile>(key: K, value: StudioProfile[K]) {
    if (!form) {
      return;
    }
    setDraft({ ...form, [key]: value });
  }

  async function handleSave() {
    if (!form || !user) {
      return;
    }

    setSaving(true);
    try {
      const updated = await studioProfileApi.updateProfile({
        fullName: form.fullName.trim(),
        phone: form.mobile.trim() || null,
        ...(isOwner && form.studioName.trim()
          ? { studioName: form.studioName.trim() }
          : {}),
      });

      saveLocalProfile({
        ...form,
        fullName: updated.fullName ?? form.fullName,
        mobile: updated.phone ?? form.mobile,
        studioName: updated.studioName ?? form.studioName,
        email: updated.email || form.email,
      });

      const sessionUser = tokenStore.getUser();
      if (sessionUser) {
        tokenStore.updateUser({
          ...sessionUser,
          fullName: updated.fullName ?? sessionUser.fullName,
        });
      }

      toast.success("Profile saved");
      onOpenChange(false);
      setDraft(null);
    } catch (error) {
      toast.error(getApiErrorMessage(error, "Failed to save profile"));
    } finally {
      setSaving(false);
    }
  }

  if (!user || !form) {
    return null;
  }

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
              : "Update your account profile details."}
          </DialogDescription>
        </DialogHeader>

        {loadingServer ? (
          <p className="text-sm text-muted-foreground">Loading profile…</p>
        ) : null}

        <div className="grid gap-4 sm:grid-cols-2">
          <ImageUploadField
            label="Profile Photo"
            value={form.profilePhotoDataUrl}
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
              onChange={(event) => updateField("mobile", event.target.value)}
            />
          </div>
          <div className="space-y-2">
            <Label>Email</Label>
            <Input value={form.email} disabled onChange={() => undefined} />
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
          <Button type="button" onClick={() => void handleSave()} disabled={saving || loadingServer}>
            {saving ? "Saving…" : "Save Profile"}
          </Button>
        </div>
      </DialogContent>
    </Dialog>
  );
}
