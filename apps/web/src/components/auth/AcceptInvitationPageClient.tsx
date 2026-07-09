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
import { TEAM_ROLE_LABELS } from "@st-manager/constants";
import type { InvitationPreviewDto } from "@st-manager/contracts";
import { acceptInvitationSchema, type AcceptInvitationInput } from "@st-manager/validation";
import { useRouter, useSearchParams } from "next/navigation";
import { Suspense, useEffect, useState } from "react";
import { useForm } from "react-hook-form";
import { toast } from "sonner";

import { teamMembersApi } from "@/lib/api-client";
import { getApiErrorMessage } from "@/lib/api-error";
import { tokenStore } from "@/lib/token-store";

function AcceptInvitationContent() {
  const router = useRouter();
  const searchParams = useSearchParams();
  const token = searchParams.get("token") ?? "";
  const invalidLink = !token;
  const [preview, setPreview] = useState<InvitationPreviewDto | null>(null);
  const [loading, setLoading] = useState(!invalidLink);
  const [error, setError] = useState<string | null>(
    invalidLink ? "Invalid invitation link" : null,
  );

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
    if (invalidLink) {
      return;
    }

    void teamMembersApi
      .verifyInvitation(token)
      .then(setPreview)
      .catch((err) => {
        setError(getApiErrorMessage(err, "Invitation is invalid or expired"));
      })
      .finally(() => setLoading(false));
  }, [invalidLink, token]);

  async function onSubmit(values: AcceptInvitationInput) {
    try {
      const session = await teamMembersApi.acceptInvitation(token, values);
      tokenStore.setSession(session.accessToken, session.refreshToken, session.user);
      toast.success("Welcome to the team!");
      router.replace("/");
    } catch (err) {
      toast.error(getApiErrorMessage(err, "Failed to accept invitation"));
    }
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

  return (
    <Card className="w-full max-w-md">
      <CardHeader>
        <CardTitle>Join {preview.studioName}</CardTitle>
        <CardDescription>
          You were invited by {preview.invitedByName ?? preview.invitedByEmail} as{" "}
          {TEAM_ROLE_LABELS[preview.role as keyof typeof TEAM_ROLE_LABELS] ?? preview.role}.
        </CardDescription>
      </CardHeader>
      <CardContent>
        <form className="grid gap-4" onSubmit={handleSubmit(onSubmit)}>
          <div className="rounded-md border bg-muted/40 p-3 text-sm">
            <p>
              <span className="text-muted-foreground">Email:</span> {preview.email}
            </p>
            <p>
              <span className="text-muted-foreground">Expires:</span>{" "}
              {new Date(preview.expiresAt).toLocaleDateString()}
            </p>
          </div>

          <div className="space-y-2">
            <Label htmlFor="password">Create Password</Label>
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
            {isSubmitting ? "Joining…" : "Accept Invitation & Join Studio"}
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
