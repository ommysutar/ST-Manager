import { BadRequestException } from "@nestjs/common";
import { beforeEach, describe, expect, it, vi } from "vitest";

import { ClientPortalService } from "./client-portal.service";

describe("ClientPortalService", () => {
  const repository = {
    findByStudioAndProject: vi.fn(),
    findByTokenHash: vi.fn(),
    create: vi.fn(),
    update: vi.fn(),
  };
  const authRepository = {
    findById: vi.fn(),
  };
  const emailService = {
    sendClientPortalLink: vi.fn(),
  };
  const configService = {
    get: vi.fn(() => "https://stmanager.app"),
  };

  let service: ClientPortalService;

  beforeEach(() => {
    vi.clearAllMocks();
    authRepository.findById.mockResolvedValue({ id: "u1", studioId: "s1" });
    service = new ClientPortalService(
      repository as never,
      authRepository as never,
      emailService as never,
      configService as never,
    );
  });

  it("creates a hashed portal link and returns plaintext token once", async () => {
    repository.findByStudioAndProject.mockResolvedValue(null);
    repository.create.mockImplementation(async (data) => ({
      id: "link1",
      createdAt: new Date("2026-07-12T00:00:00.000Z"),
      expiresAt: null,
      studioMessage: null,
      ...data,
    }));

    const result = await service.create(
      { userId: "u1", email: "owner@studio.com", role: "owner" },
      "project-1",
      {
        snapshot: {
          projectName: "Album",
          clientName: "Client",
          service: "Recording",
          packageName: "Premium",
          currentStatus: "Active",
          progressPercent: 40,
          studio: { name: "Studio", logoDataUrl: "", address: "", phone: "", email: "" },
          estimate: {
            estimatedCompletionDate: null,
            scheduleStatus: "on_schedule",
            expectedCompletionDate: null,
            delayReason: null,
          },
          timeline: [],
          upcomingBooking: null,
          payment: { totalAmount: 1000, advancePaid: 200, remainingAmount: 800, status: "Partial" },
          documents: [],
          clientFiles: [],
          clientNotes: null,
          studioMessage: null,
          projectStatus: "active",
        },
      },
    );

    expect(result.token).toHaveLength(64);
    expect(result.portalUrl).toContain("/client/project/");
    expect(repository.create).toHaveBeenCalledWith(
      expect.objectContaining({
        tokenHash: expect.any(String),
        status: "active",
      }),
    );
    expect(repository.create.mock.calls[0][0].tokenHash).not.toBe(result.token);
  });

  it("rejects enable when expired", async () => {
    repository.findByStudioAndProject.mockResolvedValue({
      id: "link1",
      status: "expired",
      expiresAt: new Date("2020-01-01T00:00:00.000Z"),
      createdAt: new Date(),
      studioMessage: null,
    });

    await expect(
      service.enable({ userId: "u1", email: "owner@studio.com", role: "owner" }, "project-1"),
    ).rejects.toBeInstanceOf(BadRequestException);
  });
});
