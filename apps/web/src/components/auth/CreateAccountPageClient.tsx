"use client";

import { Button, Card, CardContent, CardDescription, CardHeader, CardTitle, Input, Label } from "@st-manager/ui";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { type FormEvent, useState } from "react";

import { useAuth } from "@/hooks/useAuth";

export function CreateAccountPageClient() {
  const router = useRouter();
  const { isSubmitting, error, register } = useAuth();
  const [studioName, setStudioName] = useState("");
  const [ownerName, setOwnerName] = useState("");
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [confirmPassword, setConfirmPassword] = useState("");
  const [validationError, setValidationError] = useState<string | null>(null);

  async function handleSubmit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    setValidationError(null);

    if (password !== confirmPassword) {
      setValidationError("Passwords do not match");
      return;
    }

    if (!studioName.trim() || !ownerName.trim() || !email.trim() || !password) {
      return;
    }

    try {
      await register({
        studioName: studioName.trim(),
        ownerName: ownerName.trim(),
        email: email.trim(),
        password,
        confirmPassword,
      });
      router.replace("/");
    } catch {
      // Error state is owned by useAuth.
    }
  }

  const displayError = validationError ?? error;

  return (
    <div className="flex min-h-screen items-center justify-center bg-background p-6">
      <Card className="w-full max-w-md border-border/60 shadow-xl">
        <CardHeader className="space-y-1 text-center">
          <CardTitle className="text-2xl font-semibold tracking-tight">Create Account</CardTitle>
          <CardDescription>Set up your studio on ST Manager v1.0</CardDescription>
        </CardHeader>
        <CardContent>
          <form className="space-y-4" onSubmit={handleSubmit}>
            <div className="space-y-2">
              <Label htmlFor="register-studio-name">Studio Name</Label>
              <Input
                id="register-studio-name"
                autoComplete="organization"
                placeholder="Your studio name"
                value={studioName}
                onChange={(event) => setStudioName(event.target.value)}
                disabled={isSubmitting}
                required
              />
            </div>
            <div className="space-y-2">
              <Label htmlFor="register-owner-name">Owner Name</Label>
              <Input
                id="register-owner-name"
                autoComplete="name"
                placeholder="Your full name"
                value={ownerName}
                onChange={(event) => setOwnerName(event.target.value)}
                disabled={isSubmitting}
                required
              />
            </div>
            <div className="space-y-2">
              <Label htmlFor="register-email">Email</Label>
              <Input
                id="register-email"
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
              <Label htmlFor="register-password">Password</Label>
              <Input
                id="register-password"
                type="password"
                autoComplete="new-password"
                placeholder="Password"
                value={password}
                onChange={(event) => setPassword(event.target.value)}
                disabled={isSubmitting}
                required
              />
            </div>
            <div className="space-y-2">
              <Label htmlFor="register-confirm-password">Confirm Password</Label>
              <Input
                id="register-confirm-password"
                type="password"
                autoComplete="new-password"
                placeholder="Confirm password"
                value={confirmPassword}
                onChange={(event) => setConfirmPassword(event.target.value)}
                disabled={isSubmitting}
                required
              />
            </div>
            {displayError ? <p className="text-sm text-destructive">{displayError}</p> : null}
            <Button
              type="submit"
              className="w-full"
              size="lg"
              disabled={
                isSubmitting ||
                !studioName.trim() ||
                !ownerName.trim() ||
                !email.trim() ||
                !password ||
                !confirmPassword
              }
            >
              {isSubmitting ? "Creating account..." : "Create Account"}
            </Button>
          </form>
          <p className="mt-4 text-center text-sm text-muted-foreground">
            Already have an account?{" "}
            <Link href="/login" className="font-medium text-primary underline-offset-4 hover:underline">
              Sign in
            </Link>
          </p>
        </CardContent>
      </Card>
    </div>
  );
}
