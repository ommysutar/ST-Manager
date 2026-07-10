"use client";

import { zodResolver } from "@hookform/resolvers/zod";
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
import { INVITATION_STATUSES } from "@st-manager/constants";
import type { InvitationPreviewDto } from "@st-manager/contracts";
import { acceptInvitationSchema, type AcceptInvitationInput } from "@st-manager/validation";
import Link from "next/link";
import { useSearchParams } from "next/navigation";
import { Suspense, useEffect, useMemo, useState } from "react";
import { useForm } from "react-hook-form";
import { toast } from "sonner";

import { InvitationSessionConflict } from "@/components/auth/InvitationSessionConflict";
import { useAuth } from "@/hooks/useAuth";
import { teamMembersApi } from "@/lib/api-client";
import { getApiErrorMessage } from "@/lib/api-error";

function invitationStatusMessage(status: string): string {
  if (status === INVITATION_STATUSES.ACCEPTED) {
    return "Invitation already used.";
  }
  if (status === INVITATION_STATUSES.EXPIRED) {
    return "Invitation expired.";
  }
  return "This invitation is no longer valid.";
}

function AcceptInvitationContent() {
  const searchParams = useSearchParams();
  const token = searchParams.get("token") ?? "";
  const invalidLink = !token;
  const { isAuthenticated } = useAuth();
  const [sessionCleared, setSessionCleared] = useState(false);
  const [preview, setPreview] = useState<InvitationPreviewDto | null>(null);
  const [loading, setLoading] = useState(!invalidLink);
  const [error, setError] = useState<string | null>(
    invalidLink ? "Invalid invitation link" : null,
  );
  const [accountCreated, setAccountCreated] = useState(false);

  const invitationUrl = useMemo(() => {
    if (typeof window === "undefined" || !token) {
      return "";
    }
    return `${window.location.origin}/invite/accept?token=${encodeURIComponent(token)}`;
  }, [token]);

  const form = useForm<AcceptInvitationInput>({
    resolver: zodResolver(acceptInvitationSchema),
    defaultValues: { password: "", confirmPassword: "" },
  });

  const {
    register,
    handleSubmit,
    formState: { errors, isSubmitting },
  } = form;

  useEffect(() => {
    if (invalidLink || (isAuthenticated && !sessionCleared)) {
      return;
    }

    setLoading(true);
    void teamMembersApi
      .verifyInvitation(token)
      .then(setPreview)
      .catch((err) => {
        setError(getApiErrorMessage(err, "Invitation is invalid or expired"));
      })
      .finally(() => setLoading(false));
  }, [invalidLink, token, isAuthenticated, sessionCleared]);

  async function onSubmit(values: AcceptInvitationInput) {
    try {
      await teamMembersApi.acceptInvitation(token, values);
      setAccountCreated(true);
    } catch (err) {
      toast.error(getApiErrorMessage(err, "Failed to create account"));
    }
  }

  const loginHref = `/login?invitation=${encodeURIComponent(token)}`;

  if (isAuthenticated && !sessionCleared) {
    return (
      <InvitationSessionConflict
        invitationUrl={invitationUrl}
        onSignedOut={() => setSessionCleared(true)}
      />
    );
  }

  if (loading) {
    return (
      <Card className="w-full max-w-md">
        <CardContent className="pt-6">
          <p className="text-sm text-muted-foreground">Verifying invitation…</p>
        </CardContent>
      </Card>
    );
  }

  if (error || !preview) {
    return (
      <Card className="w-full max-w-md">
        <CardHeader>
          <CardTitle>Invitation unavailable</CardTitle>
          <CardDescription>{error ?? "This invitation link is not valid."}</CardDescription>
        </CardHeader>
      </Card>
    );
  }

  if (!preview.canAccept) {
    return (
      <Card className="w-full max-w-md">
        <CardHeader>
          <CardTitle>Invitation unavailable</CardTitle>
          <CardDescription>{invitationStatusMessage(preview.status)}</CardDescription>
        </CardHeader>
      </Card>
    );
  }

  if (accountCreated) {
    return (
      <Card className="w-full max-w-md">
        <CardHeader>
          <CardTitle>Account created successfully</CardTitle>
          <CardDescription>
            Your account has been created. Sign in to access ST Manager.
          </CardDescription>
        </CardHeader>
        <CardContent>
          <Button asChild className="w-full">
            <Link href="/login">Go to Login</Link>
          </Button>
        </CardContent>
      </Card>
    );
  }

  if (preview.accountExists) {
    return (
      <Card className="w-full max-w-md">
        <CardHeader>
          <CardTitle>Join {preview.studioName}</CardTitle>
          <CardDescription>
            You already have an ST Manager account. Please log in to accept this invitation.
          </CardDescription>
        </CardHeader>
        <CardContent className="space-y-4">
          <div className="rounded-md border bg-muted/40 p-3 text-sm">
            <p>
              <span className="text-muted-foreground">Email:</span> {preview.email}
            </p>
          </div>
          <Button asChild className="w-full">
            <Link href={loginHref}>Go to Login</Link>
          </Button>
        </CardContent>
      </Card>
    );
  }

  return (
    <Card className="w-full max-w-md">
      <CardHeader>
        <CardTitle>Create Your Account</CardTitle>
        <CardDescription>
          You have been invited to join {preview.studioName} on ST Manager.
        </CardDescription>
      </CardHeader>
      <CardContent>
        <form className="grid gap-4" onSubmit={handleSubmit(onSubmit)}>
          <div className="space-y-2">
            <Label htmlFor="email">Email</Label>
            <Input id="email" type="email" value={preview.email} readOnly disabled />
          </div>

          <div className="space-y-2">
            <Label htmlFor="password">Password</Label>
            <Input id="password" type="password" autoComplete="new-password" {...register("password")} />
            {errors.password ? (
              <p className="text-sm text-destructive">{errors.password.message}</p>
            ) : null}
          </div>

          <div className="space-y-2">
            <Label htmlFor="confirmPassword">Confirm Password</Label>
            <Input
              id="confirmPassword"
              type="password"
              autoComplete="new-password"
              {...register("confirmPassword")}
            />
            {errors.confirmPassword ? (
              <p className="text-sm text-destructive">{errors.confirmPassword.message}</p>
            ) : null}
          </div>

          <Button type="submit" disabled={isSubmitting} className="w-full">
            {isSubmitting ? "Creating account…" : "Create Account"}
          </Button>
        </form>
      </CardContent>
    </Card>
  );
}

export function AcceptInvitationPageClient() {
  return (
    <div className="flex min-h-screen items-center justify-center bg-background p-4">
      <Suspense
        fallback={
          <Card className="w-full max-w-md">
            <CardContent className="pt-6">
              <p className="text-sm text-muted-foreground">Loading…</p>
            </CardContent>
          </Card>
        }
      >
        <AcceptInvitationContent />
      </Suspense>
    </div>
  );
}
