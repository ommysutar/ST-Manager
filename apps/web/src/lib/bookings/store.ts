import type { ProjectBookingResponseDto } from "@st-manager/contracts";
import { ApiError } from "@st-manager/api-sdk";

import { projectBookingsApi } from "@/lib/api-client";
import {
  getActiveStudioId,
  isBrowserOnline,
  isRetryableSyncFailure,
  readStudioScopedItem,
  withTimeout,
  writeStudioScopedItem,
} from "@/lib/sync";

import { remapLocalBookingId } from "./cascade-ids";
import { notifyBookingsUpdated } from "./events";
import {
  dtoToProjectBooking,
  projectBookingToResponseDto,
} from "./map-dto";
import {
  buildOptimisticProjectBooking,
  createLocalBookingId,
  enqueuePendingProjectBookingCreate,
  isLocalBookingId,
  listPendingProjectBookingCreates,
  removePendingProjectBookingCreate,
  updatePendingProjectBookingCreate,
  type PendingProjectBookingCreatePayload,
} from "./offline-queue";

export {
  buildOptimisticProjectBooking,
  createLocalBookingId,
  enqueuePendingProjectBookingCreate,
  isLocalBookingId,
  listPendingProjectBookingCreates,
  removePendingProjectBookingCreate,
  updatePendingProjectBookingCreate,
  type PendingProjectBookingCreatePayload,
} from "./offline-queue";
import { setBookingsSnapshot } from "./snapshots";
import type { ProjectBooking } from "./types";
import { BOOKINGS_STORAGE_KEY, OCCUPYING_BOOKING_STATUSES } from "./types";

const EPOCH_ISO = "1970-01-01T00:00:00.000Z";
const REFRESH_TIMEOUT_MS = 8_000;
const CREATE_TIMEOUT_MS = 8_000;

const BOOKINGS_CACHE_KEY = "st-manager-project-bookings-cache";
const BOOKINGS_CURSOR_KEY = "st-manager-project-bookings-sync-cursor";
const BOOKINGS_TOMBSTONES_KEY = "st-manager-project-bookings-tombstones";

let bookingsSnapshot: ProjectBooking[] = [];
let refreshPromise: Promise<ProjectBooking[]> | null = null;
let reconcilePromise: Promise<ProjectBooking[]> | null = null;
let flushPromise: Promise<void> | null = null;

const inFlightCreates = new Map<string, Promise<ProjectBookingResponseDto>>();

type BookingTombstones = Record<string, string>;

function createPayloadFingerprint(payload: PendingProjectBookingCreatePayload): string {
  return [
    payload.projectId,
    payload.roomStudioId,
    payload.date,
    payload.slotId,
    payload.status ?? "booked",
  ].join("|");
}

function findDuplicateInSnapshot(
  payload: PendingProjectBookingCreatePayload,
  excludeLocalId?: string,
): ProjectBooking | undefined {
  const status = payload.status ?? "booked";
  if (!OCCUPYING_BOOKING_STATUSES.includes(status)) {
    return undefined;
  }

  return bookingsSnapshot.find((booking) => {
    if (isLocalBookingId(booking.id) || booking.id === excludeLocalId) {
      return false;
    }
    return (
      OCCUPYING_BOOKING_STATUSES.includes(booking.status) &&
      booking.projectId === payload.projectId &&
      booking.studioId === payload.roomStudioId &&
      booking.date === payload.date &&
      booking.slotId === payload.slotId
    );
  });
}

export function getBookingsStoreSnapshot(): ProjectBooking[] {
  return bookingsSnapshot;
}

export function getBookingFromSnapshot(bookingId: string): ProjectBooking | undefined {
  return bookingsSnapshot.find((booking) => booking.id === bookingId);
}

export function setBookingsStoreSnapshot(next: ProjectBooking[]): ProjectBooking[] {
  bookingsSnapshot = next;
  setBookingsSnapshot(next);
  return bookingsSnapshot;
}

function sortBookings(bookings: ProjectBooking[]): ProjectBooking[] {
  return [...bookings].sort(
    (left, right) =>
      new Date(`${left.date}T00:00:00`).getTime() - new Date(`${right.date}T00:00:00`).getTime() ||
      left.slotId.localeCompare(right.slotId),
  );
}

function readTombstones(studioId: string | null = getActiveStudioId()): BookingTombstones {
  if (!studioId) return {};
  try {
    const raw = readStudioScopedItem(BOOKINGS_TOMBSTONES_KEY, studioId);
    if (!raw) return {};
    const parsed = JSON.parse(raw) as BookingTombstones;
    return parsed && typeof parsed === "object" ? parsed : {};
  } catch {
    return {};
  }
}

function writeTombstones(
  tombstones: BookingTombstones,
  studioId: string | null = getActiveStudioId(),
): void {
  if (!studioId) return;
  writeStudioScopedItem(BOOKINGS_TOMBSTONES_KEY, JSON.stringify(tombstones), studioId);
}

function latestTimestamp(values: Array<string | null | undefined>): string {
  let max = 0;
  let iso = EPOCH_ISO;
  for (const value of values) {
    if (!value) continue;
    const ms = Date.parse(value);
    if (!Number.isNaN(ms) && ms >= max) {
      max = ms;
      iso = value;
    }
  }
  return iso;
}

function readCachedBookings(studioId: string | null = getActiveStudioId()): ProjectBooking[] {
  if (!studioId) return [];
  try {
    const raw = readStudioScopedItem(BOOKINGS_CACHE_KEY, studioId);
    if (!raw) return [];
    const parsed = JSON.parse(raw) as ProjectBooking[];
    return Array.isArray(parsed) ? parsed : [];
  } catch {
    return [];
  }
}

function writeCachedBookings(
  bookings: ProjectBooking[],
  studioId: string | null = getActiveStudioId(),
): void {
  if (!studioId) return;
  writeStudioScopedItem(BOOKINGS_CACHE_KEY, JSON.stringify(bookings), studioId);
}

export function readProjectBookingsSyncCursor(
  studioId: string | null = getActiveStudioId(),
): string | null {
  if (!studioId) return null;
  return readStudioScopedItem(BOOKINGS_CURSOR_KEY, studioId);
}

export function writeProjectBookingsSyncCursor(
  cursor: string,
  studioId: string | null = getActiveStudioId(),
): void {
  if (!studioId) return;
  writeStudioScopedItem(BOOKINGS_CURSOR_KEY, cursor, studioId);
}

function migrateLegacyBookingsToStudioCache(): void {
  const studioId = getActiveStudioId();
  if (!studioId || typeof window === "undefined") {
    return;
  }
  if (readStudioScopedItem(BOOKINGS_CACHE_KEY, studioId)) {
    return;
  }
  try {
    const legacy = window.localStorage.getItem(BOOKINGS_STORAGE_KEY);
    if (!legacy) {
      return;
    }
    const parsed = JSON.parse(legacy);
    if (Array.isArray(parsed)) {
      writeStudioScopedItem(BOOKINGS_CACHE_KEY, legacy, studioId);
    }
  } catch {
    // ignore corrupt legacy cache
  }
}

export function hydrateBookingsSnapshotFromCache(): ProjectBooking[] {
  migrateLegacyBookingsToStudioCache();

  const tombstones = readTombstones();
  const cached = readCachedBookings().filter((booking) => !tombstones[booking.id]);
  const pending = listPendingProjectBookingCreates().map((entry) =>
    buildOptimisticProjectBooking(entry.localId, entry.payload),
  );
  const byId = new Map<string, ProjectBooking>();
  for (const booking of [...cached, ...pending]) {
    if (tombstones[booking.id] && !isLocalBookingId(booking.id)) {
      continue;
    }
    byId.set(booking.id, booking);
  }
  setBookingsStoreSnapshot(sortBookings([...byId.values()]));
  notifyBookingsUpdated();
  return bookingsSnapshot;
}

export async function loadProductionProjectBookings(): Promise<ProjectBookingResponseDto[]> {
  const pageSize = 100;
  let page = 1;
  const all: ProjectBookingResponseDto[] = [];

  while (page <= 20) {
    const response = await projectBookingsApi.listProjectBookings({ page, pageSize });
    all.push(...response.data);
    if (response.data.length < pageSize) {
      break;
    }
    page += 1;
  }

  return all.filter((booking) => !booking.deletedAt);
}

export function applyProjectBookingChangeRecords(
  records: ProjectBookingResponseDto[],
): ProjectBooking[] {
  const byId = new Map(bookingsSnapshot.map((booking) => [booking.id, booking]));
  const tombstones = readTombstones();

  for (const remote of records) {
    if (remote.deletedAt) {
      const deletedMs = Date.parse(remote.deletedAt);
      const existingTomb = tombstones[remote.id];
      const existingMs = existingTomb ? Date.parse(existingTomb) : 0;
      if (Number.isNaN(deletedMs) || deletedMs >= existingMs) {
        tombstones[remote.id] = remote.deletedAt;
      }
      byId.delete(remote.id);
      continue;
    }

    const tomb = tombstones[remote.id];
    if (tomb) {
      const tombMs = Date.parse(tomb);
      const remoteMs = Date.parse(remote.updatedAt);
      if (!Number.isNaN(tombMs) && (Number.isNaN(remoteMs) || remoteMs <= tombMs)) {
        continue;
      }
      delete tombstones[remote.id];
    }

    const local = byId.get(remote.id);
    const remoteBooking = dtoToProjectBooking(remote);
    if (!local) {
      byId.set(remote.id, remoteBooking);
      continue;
    }

    const localMs = Date.parse(local.updatedAt);
    const remoteMs = Date.parse(remote.updatedAt);
    if (Number.isNaN(remoteMs) || remoteMs >= localMs || Number.isNaN(localMs)) {
      byId.set(remote.id, remoteBooking);
    }
  }

  writeTombstones(tombstones);
  const next = sortBookings(
    [...byId.values()].filter((booking) => isLocalBookingId(booking.id) || !tombstones[booking.id]),
  );
  setBookingsStoreSnapshot(next);
  writeCachedBookings(next);
  return next;
}

export function applyAuthoritativeActiveBookingList(
  remoteActive: ProjectBookingResponseDto[],
  candidateIdsToTombstone?: ReadonlySet<string>,
): ProjectBooking[] {
  const tombstones = readTombstones();
  const remoteIds = new Set(remoteActive.map((booking) => booking.id));
  const now = new Date().toISOString();
  const byId = new Map(bookingsSnapshot.map((booking) => [booking.id, booking]));
  const mayTombstone = (id: string) =>
    !candidateIdsToTombstone || candidateIdsToTombstone.has(id);

  for (const booking of [...byId.values()]) {
    if (isLocalBookingId(booking.id)) {
      continue;
    }
    if (!remoteIds.has(booking.id) && mayTombstone(booking.id)) {
      tombstones[booking.id] = tombstones[booking.id] ?? now;
      byId.delete(booking.id);
    }
  }

  for (const remote of remoteActive) {
    if (remote.deletedAt) {
      continue;
    }
    delete tombstones[remote.id];
    const remoteBooking = dtoToProjectBooking(remote);
    const local = byId.get(remote.id);
    if (!local) {
      byId.set(remote.id, remoteBooking);
      continue;
    }
    const localMs = Date.parse(local.updatedAt);
    const remoteMs = Date.parse(remote.updatedAt);
    if (Number.isNaN(remoteMs) || remoteMs >= localMs || Number.isNaN(localMs)) {
      byId.set(remote.id, remoteBooking);
    }
  }

  writeTombstones(tombstones);
  const next = sortBookings(
    [...byId.values()].filter(
      (booking) => isLocalBookingId(booking.id) || !tombstones[booking.id],
    ),
  );
  setBookingsStoreSnapshot(next);
  writeCachedBookings(next);
  return next;
}

function serverIdsInSnapshot(): Set<string> {
  return new Set(
    bookingsSnapshot.filter((booking) => !isLocalBookingId(booking.id)).map((booking) => booking.id),
  );
}

export async function refreshBookingsSnapshot(): Promise<ProjectBooking[]> {
  if (refreshPromise) {
    return refreshPromise;
  }

  const knownIdsBeforeFetch = serverIdsInSnapshot();

  refreshPromise = withTimeout(loadProductionProjectBookings(), REFRESH_TIMEOUT_MS)
    .then((bookings) => {
      const pendingLocals = bookingsSnapshot.filter((booking) => isLocalBookingId(booking.id));
      const byId = new Map(bookings.map((booking) => [booking.id, dtoToProjectBooking(booking)]));
      for (const local of pendingLocals) {
        byId.set(local.id, local);
      }
      for (const current of bookingsSnapshot) {
        if (
          !isLocalBookingId(current.id) &&
          !knownIdsBeforeFetch.has(current.id) &&
          !byId.has(current.id)
        ) {
          byId.set(current.id, current);
        }
      }

      const tombstones = readTombstones();
      const now = new Date().toISOString();
      const remoteIds = new Set(bookings.map((booking) => booking.id));
      for (const priorId of knownIdsBeforeFetch) {
        if (!remoteIds.has(priorId)) {
          tombstones[priorId] = tombstones[priorId] ?? now;
        }
      }
      for (const booking of bookings) {
        delete tombstones[booking.id];
      }
      writeTombstones(tombstones);

      const next = sortBookings(
        [...byId.values()].filter(
          (booking) => isLocalBookingId(booking.id) || !tombstones[booking.id],
        ),
      );
      setBookingsStoreSnapshot(next);
      writeCachedBookings(next);
      writeProjectBookingsSyncCursor(latestTimestamp(bookings.map((booking) => booking.updatedAt)));
      return next;
    })
    .finally(() => {
      refreshPromise = null;
    });

  return refreshPromise;
}

export async function reconcileProjectBookingsFromApi(): Promise<ProjectBooking[]> {
  if (reconcilePromise) {
    return reconcilePromise;
  }

  reconcilePromise = (async () => {
    const studioId = getActiveStudioId();
    if (!studioId) {
      return bookingsSnapshot;
    }

    if (!isBrowserOnline()) {
      hydrateBookingsSnapshotFromCache();
      return bookingsSnapshot;
    }

    if (bookingsSnapshot.length === 0) {
      hydrateBookingsSnapshotFromCache();
    }

    const cursor = readProjectBookingsSyncCursor(studioId);
    if (!cursor) {
      const full = await refreshBookingsSnapshot();
      await flushPendingProjectBookingCreates();
      notifyBookingsUpdated();
      return full;
    }

    let since = cursor;
    let hasMore = true;
    while (hasMore) {
      const page = await withTimeout(
        projectBookingsApi.pullProjectBookingChanges({ since }),
        REFRESH_TIMEOUT_MS,
      );
      if (page.records.length > 0) {
        applyProjectBookingChangeRecords(page.records);
      }
      const parsedServer = Date.parse(page.serverTime);
      const parsedSince = Date.parse(since);
      const nextCursor =
        !Number.isNaN(parsedServer) && (Number.isNaN(parsedSince) || parsedServer >= parsedSince)
          ? page.serverTime
          : since;
      writeProjectBookingsSyncCursor(nextCursor, studioId);
      since = nextCursor;
      hasMore = page.hasMore;
    }

    const knownIdsBeforeList = serverIdsInSnapshot();
    applyAuthoritativeActiveBookingList(
      await withTimeout(loadProductionProjectBookings(), REFRESH_TIMEOUT_MS),
      knownIdsBeforeList,
    );

    await flushPendingProjectBookingCreates();
    notifyBookingsUpdated();
    return bookingsSnapshot;
  })().finally(() => {
    reconcilePromise = null;
  });

  return reconcilePromise;
}

export function upsertBookingInSnapshot(booking: ProjectBooking): void {
  const tomb = readTombstones()[booking.id];
  if (tomb && !isLocalBookingId(booking.id)) {
    const tombMs = Date.parse(tomb);
    const bookingMs = Date.parse(booking.updatedAt);
    if (!Number.isNaN(tombMs) && (Number.isNaN(bookingMs) || bookingMs <= tombMs)) {
      return;
    }
    const tombstones = readTombstones();
    delete tombstones[booking.id];
    writeTombstones(tombstones);
  }

  const next = sortBookings([
    booking,
    ...bookingsSnapshot.filter((entry) => entry.id !== booking.id),
  ]);
  setBookingsStoreSnapshot(next);
  writeCachedBookings(next);
}

export function removeBookingFromSnapshot(bookingId: string): void {
  const next = bookingsSnapshot.filter((booking) => booking.id !== bookingId);
  setBookingsStoreSnapshot(next);
  writeCachedBookings(next);
  const tombstones = readTombstones();
  tombstones[bookingId] = new Date().toISOString();
  writeTombstones(tombstones);
}

export function remapLocalBookingIdInSnapshot(
  localId: string,
  serverBooking: ProjectBookingResponseDto,
): void {
  remapLocalBookingId(localId, serverBooking.id);
  const serverProjectBooking = dtoToProjectBooking(serverBooking);
  const withoutLocal = bookingsSnapshot.filter(
    (booking) => booking.id !== localId && booking.id !== serverBooking.id,
  );
  setBookingsStoreSnapshot(sortBookings([serverProjectBooking, ...withoutLocal]));
  writeCachedBookings(bookingsSnapshot);
  removePendingProjectBookingCreate(localId);
  notifyBookingsUpdated();
}

function enqueueOptimisticCreate(
  studioId: string,
  payload: PendingProjectBookingCreatePayload,
): ProjectBooking {
  const localId = createLocalBookingId();
  const optimistic = buildOptimisticProjectBooking(localId, payload);
  enqueuePendingProjectBookingCreate({
    localId,
    studioId,
    payload,
    enqueuedAt: new Date().toISOString(),
  });
  upsertBookingInSnapshot(optimistic);
  notifyBookingsUpdated();
  return optimistic;
}

function isSlotConflictError(error: unknown): boolean {
  return error instanceof ApiError && error.code === "SLOT_CONFLICT";
}

export async function createProjectBookingOfflineAware(
  payload: PendingProjectBookingCreatePayload,
): Promise<ProjectBooking> {
  const studioId = getActiveStudioId();
  if (!studioId) {
    throw new Error("Studio context required");
  }

  const duplicate = findDuplicateInSnapshot(payload);
  if (duplicate) {
    return duplicate;
  }

  if (!isBrowserOnline()) {
    return enqueueOptimisticCreate(studioId, payload);
  }

  const fingerprint = createPayloadFingerprint(payload);
  const inflight = inFlightCreates.get(fingerprint);
  if (inflight) {
    const created = await inflight;
    return dtoToProjectBooking(created);
  }

  const request = projectBookingsApi.createProjectBooking(payload);
  void request.catch(() => undefined);
  inFlightCreates.set(fingerprint, request);

  const createPromise = (async () => {
    try {
      const created = await withTimeout(request, CREATE_TIMEOUT_MS);
      const booking = dtoToProjectBooking(created);
      upsertBookingInSnapshot(booking);
      notifyBookingsUpdated();
      return booking;
    } catch (error) {
      if (isSlotConflictError(error)) {
        throw error;
      }
      if (!isRetryableSyncFailure(error)) {
        throw error;
      }
      const optimistic = enqueueOptimisticCreate(studioId, payload);
      void request
        .then((created) => {
          updatePendingProjectBookingCreate(optimistic.id, { serverId: created.id }, studioId);
          remapLocalBookingIdInSnapshot(optimistic.id, created);
        })
        .catch(() => {
          // Leave queued for flush if the original POST never landed.
        });
      return optimistic;
    }
  })();

  void request.finally(() => {
    inFlightCreates.delete(fingerprint);
  });

  return createPromise;
}

export async function flushPendingProjectBookingCreates(): Promise<void> {
  if (flushPromise) {
    return flushPromise;
  }

  flushPromise = (async () => {
    if (typeof navigator !== "undefined" && !navigator.onLine) {
      return;
    }

    const studioId = getActiveStudioId();
    if (!studioId) {
      return;
    }

    const pending = listPendingProjectBookingCreates(studioId);
    for (const entry of pending) {
      try {
        const fingerprint = createPayloadFingerprint(entry.payload);
        const inflight = inFlightCreates.get(fingerprint);
        if (inflight) {
          try {
            const created = await inflight;
            updatePendingProjectBookingCreate(entry.localId, { serverId: created.id }, studioId);
            remapLocalBookingIdInSnapshot(entry.localId, created);
          } catch (error) {
            if (isSlotConflictError(error)) {
              updatePendingProjectBookingCreate(
                entry.localId,
                { slotConflict: true },
                studioId,
              );
            }
          }
          continue;
        }

        if (entry.serverId) {
          const existing = bookingsSnapshot.find((booking) => booking.id === entry.serverId);
          if (existing) {
            remapLocalBookingIdInSnapshot(
              entry.localId,
              projectBookingToResponseDto(existing, studioId),
            );
            continue;
          }
          try {
            const fetched = await projectBookingsApi.getProjectBooking(entry.serverId);
            remapLocalBookingIdInSnapshot(entry.localId, fetched);
            continue;
          } catch {
            // Fall through and recreate if the remembered server id is gone.
          }
        }

        const duplicate = findDuplicateInSnapshot(entry.payload, entry.localId);
        if (duplicate) {
          updatePendingProjectBookingCreate(entry.localId, { serverId: duplicate.id }, studioId);
          remapLocalBookingIdInSnapshot(
            entry.localId,
            projectBookingToResponseDto(duplicate, studioId),
          );
          continue;
        }

        const created = await withTimeout(
          projectBookingsApi.createProjectBooking(entry.payload),
          CREATE_TIMEOUT_MS,
        );
        updatePendingProjectBookingCreate(entry.localId, { serverId: created.id }, studioId);
        remapLocalBookingIdInSnapshot(entry.localId, created);
      } catch (error) {
        if (isSlotConflictError(error)) {
          updatePendingProjectBookingCreate(entry.localId, { slotConflict: true }, studioId);
          continue;
        }
        // Leave in queue for the next online/focus reconcile.
      }
    }
  })().finally(() => {
    flushPromise = null;
  });

  return flushPromise;
}

export function isSlotAvailableInSnapshot(
  studioId: string,
  date: string,
  slotId: string,
  excludeBookingId?: string,
): boolean {
  return !bookingsSnapshot.some(
    (booking) =>
      OCCUPYING_BOOKING_STATUSES.includes(booking.status) &&
      booking.studioId === studioId &&
      booking.date === date &&
      booking.slotId === slotId &&
      booking.id !== excludeBookingId,
  );
}
