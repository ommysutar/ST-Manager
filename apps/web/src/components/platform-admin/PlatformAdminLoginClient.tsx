"use client";

import { Button, Card, CardContent, CardDescription, CardHeader, CardTitle, Input, Label } from "@st-manager/ui";
import { useRouter } from "next/navigation";
import { type FormEvent, useEffect, useState } from "react";

import { usePlatformAuth } from "@/hooks/usePlatformAuth";
import { getApiErrorMessage } from "@/lib/api-error";

export function PlatformAdminLoginClient() {
  const router = useRouter();
  const { login, isAuthenticated } = usePlatformAuth();
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    if (isAuthenticated) {
      router.replace("/platform-admin");
    }
  }, [isAuthenticated, router]);

  async function handleSubmit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    if (!email.trim() || !password) {
      return;
    }

    setIsSubmitting(true);
    setError(null);

    try {
      await login(email.trim(), password);
      router.replace("/platform-admin");
    } catch (err) {
      setError(getApiErrorMessage(err, "Sign in failed"));
    } finally {
      setIsSubmitting(false);
    }
  }

  if (isAuthenticated) {
    return <div className="min-h-screen bg-background" />;
  }

  return (
    <div className="flex min-h-[100dvh] items-center justify-center bg-background p-4">
      <Card className="w-full max-w-md border-border/60 shadow-xl">
        <CardHeader className="space-y-1 text-center">
          <CardTitle className="page-title">Platform Admin</CardTitle>
          <CardDescription>Sign in to the ST Manager platform console</CardDescription>
        </CardHeader>
        <CardContent>
          <form className="space-y-4" onSubmit={handleSubmit}>
            <div className="space-y-2">
              <Label htmlFor="platform-admin-email">Email</Label>
              <Input
                id="platform-admin-email"
                type="email"
                autoComplete="username"
                value={email}
                onChange={(event) => setEmail(event.target.value)}
                disabled={isSubmitting}
                required
              />
            </div>
            <div className="space-y-2">
              <Label htmlFor="platform-admin-password">Password</Label>
              <Input
                id="platform-admin-password"
                type="password"
                autoComplete="current-password"
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
        </CardContent>
      </Card>
    </div>
  );
}
