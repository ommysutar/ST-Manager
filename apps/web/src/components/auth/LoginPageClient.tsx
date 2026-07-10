"use client";

import { Button, Card, CardContent, CardDescription, CardHeader, CardTitle, Input, Label } from "@st-manager/ui";
import Link from "next/link";
import { useRouter, useSearchParams } from "next/navigation";
import { Suspense, type FormEvent, useMemo, useState } from "react";

import { InvitationSessionConflict } from "@/components/auth/InvitationSessionConflict";
import { useAuth } from "@/hooks/useAuth";
import { authApi, teamMembersApi } from "@/lib/api-client";
import { getApiErrorMessage } from "@/lib/api-error";
import { tokenStore } from "@/lib/token-store";

function LoginForm() {
  const router = useRouter();
  const searchParams = useSearchParams();
  const invitationToken = searchParams.get("invitation");
  const activated = searchParams.get("activated") === "1";
  const { isAuthenticated } = useAuth();
  const [sessionCleared, setSessionCleared] = useState(false);
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const invitationUrl = useMemo(() => {
    if (typeof window === "undefined" || !invitationToken) {
      return "";
    }
    return `${window.location.origin}/login?invitation=${encodeURIComponent(invitationToken)}`;
  }, [invitationToken]);

  async function handleSubmit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    if (!email.trim() || !password) {
      return;
    }

    setIsSubmitting(true);
    setError(null);

    try {
      const session = await authApi.login({ email: email.trim(), password });
      tokenStore.setSession(session.accessToken, session.refreshToken, session.user);

      if (invitationToken) {
        await teamMembersApi.acceptInvitationForExistingUser(invitationToken);
      }

      setPassword("");
      router.replace("/");
    } catch (err) {
      setError(getApiErrorMessage(err, "Sign in failed"));
    } finally {
      setIsSubmitting(false);
    }
  }

  if (invitationToken && isAuthenticated && !sessionCleared) {
    return (
      <div className="flex min-h-[100dvh] items-center justify-center bg-background p-4 sm:p-6">
        <InvitationSessionConflict
          invitationUrl={invitationUrl}
          onSignedOut={() => setSessionCleared(true)}
        />
      </div>
    );
  }

  return (
    <div className="flex min-h-[100dvh] items-center justify-center bg-background p-4 sm:p-6">
      <Card className="w-full max-w-md border-border/60 shadow-xl">
        <CardHeader className="space-y-1 text-center">
          <CardTitle className="page-title">ST Manager v1.0</CardTitle>
          <CardDescription>
            {invitationToken
              ? "Sign in to accept your team invitation"
              : "Sign in to manage your studio"}
          </CardDescription>
        </CardHeader>
        <CardContent>
          {activated ? (
            <p className="mb-4 rounded-md border border-emerald-200 bg-emerald-50 px-3 py-2 text-sm text-emerald-700">
              Activation successful. Sign in to continue.
            </p>
          ) : null}
          <form className="space-y-4" onSubmit={handleSubmit}>
            <div className="space-y-2">
              <Label htmlFor="login-email">Email</Label>
              <Input
                id="login-email"
                type="email"
                autoComplete="email"
                placeholder="you@studio.com"
                value={email}
                onChange={(event) => setEmail(event.target.value)}
                disabled={isSubmitting}
                required
              />
            </div>
            <div className="space-y-2">
              <Label htmlFor="login-password">Password</Label>
              <Input
                id="login-password"
                type="password"
                autoComplete="current-password"
                placeholder="Password"
                value={password}
                onChange={(event) => setPassword(event.target.value)}
                disabled={isSubmitting}
                required
              />
            </div>
            {error ? <p className="text-sm text-destructive">{error}</p> : null}
            <Button type="submit" className="w-full" size="lg" disabled={isSubmitting || !email || !password}>
              {isSubmitting ? "Signing in..." : "Sign In"}
            </Button>
          </form>
          {!invitationToken ? (
            <div className="mt-4 text-center">
              <Button asChild variant="link" className="text-sm">
                <Link href="/login/create-account">Create Account</Link>
              </Button>
            </div>
          ) : null}
        </CardContent>
      </Card>
    </div>
  );
}

export function LoginPageClient() {
  return (
    <Suspense
      fallback={
        <div className="flex min-h-[100dvh] items-center justify-center bg-background p-4">
          <p className="text-sm text-muted-foreground">Loading…</p>
        </div>
      }
    >
      <LoginForm />
    </Suspense>
  );
}
