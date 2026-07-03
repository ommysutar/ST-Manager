import { ROUTES } from "@st-manager/constants";
import type {
  CompleteSessionResponseDto,
  CreateSessionResponseDto,
  StartSessionResponseDto,
} from "@st-manager/contracts";
import { describe, expect, it, vi } from "vitest";

import type { HttpClient } from "../client/types";
import { createSessionsApi } from "./sessions.api";

describe("createSessionsApi", () => {
  it("creates a session via POST /sessions", async () => {
    const post = vi.fn().mockResolvedValue({
      success: true,
      data: {
        id: "session-1",
        studioId: "studio-1",
        studioName: "Downtown",
        clientId: null,
        clientName: null,
        bookingId: null,
        bookingTitle: null,
        title: "Tracking session",
        startedAt: "2026-07-03T14:00:00.000Z",
        endedAt: null,
        status: "scheduled",
        notes: null,
        createdAt: "2026-07-03T00:00:00.000Z",
        updatedAt: "2026-07-03T00:00:00.000Z",
      },
    } satisfies CreateSessionResponseDto);

    const client: HttpClient = {
      get: vi.fn(),
      post,
      patch: vi.fn(),
      delete: vi.fn(),
    };

    const sessionsApi = createSessionsApi(client);

    await expect(
      sessionsApi.createSession({
        studioId: "studio-1",
        title: "Tracking session",
        startedAt: "2026-07-03T14:00:00.000Z",
      }),
    ).resolves.toMatchObject({ id: "session-1", title: "Tracking session" });

    expect(post).toHaveBeenCalledWith(ROUTES.SESSIONS, {
      studioId: "studio-1",
      clientId: null,
      bookingId: null,
      title: "Tracking session",
      startedAt: "2026-07-03T14:00:00.000Z",
      notes: null,
    });
  });

  it("starts and completes a session", async () => {
    const post = vi.fn().mockResolvedValue({
      success: true,
      data: {
        id: "session-1",
        studioId: "studio-1",
        studioName: "Downtown",
        clientId: null,
        clientName: null,
        bookingId: null,
        bookingTitle: null,
        title: "Tracking session",
        startedAt: "2026-07-03T14:00:00.000Z",
        endedAt: null,
        status: "in_progress",
        notes: null,
        createdAt: "2026-07-03T00:00:00.000Z",
        updatedAt: "2026-07-03T00:00:00.000Z",
      },
    } satisfies StartSessionResponseDto);

    const client: HttpClient = {
      get: vi.fn(),
      post,
      patch: vi.fn(),
      delete: vi.fn(),
    };

    const sessionsApi = createSessionsApi(client);

    await sessionsApi.startSession("session-1");
    expect(post).toHaveBeenCalledWith(`${ROUTES.SESSIONS}/session-1/start`, {});

    post.mockResolvedValueOnce({
      success: true,
      data: {
        id: "session-1",
        studioId: "studio-1",
        studioName: "Downtown",
        clientId: null,
        clientName: null,
        bookingId: null,
        bookingTitle: null,
        title: "Tracking session",
        startedAt: "2026-07-03T14:00:00.000Z",
        endedAt: "2026-07-03T16:00:00.000Z",
        status: "completed",
        notes: null,
        createdAt: "2026-07-03T00:00:00.000Z",
        updatedAt: "2026-07-03T00:00:00.000Z",
      },
    } satisfies CompleteSessionResponseDto);

    await sessionsApi.completeSession("session-1");
    expect(post).toHaveBeenCalledWith(`${ROUTES.SESSIONS}/session-1/complete`, {});
  });
});
