"use client";

import { Button, cn, Dialog, DialogContent, DialogHeader, DialogTitle, Input } from "@st-manager/ui";
import { SearchIcon } from "lucide-react";
import Link from "next/link";
import { useEffect, useMemo, useRef, useState } from "react";

import { useAuth } from "@/hooks/useAuth";
import { useClients } from "@/hooks/useClients";
import {
  mergeSearchResults,
  searchClients,
  searchLocalEntities,
} from "@/lib/search/global-search";
import type { SearchResult } from "@/lib/search/types";

const TYPE_LABELS: Record<SearchResult["type"], string> = {
  client: "Client",
  project: "Project",
  inquiry: "Inquiry",
  booking: "Booking",
  payment: "Payment",
  file: "File",
  report: "Report",
};

function SearchResultsList({
  results,
  onSelect,
}: {
  results: SearchResult[];
  onSelect: () => void;
}) {
  if (results.length === 0) {
    return <p className="px-4 py-3 text-sm text-muted-foreground">No results found.</p>;
  }

  return (
    <ul className="max-h-80 overflow-y-auto py-1">
      {results.map((result) => (
        <li key={`${result.type}-${result.id}`}>
          <Link
            href={result.href}
            onClick={onSelect}
            className="flex flex-col gap-0.5 px-4 py-3 transition-colors hover:bg-accent"
          >
            <span className="flex items-center gap-2 text-sm font-medium">
              <span
                className={cn(
                  "rounded-full px-2 py-0.5 text-[10px] font-semibold uppercase tracking-wide",
                  result.type === "client" && "bg-blue-500/10 text-blue-600",
                  result.type === "project" && "bg-emerald-500/10 text-emerald-600",
                  result.type === "inquiry" && "bg-violet-500/10 text-violet-600",
                  result.type === "booking" && "bg-orange-500/10 text-orange-600",
                  result.type === "payment" && "bg-amber-500/10 text-amber-600",
                  result.type === "file" && "bg-sky-500/10 text-sky-600",
                  result.type === "report" && "bg-rose-500/10 text-rose-600",
                )}
              >
                {TYPE_LABELS[result.type]}
              </span>
              {result.title}
            </span>
            <span className="text-xs text-muted-foreground">{result.subtitle}</span>
          </Link>
        </li>
      ))}
    </ul>
  );
}

export function GlobalSearch() {
  const { isAuthenticated } = useAuth();
  const clients = useClients();
  const [query, setQuery] = useState("");
  const [open, setOpen] = useState(false);
  const [mobileOpen, setMobileOpen] = useState(false);
  const containerRef = useRef<HTMLDivElement>(null);

  const results = useMemo(() => {
    if (!query.trim()) {
      return [];
    }

    const local = searchLocalEntities(query);
    const clientResults = isAuthenticated ? searchClients(clients, query) : [];
    return mergeSearchResults(clientResults, local);
  }, [query, clients, isAuthenticated]);

  useEffect(() => {
    function handleClickOutside(event: MouseEvent) {
      if (containerRef.current && !containerRef.current.contains(event.target as Node)) {
        setOpen(false);
      }
    }

    document.addEventListener("mousedown", handleClickOutside);
    return () => document.removeEventListener("mousedown", handleClickOutside);
  }, []);

  function closeMobileSearch() {
    setMobileOpen(false);
    setQuery("");
    setOpen(false);
  }

  if (!isAuthenticated) {
    return null;
  }

  return (
    <>
      <div ref={containerRef} className="relative hidden min-w-0 max-w-md flex-1 md:block">
        <SearchIcon className="pointer-events-none absolute left-3 top-1/2 size-4 -translate-y-1/2 text-muted-foreground" />
        <Input
          value={query}
          onChange={(event) => {
            setQuery(event.target.value);
            setOpen(true);
          }}
          onFocus={() => setOpen(true)}
          placeholder="Search projects, clients, bookings..."
          className="h-11 pl-9"
          aria-label="Search"
        />

        {open && query.trim() ? (
          <div className="absolute z-50 mt-2 w-full overflow-hidden rounded-xl border border-border/60 bg-background shadow-xl">
            <SearchResultsList
              results={results}
              onSelect={() => {
                setOpen(false);
                setQuery("");
              }}
            />
          </div>
        ) : null}
      </div>

      <Button
        type="button"
        variant="ghost"
        size="icon"
        className="shrink-0 md:hidden"
        aria-label="Open search"
        onClick={() => setMobileOpen(true)}
      >
        <SearchIcon className="size-5" />
      </Button>

      <Dialog open={mobileOpen} onOpenChange={setMobileOpen}>
        <DialogContent className="top-4 left-1/2 max-h-[calc(100dvh-2rem)] w-[calc(100vw-1.5rem)] max-w-lg translate-x-[-50%] translate-y-0 gap-4 overflow-hidden p-4 sm:p-6">
          <DialogHeader>
            <DialogTitle>Search</DialogTitle>
          </DialogHeader>
          <div className="relative">
            <SearchIcon className="pointer-events-none absolute left-3 top-1/2 size-4 -translate-y-1/2 text-muted-foreground" />
            <Input
              value={query}
              onChange={(event) => setQuery(event.target.value)}
              placeholder="Search projects, clients, bookings..."
              className="h-11 pl-9"
              aria-label="Search"
              autoFocus
            />
          </div>
          <div className="overflow-hidden rounded-xl border border-border/60">
            {query.trim() ? (
              <SearchResultsList results={results} onSelect={closeMobileSearch} />
            ) : (
              <p className="px-4 py-3 text-sm text-muted-foreground">
                Type to search across the studio.
              </p>
            )}
          </div>
        </DialogContent>
      </Dialog>
    </>
  );
}
