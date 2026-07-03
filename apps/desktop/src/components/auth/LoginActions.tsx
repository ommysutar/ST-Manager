import { Button, Input } from "@st-manager/ui";
import { type FormEvent, useState } from "react";

import { useAuth } from "../../hooks/useAuth";

export function LoginActions() {
  const { user, isAuthenticated, isSubmitting, error, login, logout } = useAuth();
  const [email, setEmail] = useState("dev@st-manager.local");
  const [password, setPassword] = useState("");

  async function handleSubmit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    if (!email.trim() || !password) {
      return;
    }

    try {
      await login(email.trim(), password);
      setPassword("");
    } catch {
      // Error state is owned by useAuth.
    }
  }

  if (isAuthenticated && user) {
    return (
      <div className="flex items-center gap-2">
        <span className="max-w-[180px] truncate text-xs text-muted-foreground">{user.email}</span>
        <Button type="button" variant="outline" size="sm" onClick={logout}>
          Sign out
        </Button>
      </div>
    );
  }

  return (
    <form className="flex items-center gap-2" onSubmit={handleSubmit}>
      <Input
        type="email"
        name="email"
        placeholder="Email"
        value={email}
        onChange={(event) => setEmail(event.target.value)}
        className="h-8 w-44"
        disabled={isSubmitting}
      />
      <Input
        type="password"
        name="password"
        placeholder="Password"
        value={password}
        onChange={(event) => setPassword(event.target.value)}
        className="h-8 w-36"
        disabled={isSubmitting}
      />
      <Button type="submit" size="sm" disabled={isSubmitting || !password}>
        {isSubmitting ? "Signing in..." : "Sign in"}
      </Button>
      {error ? <span className="text-xs text-destructive">{error}</span> : null}
    </form>
  );
}
