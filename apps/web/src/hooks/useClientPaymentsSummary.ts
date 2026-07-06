"use client";

import { useMemo } from "react";

import type { StudioDocument } from "@/lib/documents/types";
import type { StudioProject } from "@/lib/projects/types";

import { useDocuments } from "./useDocuments";
import { useProjects } from "./useProjects";

export interface ClientPaymentsSummary {
  projects: StudioProject[];
  documents: StudioDocument[];
  totalPaid: number;
  totalPending: number;
}

/** Aggregates a single client's projects, documents, and totals — shared by Client Profile and the Payments module. */
export function useClientPaymentsSummary(clientId: string): ClientPaymentsSummary {
  const projects = useProjects();
  const documents = useDocuments();
  const decodedKey = decodeURIComponent(clientId);

  return useMemo(() => {
    const clientProjects = projects.filter((project) =>
      project.clientId
        ? project.clientId === clientId
        : `${project.clientName}|${project.clientMobile ?? ""}` === decodedKey,
    );

    const totals = clientProjects.reduce(
      (acc, project) => {
        acc.paid += Math.max(0, project.grandTotal - project.remainingBalance);
        acc.pending += project.remainingBalance;
        return acc;
      },
      { paid: 0, pending: 0 },
    );

    const clientDocuments = documents.filter((document) =>
      clientProjects.some((project) => project.id === document.projectId),
    );

    return { projects: clientProjects, documents: clientDocuments, totalPaid: totals.paid, totalPending: totals.pending };
  }, [projects, documents, clientId, decodedKey]);
}
