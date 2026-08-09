"use client";

import { Button, Card, CardContent, CardDescription, CardHeader, CardTitle, Input, Label } from "@st-manager/ui";
import Link from "next/link";
import { useRouter, useSearchParams } from "next/navigation";
import { Suspense, type FormEvent, useState } from "react";

import { authApi } from "@/lib/api-client";
import { getApiErrorMessage } from "@/lib/api-error";

function ResetPasswordForm() {
  const router = useRouter();
  const searchParams = useSearchParams();
  const token = searchParams.get("token")?.trim() ?? "";
  const [password, setPassword] = useState("");
  const [confirmPassword, setConfirmPassword] = useState("");
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [error, setError] = useState<string | null>(token ? null : "Invalid or missing reset link.");
  const [successMessage, setSuccessMessage] = useState<string | null>(null);

  async function handleSubmit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    if (!token) {
      setError("Invalid or missing reset link.");
      return;
    }
    if (password.length < 8) {
      setError("Password must be at least 8 characters");
      return;
    }
    if (password !== confirmPassword) {
      setError("Passwords do not match");
      return;
    }

    setIsSubmitting(true);
    setError(null);

    try {
      const result = await authApi.resetPassword({ token, password, confirmPassword });
      setSuccessMessage(result.message);
      setPassword("");
      setConfirmPassword("");
      window.setTimeout(() => {
        router.replace("/login");
      }, 1500);
    } catch (err) {
      setError(getApiErrorMessage(err, "Could not reset password"));
    } finally {
      setIsSubmitting(false);
    }
  }

  return (
    <div className="flex min-h-[100dvh] items-center justify-center bg-background p-4 sm:p-6">
      <Card className="w-full max-w-md border-border/60 shadow-xl">
        <CardHeader className="space-y-1 text-center">
          <CardTitle className="page-title">Reset Password</CardTitle>
          <CardDescription>Choose a new password for your ST Manager account.</CardDescription>
        </CardHeader>
        <CardContent>
          {successMessage ? (
            <div className="space-y-4">
              <p className="rounded-md border border-emerald-200 bg-emerald-50 px-3 py-2 text-sm text-emerald-700">
                {successMessage}
              </p>
              <Button asChild className="w-full">
                <Link href="/login">Continue to Sign In</Link>
              </Button>
            </div>
          ) : (
            <form className="space-y-4" onSubmit={handleSubmit}>
              <div className="space-y-2">
                <Label htmlFor="reset-password">New password</Label>
                <Input
                  id="reset-password"
                  type="password"
                  autoComplete="new-password"
                  placeholder="At least 8 characters"
                  value={password}
                  onChange={(event) => setPassword(event.target.value)}
                  disabled={isSubmitting || !token}
                  required
                  minLength={8}
                />
              </div>
              <div className="space-y-2">
                <Label htmlFor="reset-confirm-password">Confirm password</Label>
                <Input
                  id="reset-confirm-password"
                  type="password"
                  autoComplete="new-password"
                  placeholder="Re-enter password"
                  value={confirmPassword}
                  onChange={(event) => setConfirmPassword(event.target.value)}
                  disabled={isSubmitting || !token}
                  required
                  minLength={8}
                />
              </div>
              {error ? <p className="text-sm text-destructive">{error}</p> : null}
              <Button
                type="submit"
                className="w-full"
                size="lg"
                disabled={isSubmitting || !token || !password || !confirmPassword}
              >
                {isSubmitting ? "Updating..." : "Update Password"}
              </Button>
              <div className="text-center">
                <Button asChild variant="link" className="text-sm">
                  <Link href="/login/forgot-password">Request a new link</Link>
                </Button>
              </div>
            </form>
          )}
        </CardContent>
      </Card>
    </div>
  );
}

export function ResetPasswordPageClient() {
  return (
    <Suspense
      fallback={
        <div className="flex min-h-[100dvh] items-center justify-center bg-background p-4">
          <p className="text-sm text-muted-foreground">Loading…</p>
        </div>
      }
    >
      <ResetPasswordForm />
    </Suspense>
  );
}
