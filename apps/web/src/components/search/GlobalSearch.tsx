"use client";

import { cn, Input } from "@st-manager/ui";
import { SearchIcon } from "lucide-react";
import Link from "next/link";
import { useEffect, useMemo, useRef, useState } from "react";

import { useAuth } from "@/hooks/useAuth";
import {
  fetchAllClients,
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
};

export function GlobalSearch() {
  const { isAuthenticated } = useAuth();
  const [query, setQuery] = useState("");
  const [open, setOpen] = useState(false);
  const [clientCache, setClientCache] = useState<Awaited<ReturnType<typeof fetchAllClients>>>([]);
  const containerRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    if (!isAuthenticated) {
      return;
    }

    let cancelled = false;
    fetchAllClients()
      .then((clients) => {
        if (!cancelled) {
          setClientCache(clients);
        }
      })
      .catch(() => {
        if (!cancelled) {
          setClientCache([]);
        }
      });

    return () => {
      cancelled = true;
    };
  }, [isAuthenticated]);

  const results = useMemo(() => {
    if (!query.trim()) {
      return [];
    }

    const local = searchLocalEntities(query);
    const clients = isAuthenticated ? searchClients(clientCache, query) : [];
    return mergeSearchResults(clients, local);
  }, [query, clientCache, isAuthenticated]);

  useEffect(() => {
    function handleClickOutside(event: MouseEvent) {
      if (containerRef.current && !containerRef.current.contains(event.target as Node)) {
        setOpen(false);
      }
    }

    document.addEventListener("mousedown", handleClickOutside);
    return () => document.removeEventListener("mousedown", handleClickOutside);
  }, []);

  if (!isAuthenticated) {
    return null;
  }

  return (
    <div ref={containerRef} className="relative mx-4 hidden max-w-md flex-1 md:block">
      <SearchIcon className="pointer-events-none absolute left-3 top-1/2 size-4 -translate-y-1/2 text-muted-foreground" />
      <Input
        value={query}
        onChange={(event) => {
          setQuery(event.target.value);
          setOpen(true);
        }}
        onFocus={() => setOpen(true)}
        placeholder="Search clients, projects, inquiries, bookings..."
        className="h-9 pl-9"
      />

      {open && query.trim() ? (
        <div className="absolute z-50 mt-2 w-full overflow-hidden rounded-xl border border-border/60 bg-background shadow-xl">
          {results.length === 0 ? (
            <p className="px-4 py-3 text-sm text-muted-foreground">No results found.</p>
          ) : (
            <ul className="max-h-80 overflow-y-auto py-1">
              {results.map((result) => (
                <li key={`${result.type}-${result.id}`}>
                  <Link
                    href={result.href}
                    onClick={() => {
                      setOpen(false);
                      setQuery("");
                    }}
                    className="flex flex-col gap-0.5 px-4 py-2.5 transition-colors hover:bg-accent"
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
          )}
        </div>
      ) : null}
    </div>
  );
}
