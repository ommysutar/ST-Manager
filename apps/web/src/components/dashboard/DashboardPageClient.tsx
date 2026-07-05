"use client";

import { Button } from "@st-manager/ui";
import { FolderPlusIcon, PlusCircleIcon } from "lucide-react";
import Link from "next/link";

import { useAuth } from "@/hooks/useAuth";
import { layout } from "@st-manager/theme";

export function DashboardPageClient() {
  const { isAuthenticated } = useAuth();

  return (
    <div
      className="mx-auto flex min-h-[60vh] flex-col justify-center gap-8"
      style={{ maxWidth: layout.contentMaxWidth }}
    >
      <div>
        <h1 className="text-2xl font-semibold tracking-tight">Dashboard</h1>
        <p className="mt-1 text-sm text-muted-foreground">
          {isAuthenticated
            ? "Start a new inquiry or create a project manually."
            : "Sign in to manage studio inquiries and projects."}
        </p>
      </div>

      <div className="grid gap-4 sm:grid-cols-2">
        <Button
          asChild
          size="lg"
          className="h-auto min-h-24 flex-col gap-2 py-6 text-base"
          disabled={!isAuthenticated}
        >
          <Link href="/inquiries/new">
            <PlusCircleIcon className="size-6" />
            + New Inquiry
          </Link>
        </Button>

        <Button
          asChild
          size="lg"
          variant="outline"
          className="h-auto min-h-24 flex-col gap-2 py-6 text-base"
          disabled={!isAuthenticated}
        >
          <Link href="/projects/new">
            <FolderPlusIcon className="size-6" />
            + New Project
          </Link>
        </Button>
      </div>
    </div>
  );
}
