"use client";

import { Button, Card, CardContent, CardDescription, CardHeader, CardTitle } from "@st-manager/ui";
import { ExternalLinkIcon } from "lucide-react";
import { useCallback, useState } from "react";
import { toast } from "sonner";

import { useAuth } from "@/hooks/useAuth";

interface InvitationSessionConflictProps {
  invitationUrl: string;
  onSignedOut: () => void;
}

export function InvitationSessionConflict({
  invitationUrl,
  onSignedOut,
}: InvitationSessionConflictProps) {
  const { user, logout } = useAuth();
  const [isSigningOut, setIsSigningOut] = useState(false);

  const handleSignOut = useCallback(() => {
    setIsSigningOut(true);
    logout();
    onSignedOut();
    setIsSigningOut(false);
  }, [logout, onSignedOut]);

  async function copyInvitationLink() {
    try {
      await navigator.clipboard.writeText(invitationUrl);
      toast.success("Invitation link copied");
    } catch {
      toast.error("Could not copy link");
    }
  }

  if (!user) {
    return null;
  }

  return (
    <Card className="w-full max-w-md">
      <CardHeader>
        <CardTitle>Another account is currently signed in</CardTitle>
        <CardDescription>
          You are signed in as <strong>{user.email}</strong>. To accept this invitation, sign out
          first or open the link in a separate browser where no one is signed in.
        </CardDescription>
      </CardHeader>
      <CardContent className="space-y-3">
        <Button className="w-full" onClick={handleSignOut} disabled={isSigningOut}>
          {isSigningOut ? "Signing out…" : "Sign out and continue"}
        </Button>
        <Button type="button" variant="outline" className="w-full" onClick={copyInvitationLink}>
          <ExternalLinkIcon className="mr-2 h-4 w-4" />
          Copy link for another browser
        </Button>
        <p className="text-center text-xs text-muted-foreground">
          Tip: open the copied link in a private/incognito window.
        </p>
      </CardContent>
    </Card>
  );
}
