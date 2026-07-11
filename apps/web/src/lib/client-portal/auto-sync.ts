import { BOOKINGS_UPDATED_EVENT } from "@/lib/bookings/events";
import { listBookingsByProject } from "@/lib/bookings/storage";
import { DOCUMENTS_UPDATED_EVENT } from "@/lib/documents/events";
import { PROJECTS_UPDATED_EVENT } from "@/lib/inquiry/events";
import { PAYMENTS_UPDATED_EVENT } from "@/lib/payments/events";
import { PROFILE_UPDATED_EVENT } from "@/lib/profile/events";
import { loadProfile } from "@/lib/profile/storage";
import { getProject, listProjects } from "@/lib/projects/storage";
import { STUDIOS_UPDATED_EVENT } from "@/lib/studios/events";
import { loadAllStudios } from "@/lib/studios/storage";
import { getAuthUserSnapshot, tokenStore } from "@/lib/token-store";

import { clientPortalApi } from "@/lib/api-client";

import {
  buildClientPortalSnapshot,
  isPortalLinked,
  listLinkedPortalProjectIds,
  markPortalLinked,
} from "./snapshot";

const SYNC_DEBOUNCE_MS = 1200;

let started = false;
let debounceTimer: ReturnType<typeof setTimeout> | null = null;
let inFlight = false;
let queued = false;

function canSync(): boolean {
  return Boolean(tokenStore.getAccessToken() && getAuthUserSnapshot());
}

async function publishProject(projectId: string): Promise<void> {
  if (!canSync() || !isPortalLinked(projectId)) {
    return;
  }
  const project = getProject(projectId);
  const user = getAuthUserSnapshot();
  if (!project || !user) {
    return;
  }

  const snapshot = buildClientPortalSnapshot({
    project,
    profile: loadProfile(user),
    bookings: listBookingsByProject(projectId),
    studios: loadAllStudios(),
  });

  try {
    await clientPortalApi.sync(projectId, {
      snapshot,
      studioMessage: snapshot.studioMessage,
    });
    markPortalLinked(projectId);
  } catch {
    // No portal link yet, or offline — ignore.
  }
}

async function publishLinkedProjects(): Promise<void> {
  if (!canSync()) {
    return;
  }
  const linked = new Set([...listLinkedPortalProjectIds(), ...listProjects().map((p) => p.id).filter(isPortalLinked)]);
  for (const projectId of linked) {
    await publishProject(projectId);
  }
}

function schedulePublish(): void {
  if (!canSync()) {
    return;
  }
  if (debounceTimer) {
    clearTimeout(debounceTimer);
  }
  debounceTimer = setTimeout(() => {
    void runPublish();
  }, SYNC_DEBOUNCE_MS);
}

async function runPublish(): Promise<void> {
  if (inFlight) {
    queued = true;
    return;
  }
  inFlight = true;
  try {
    await publishLinkedProjects();
  } finally {
    inFlight = false;
    if (queued) {
      queued = false;
      schedulePublish();
    }
  }
}

/** Push the latest local project view to the portal API for one project (if linked). */
export async function syncClientPortalNow(projectId: string): Promise<void> {
  await publishProject(projectId);
}

/** Start listening for project/booking/payment/document/profile changes and auto-publish. */
export function startClientPortalAutoSync(): () => void {
  if (typeof window === "undefined" || started) {
    return () => undefined;
  }
  started = true;

  const onChange = () => schedulePublish();
  const events = [
    PROJECTS_UPDATED_EVENT,
    BOOKINGS_UPDATED_EVENT,
    PAYMENTS_UPDATED_EVENT,
    DOCUMENTS_UPDATED_EVENT,
    PROFILE_UPDATED_EVENT,
    STUDIOS_UPDATED_EVENT,
  ];
  for (const event of events) {
    window.addEventListener(event, onChange);
  }

  schedulePublish();

  return () => {
    started = false;
    if (debounceTimer) {
      clearTimeout(debounceTimer);
      debounceTimer = null;
    }
    for (const event of events) {
      window.removeEventListener(event, onChange);
    }
  };
}
