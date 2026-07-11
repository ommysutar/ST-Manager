import { ForbiddenException } from "@nestjs/common";
import { TEAM_ROLES } from "@st-manager/constants";
import { beforeEach, describe, expect, it, vi } from "vitest";

import { ProfileService } from "./profile.service";

describe("ProfileService", () => {
  const prisma = {
    user: {
      findUnique: vi.fn(),
      update: vi.fn(),
    },
    studio: {
      update: vi.fn(),
    },
    $transaction: vi.fn(async (fn: (tx: typeof prisma) => Promise<unknown>) => fn(prisma)),
  };

  const prismaService = {
    getClient: () => prisma,
  };

  let service: ProfileService;

  beforeEach(() => {
    vi.clearAllMocks();
    service = new ProfileService(prismaService as never);
  });

  it("updates member fullName and phone", async () => {
    prisma.user.findUnique
      .mockResolvedValueOnce({
        id: "u1",
        email: "member@studio.com",
        fullName: "Old",
        phone: null,
        role: TEAM_ROLES.ASSISTANT,
        studioId: "s1",
        studio: { id: "s1", name: "Studio" },
      })
      .mockResolvedValueOnce({
        id: "u1",
        email: "member@studio.com",
        fullName: "New Name",
        phone: "999",
        role: TEAM_ROLES.ASSISTANT,
        studioId: "s1",
        studio: { id: "s1", name: "Studio" },
      });

    const result = await service.updateProfile(
      { userId: "u1", email: "member@studio.com", role: TEAM_ROLES.ASSISTANT },
      { fullName: "New Name", phone: "999" },
    );

    expect(prisma.user.update).toHaveBeenCalledWith({
      where: { id: "u1" },
      data: { fullName: "New Name", phone: "999" },
    });
    expect(prisma.studio.update).not.toHaveBeenCalled();
    expect(result.fullName).toBe("New Name");
    expect(result.phone).toBe("999");
  });

  it("rejects studioName updates from non-owners", async () => {
    prisma.user.findUnique.mockResolvedValueOnce({
      id: "u1",
      email: "member@studio.com",
      fullName: "Member",
      phone: null,
      role: TEAM_ROLES.ASSISTANT,
      studioId: "s1",
      studio: { id: "s1", name: "Studio" },
    });

    await expect(
      service.updateProfile(
        { userId: "u1", email: "member@studio.com", role: TEAM_ROLES.ASSISTANT },
        { studioName: "Hacked" },
      ),
    ).rejects.toBeInstanceOf(ForbiddenException);
  });

  it("updates studio name for owners", async () => {
    prisma.user.findUnique
      .mockResolvedValueOnce({
        id: "u1",
        email: "owner@studio.com",
        fullName: "Owner",
        phone: "111",
        role: TEAM_ROLES.OWNER,
        studioId: "s1",
        studio: { id: "s1", name: "Old Studio" },
      })
      .mockResolvedValueOnce({
        id: "u1",
        email: "owner@studio.com",
        fullName: "Owner",
        phone: "111",
        role: TEAM_ROLES.OWNER,
        studioId: "s1",
        studio: { id: "s1", name: "New Studio" },
      });

    const result = await service.updateProfile(
      { userId: "u1", email: "owner@studio.com", role: TEAM_ROLES.OWNER },
      { studioName: "New Studio" },
    );

    expect(prisma.studio.update).toHaveBeenCalledWith({
      where: { id: "s1" },
      data: { name: "New Studio" },
    });
    expect(result.studioName).toBe("New Studio");
  });
});
