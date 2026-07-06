"use client";

import { Button, Input } from "@st-manager/ui";
import { type FormEvent, useState } from "react";

import { useAuth } from "@/hooks/useAuth";

const LOGIN_ROLES = [
  { value: "owner", label: "Owner", email: "owner@st-manager.local" },
  { value: "assistant", label: "Assistant", email: "assistant@st-manager.local" },
  { value: "engineer", label: "Engineer", email: "engineer@st-manager.local" },
] as const;

export function LoginActions() {
  const { isSubmitting, error, login } = useAuth();
  const [role, setRole] = useState<(typeof LOGIN_ROLES)[number]["value"]>("owner");
  const [password, setPassword] = useState("");

  const selectedRole = LOGIN_ROLES.find((entry) => entry.value === role) ?? LOGIN_ROLES[0];

  async function handleSubmit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    if (!password) {
      return;
    }

    try {
      await login(selectedRole.email, password);
      setPassword("");
    } catch {
      // Error state is owned by useAuth.
    }
  }

  return (
    <form className="flex flex-wrap items-center gap-2" onSubmit={handleSubmit}>
      <select
        className="h-8 rounded-md border border-input bg-background px-2 text-xs"
        value={role}
        onChange={(event) =>
          setRole(event.target.value as (typeof LOGIN_ROLES)[number]["value"])
        }
        disabled={isSubmitting}
      >
        {LOGIN_ROLES.map((entry) => (
          <option key={entry.value} value={entry.value}>
            {entry.label}
          </option>
        ))}
      </select>
      <Input
        type="password"
        name="password"
        placeholder="Password"
        value={password}
        onChange={(event) => setPassword(event.target.value)}
        className="h-8 w-32"
        disabled={isSubmitting}
      />
      <Button type="submit" size="sm" disabled={isSubmitting || !password}>
        {isSubmitting ? "Signing in..." : "Sign in"}
      </Button>
      {error ? <span className="text-xs text-destructive">{error}</span> : null}
    </form>
  );
}
