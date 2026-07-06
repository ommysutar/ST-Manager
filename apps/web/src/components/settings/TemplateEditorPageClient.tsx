"use client";

import { layout } from "@st-manager/theme";
import { Button, Card, CardContent, CardDescription, CardHeader, CardTitle, Input, Label, Textarea } from "@st-manager/ui";
import Link from "next/link";
import { useRef, useState } from "react";
import { toast } from "sonner";

import { useAuth } from "@/hooks/useAuth";
import { useProfile, useSaveProfile } from "@/hooks/useProfile";
import type { BankDetails, StudioProfile } from "@/lib/profile/types";

async function readImageFile(file: File): Promise<string> {
  return new Promise((resolve, reject) => {
    const reader = new FileReader();
    reader.onload = () => resolve(String(reader.result ?? ""));
    reader.onerror = () => reject(new Error("Failed to read image"));
    reader.readAsDataURL(file);
  });
}

function ImageField({
  label,
  value,
  onChange,
}: {
  label: string;
  value: string;
  onChange: (dataUrl: string) => void;
}) {
  const inputRef = useRef<HTMLInputElement>(null);

  return (
    <div className="space-y-2">
      <Label>{label}</Label>
      <div className="flex items-center gap-3">
        {value ? (
          <img src={value} alt={label} className="size-16 rounded-lg border object-contain p-1" />
        ) : (
          <div className="flex size-16 items-center justify-center rounded-lg border border-dashed text-xs text-muted-foreground">
            No image
          </div>
        )}
        <input
          ref={inputRef}
          type="file"
          accept="image/*"
          className="hidden"
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
        <Button type="button" variant="outline" size="sm" onClick={() => inputRef.current?.click()}>
          Upload
        </Button>
      </div>
    </div>
  );
}

export function TemplateEditorPageClient() {
  const { user } = useAuth();
  const profile = useProfile(user);
  const saveProfile = useSaveProfile(user);
  const [draft, setDraft] = useState<StudioProfile | null>(null);

  const form = draft ?? profile;
  const isOwner = user?.role === "owner";

  function updateField<K extends keyof StudioProfile>(key: K, value: StudioProfile[K]) {
    if (!form) {
      return;
    }
    setDraft({ ...form, [key]: value });
  }

  function updateBankField<K extends keyof BankDetails>(key: K, value: string) {
    if (!form) {
      return;
    }
    setDraft({ ...form, bankDetails: { ...form.bankDetails, [key]: value } });
  }

  function handleSave() {
    if (!form || !user) {
      return;
    }
    saveProfile(form);
    setDraft(null);
    toast.success("Template updated", {
      description: "Changes are reflected instantly in Quotation and Invoice.",
    });
  }

  if (!user) {
    return (
      <Card>
        <CardContent className="pt-6">
          <p className="text-sm text-muted-foreground">Sign in to access settings.</p>
        </CardContent>
      </Card>
    );
  }

  if (!isOwner) {
    return (
      <Card>
        <CardContent className="pt-6">
          <p className="text-sm text-muted-foreground">Only the Owner can edit the invoice & quotation template.</p>
        </CardContent>
      </Card>
    );
  }

  if (!form) {
    return <p className="text-sm text-muted-foreground">Loading template...</p>;
  }

  return (
    <div className="mx-auto flex flex-col gap-6" style={{ maxWidth: layout.contentMaxWidth }}>
      <div>
        <Link href="/settings" className="text-sm text-primary underline-offset-4 hover:underline">
          Back to settings
        </Link>
        <h1 className="mt-2 text-2xl font-semibold tracking-tight">Invoice &amp; Quotation Template</h1>
        <p className="text-sm text-muted-foreground">
          Branding, banking, and legal details reused on every generated Quotation and Invoice.
        </p>
      </div>

      <Card className="border-border/60 bg-background/60 backdrop-blur-md dark:bg-background/30">
        <CardHeader>
          <CardTitle className="text-base">Branding</CardTitle>
          <CardDescription>Shown in the document header and signature block.</CardDescription>
        </CardHeader>
        <CardContent className="grid gap-4 sm:grid-cols-2">
          <ImageField label="Studio Logo" value={form.logoDataUrl} onChange={(v) => updateField("logoDataUrl", v)} />
          <ImageField
            label="Owner Signature"
            value={form.signatureDataUrl}
            onChange={(v) => updateField("signatureDataUrl", v)}
          />
          <div className="space-y-2">
            <Label>Studio Name</Label>
            <Input value={form.studioName} onChange={(e) => updateField("studioName", e.target.value)} />
          </div>
          <div className="space-y-2">
            <Label>Phone</Label>
            <Input value={form.mobile} onChange={(e) => updateField("mobile", e.target.value)} />
          </div>
          <div className="space-y-2">
            <Label>Email</Label>
            <Input value={form.email} onChange={(e) => updateField("email", e.target.value)} />
          </div>
          <div className="space-y-2">
            <Label>Website</Label>
            <Input value={form.website} onChange={(e) => updateField("website", e.target.value)} />
          </div>
          <div className="space-y-2 sm:col-span-2">
            <Label>Address</Label>
            <Textarea rows={2} value={form.address} onChange={(e) => updateField("address", e.target.value)} />
          </div>
          <div className="space-y-2">
            <Label>GST Number (future ready)</Label>
            <Input value={form.gstNumber} onChange={(e) => updateField("gstNumber", e.target.value)} />
          </div>
        </CardContent>
      </Card>

      <Card className="border-border/60 bg-background/60 backdrop-blur-md dark:bg-background/30">
        <CardHeader>
          <CardTitle className="text-base">Bank &amp; UPI Details</CardTitle>
          <CardDescription>Displayed on Invoice for client bank transfers and UPI payments.</CardDescription>
        </CardHeader>
        <CardContent className="grid gap-4 sm:grid-cols-2">
          <div className="space-y-2">
            <Label>Account Holder Name</Label>
            <Input
              value={form.bankDetails.accountName}
              onChange={(e) => updateBankField("accountName", e.target.value)}
            />
          </div>
          <div className="space-y-2">
            <Label>Account Number</Label>
            <Input
              value={form.bankDetails.accountNumber}
              onChange={(e) => updateBankField("accountNumber", e.target.value)}
            />
          </div>
          <div className="space-y-2">
            <Label>IFSC Code</Label>
            <Input value={form.bankDetails.ifsc} onChange={(e) => updateBankField("ifsc", e.target.value)} />
          </div>
          <div className="space-y-2">
            <Label>Bank Name</Label>
            <Input
              value={form.bankDetails.bankName}
              onChange={(e) => updateBankField("bankName", e.target.value)}
            />
          </div>
          <div className="space-y-2">
            <Label>UPI ID</Label>
            <Input
              placeholder="studio@upi"
              value={form.upiId}
              onChange={(e) => updateField("upiId", e.target.value)}
            />
          </div>
          <ImageField label="UPI QR Code" value={form.upiQrDataUrl} onChange={(v) => updateField("upiQrDataUrl", v)} />
        </CardContent>
      </Card>

      <Card className="border-border/60 bg-background/60 backdrop-blur-md dark:bg-background/30">
        <CardHeader>
          <CardTitle className="text-base">Document Footer</CardTitle>
          <CardDescription>Shown at the bottom of every Quotation and Invoice.</CardDescription>
        </CardHeader>
        <CardContent className="grid gap-4">
          <div className="space-y-2">
            <Label>Terms &amp; Conditions</Label>
            <Textarea
              rows={4}
              placeholder="e.g. 50% advance required to confirm booking. Balance due before final delivery."
              value={form.termsAndConditions}
              onChange={(e) => updateField("termsAndConditions", e.target.value)}
            />
          </div>
          <div className="space-y-2">
            <Label>Thank You Message</Label>
            <Input value={form.thankYouMessage} onChange={(e) => updateField("thankYouMessage", e.target.value)} />
          </div>
          <div className="space-y-2">
            <Label>Footer Text</Label>
            <Input
              placeholder="e.g. Follow us @swaratrupti"
              value={form.footerText}
              onChange={(e) => updateField("footerText", e.target.value)}
            />
          </div>
        </CardContent>
      </Card>

      <div className="flex justify-end">
        <Button onClick={handleSave}>Save Template</Button>
      </div>
    </div>
  );
}
