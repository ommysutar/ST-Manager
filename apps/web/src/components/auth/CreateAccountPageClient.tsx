"use client";

import { Button, Card, CardContent, CardDescription, CardHeader, CardTitle, Input, Label } from "@st-manager/ui";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { type FormEvent, useState } from "react";

import { useAuth } from "@/hooks/useAuth";

type Step = "owner" | "studio" | "activation";

export function CreateAccountPageClient() {
  const router = useRouter();
  const { isSubmitting, error, register, logout } = useAuth();
  const [step, setStep] = useState<Step>("owner");
  const [studioName, setStudioName] = useState("");
  const [ownerName, setOwnerName] = useState("");
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [confirmPassword, setConfirmPassword] = useState("");
  const [activationCode, setActivationCode] = useState("");
  const [validationError, setValidationError] = useState<string | null>(null);
  const [successMessage, setSuccessMessage] = useState<string | null>(null);

  function goToStudio(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    setValidationError(null);
    if (password !== confirmPassword) {
      setValidationError("Passwords do not match");
      return;
    }
    if (!ownerName.trim() || !email.trim() || !password || !confirmPassword) {
      return;
    }
    setStep("studio");
  }

  function goToActivation(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    setValidationError(null);
    if (!studioName.trim()) {
      return;
    }
    setStep("activation");
  }

  async function handleActivate(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    setValidationError(null);
    setSuccessMessage(null);

    if (!activationCode.trim()) {
      setValidationError("Activation code is required");
      return;
    }

    try {
      await register({
        studioName: studioName.trim(),
        ownerName: ownerName.trim(),
        email: email.trim(),
        password,
        confirmPassword,
        activationCode: activationCode.trim(),
      });
      setSuccessMessage("Activation successful");
      logout();
      window.setTimeout(() => {
        router.replace("/login?activated=1");
      }, 700);
    } catch {
      // Error state is owned by useAuth.
    }
  }

  const displayError = validationError ?? error;

  return (
    <div className="flex min-h-screen items-center justify-center bg-background p-6">
      <Card className="w-full max-w-md border-border/60 shadow-xl">
        <CardHeader className="space-y-1 text-center">
          <CardTitle className="page-title">Create Account</CardTitle>
          <CardDescription>
            {step === "owner"
              ? "Owner details"
              : step === "studio"
                ? "Studio details"
                : "Enter your activation code"}
          </CardDescription>
          <p className="text-xs text-muted-foreground">
            Step {step === "owner" ? "1" : step === "studio" ? "2" : "3"} of 3
          </p>
        </CardHeader>
        <CardContent>
          {step === "owner" ? (
            <form className="space-y-4" onSubmit={goToStudio}>
              <div className="space-y-2">
                <Label htmlFor="register-owner-name">Owner Name</Label>
                <Input
                  id="register-owner-name"
                  autoComplete="name"
                  placeholder="Your full name"
                  value={ownerName}
                  onChange={(event) => setOwnerName(event.target.value)}
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
                  required
                />
              </div>
              {displayError ? <p className="text-sm text-destructive">{displayError}</p> : null}
              <Button
                type="submit"
                className="w-full"
                size="lg"
                disabled={!ownerName.trim() || !email.trim() || !password || !confirmPassword}
              >
                Continue
              </Button>
            </form>
          ) : null}

          {step === "studio" ? (
            <form className="space-y-4" onSubmit={goToActivation}>
              <div className="space-y-2">
                <Label htmlFor="register-studio-name">Studio Name</Label>
                <Input
                  id="register-studio-name"
                  autoComplete="organization"
                  placeholder="Your studio name"
                  value={studioName}
                  onChange={(event) => setStudioName(event.target.value)}
                  required
                />
              </div>
              {displayError ? <p className="text-sm text-destructive">{displayError}</p> : null}
              <div className="flex gap-2">
                <Button type="button" variant="outline" className="w-full" onClick={() => setStep("owner")}>
                  Back
                </Button>
                <Button type="submit" className="w-full" size="lg" disabled={!studioName.trim()}>
                  Continue
                </Button>
              </div>
            </form>
          ) : null}

          {step === "activation" ? (
            <form className="space-y-4" onSubmit={handleActivate}>
              <div className="space-y-2">
                <Label htmlFor="register-activation-code">Activation Code</Label>
                <Input
                  id="register-activation-code"
                  autoComplete="off"
                  placeholder="STM-XXXX-XXXX-XXXX"
                  value={activationCode}
                  onChange={(event) => setActivationCode(event.target.value.toUpperCase())}
                  disabled={isSubmitting || Boolean(successMessage)}
                  required
                />
              </div>
              {successMessage ? <p className="text-sm text-emerald-600">{successMessage}</p> : null}
              {displayError && !successMessage ? (
                <p className="text-sm text-destructive">{displayError}</p>
              ) : null}
              <div className="flex gap-2">
                <Button
                  type="button"
                  variant="outline"
                  className="w-full"
                  disabled={isSubmitting || Boolean(successMessage)}
                  onClick={() => {
                    setValidationError(null);
                    setStep("studio");
                  }}
                >
                  Back
                </Button>
                <Button
                  type="submit"
                  className="w-full"
                  size="lg"
                  disabled={isSubmitting || !activationCode.trim() || Boolean(successMessage)}
                >
                  {isSubmitting ? "Validating..." : "Validate"}
                </Button>
              </div>
            </form>
          ) : null}

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
