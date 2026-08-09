"use client";

import { Button, Card, CardContent, CardDescription, CardHeader, CardTitle, Input, Label } from "@st-manager/ui";
import Link from "next/link";
import { type FormEvent, useState } from "react";

import { authApi } from "@/lib/api-client";
import { getApiErrorMessage } from "@/lib/api-error";

export function ForgotPasswordPageClient() {
  const [email, setEmail] = useState("");
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [successMessage, setSuccessMessage] = useState<string | null>(null);

  async function handleSubmit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    if (!email.trim()) {
      return;
    }

    setIsSubmitting(true);
    setError(null);
    setSuccessMessage(null);

    try {
      const result = await authApi.forgotPassword({ email: email.trim() });
      setSuccessMessage(result.message);
    } catch (err) {
      setError(getApiErrorMessage(err, "Could not send password reset email"));
    } finally {
      setIsSubmitting(false);
    }
  }

  return (
    <div className="flex min-h-[100dvh] items-center justify-center bg-background p-4 sm:p-6">
      <Card className="w-full max-w-md border-border/60 shadow-xl">
        <CardHeader className="space-y-1 text-center">
          <CardTitle className="page-title">Forgot Password</CardTitle>
          <CardDescription>
            Enter your registered email and we will send a password reset link if an account exists.
          </CardDescription>
        </CardHeader>
        <CardContent>
          {successMessage ? (
            <div className="space-y-4">
              <p className="rounded-md border border-emerald-200 bg-emerald-50 px-3 py-2 text-sm text-emerald-700">
                {successMessage}
              </p>
              <Button asChild variant="outline" className="w-full">
                <Link href="/login">Back to Sign In</Link>
              </Button>
            </div>
          ) : (
            <form className="space-y-4" onSubmit={handleSubmit}>
              <div className="space-y-2">
                <Label htmlFor="forgot-email">Email</Label>
                <Input
                  id="forgot-email"
                  type="email"
                  autoComplete="email"
                  placeholder="you@studio.com"
                  value={email}
                  onChange={(event) => setEmail(event.target.value)}
                  disabled={isSubmitting}
                  required
                />
              </div>
              {error ? <p className="text-sm text-destructive">{error}</p> : null}
              <Button type="submit" className="w-full" size="lg" disabled={isSubmitting || !email.trim()}>
                {isSubmitting ? "Sending..." : "Send Reset Link"}
              </Button>
              <div className="text-center">
                <Button asChild variant="link" className="text-sm">
                  <Link href="/login">Back to Sign In</Link>
                </Button>
              </div>
            </form>
          )}
        </CardContent>
      </Card>
    </div>
  );
}
