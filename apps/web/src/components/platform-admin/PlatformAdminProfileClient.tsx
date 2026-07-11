"use client";

import {
  Button,
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
  Input,
  Label,
} from "@st-manager/ui";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { type FormEvent, useEffect, useState } from "react";
import { toast } from "sonner";

import { usePlatformAuth } from "@/hooks/usePlatformAuth";
import { getApiErrorMessage } from "@/lib/api-error";
import { platformAdminApi } from "@/lib/platform-api-client";

export function PlatformAdminProfileClient() {
  const router = useRouter();
  const { isAuthenticated, logout, user } = usePlatformAuth();
  const [email, setEmail] = useState("");
  const [currentPassword, setCurrentPassword] = useState("");
  const [newPassword, setNewPassword] = useState("");
  const [confirmNewPassword, setConfirmNewPassword] = useState("");
  const [loading, setLoading] = useState(true);
  const [submitting, setSubmitting] = useState(false);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    if (!isAuthenticated) {
      router.replace("/platform-admin/login");
      return;
    }

    void Promise.resolve()
      .then(() => platformAdminApi.getProfile())
      .then((profile) => {
        setEmail(profile.email);
      })
      .catch((err) => {
        setError(getApiErrorMessage(err, "Failed to load profile"));
      })
      .finally(() => setLoading(false));
  }, [isAuthenticated, router]);

  async function handleSubmit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    setError(null);

    if (!currentPassword) {
      setError("Current password is required");
      return;
    }

    const trimmedEmail = email.trim();
    const emailChanged = trimmedEmail && trimmedEmail !== user?.email;
    if (!emailChanged && !newPassword) {
      setError("Provide a new email and/or new password");
      return;
    }

    if (newPassword && newPassword !== confirmNewPassword) {
      setError("Passwords do not match");
      return;
    }

    setSubmitting(true);
    try {
      await platformAdminApi.updateProfile({
        currentPassword,
        ...(emailChanged ? { email: trimmedEmail } : {}),
        ...(newPassword
          ? { newPassword, confirmNewPassword }
          : {}),
      });
      toast.success("Profile updated. Please sign in again.");
      logout();
      router.replace("/platform-admin/login");
    } catch (err) {
      setError(getApiErrorMessage(err, "Failed to update profile"));
    } finally {
      setSubmitting(false);
    }
  }

  if (!isAuthenticated) {
    return <div className="min-h-screen bg-background" />;
  }

  return (
    <div className="mx-auto flex min-h-[100dvh] w-full max-w-lg flex-col gap-6 p-6">
      <div>
        <Button asChild variant="ghost" className="mb-2 px-0">
          <Link href="/platform-admin">← Back to Platform Admin</Link>
        </Button>
        <h1 className="text-2xl font-semibold tracking-tight">Profile</h1>
        <p className="text-sm text-muted-foreground">
          Update your platform admin email or password
        </p>
      </div>

      {loading ? <p className="text-sm text-muted-foreground">Loading profile…</p> : null}

      {!loading ? (
        <Card>
          <CardHeader>
            <CardTitle>Account settings</CardTitle>
            <CardDescription>
              Changing email or password signs you out immediately after success.
            </CardDescription>
          </CardHeader>
          <CardContent>
            <form className="space-y-4" onSubmit={(event) => void handleSubmit(event)}>
              <div className="space-y-2">
                <Label htmlFor="profile-email">Email</Label>
                <Input
                  id="profile-email"
                  type="email"
                  autoComplete="username"
                  value={email}
                  onChange={(event) => setEmail(event.target.value)}
                  disabled={submitting}
                  required
                />
              </div>
              <div className="space-y-2">
                <Label htmlFor="profile-current-password">Current password</Label>
                <Input
                  id="profile-current-password"
                  type="password"
                  autoComplete="current-password"
                  value={currentPassword}
                  onChange={(event) => setCurrentPassword(event.target.value)}
                  disabled={submitting}
                  required
                />
              </div>
              <div className="space-y-2">
                <Label htmlFor="profile-new-password">New password</Label>
                <Input
                  id="profile-new-password"
                  type="password"
                  autoComplete="new-password"
                  value={newPassword}
                  onChange={(event) => setNewPassword(event.target.value)}
                  disabled={submitting}
                  minLength={8}
                />
              </div>
              <div className="space-y-2">
                <Label htmlFor="profile-confirm-password">Confirm new password</Label>
                <Input
                  id="profile-confirm-password"
                  type="password"
                  autoComplete="new-password"
                  value={confirmNewPassword}
                  onChange={(event) => setConfirmNewPassword(event.target.value)}
                  disabled={submitting}
                  minLength={8}
                />
              </div>
              {error ? <p className="text-sm text-destructive">{error}</p> : null}
              <Button type="submit" disabled={submitting} className="w-full">
                {submitting ? "Saving…" : "Save changes"}
              </Button>
            </form>
          </CardContent>
        </Card>
      ) : null}
    </div>
  );
}
