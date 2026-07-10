import { beforeEach, describe, expect, it, vi } from "vitest";

import { PlatformAdminService } from "./platform-admin.service";

vi.mock("bcrypt", () => ({
  hash: vi.fn(async () => "$2b$10$hashed-platform-admin-password"),
  compare: vi.fn(),
}));

describe("PlatformAdminService bootstrap", () => {
  let service: PlatformAdminService;
  let repository: {
    countPlatformAdmins: ReturnType<typeof vi.fn>;
    findByEmail: ReturnType<typeof vi.fn>;
    createPlatformAdmin: ReturnType<typeof vi.fn>;
  };
  let configService: {
    get: ReturnType<typeof vi.fn>;
  };

  beforeEach(() => {
    repository = {
      countPlatformAdmins: vi.fn(),
      findByEmail: vi.fn(),
      createPlatformAdmin: vi.fn(),
    };
    configService = {
      get: vi.fn((key: string) => {
        if (key === "PLATFORM_ADMIN_EMAIL") return "platform-admin@stmanager.app";
        if (key === "PLATFORM_ADMIN_PASSWORD") return "PlatformAdmin!Secure";
        return undefined;
      }),
    };

    service = new PlatformAdminService(
      repository as never,
      { signAsync: vi.fn() } as never,
      configService as never,
    );
  });

  it("creates exactly one platform admin when none exist", async () => {
    repository.countPlatformAdmins.mockResolvedValue(0);
    repository.findByEmail.mockResolvedValue(null);
    repository.createPlatformAdmin.mockResolvedValue({
      id: "admin-1",
      email: "platform-admin@stmanager.app",
      role: "platform_admin",
    });

    await service.bootstrapPlatformAdmin();

    expect(repository.createPlatformAdmin).toHaveBeenCalledTimes(1);
    expect(repository.createPlatformAdmin).toHaveBeenCalledWith({
      email: "platform-admin@stmanager.app",
      passwordHash: "$2b$10$hashed-platform-admin-password",
      fullName: "Platform Admin",
    });
  });

  it("does nothing on second bootstrap when a platform admin already exists", async () => {
    repository.countPlatformAdmins.mockResolvedValue(1);

    await service.bootstrapPlatformAdmin();
    await service.bootstrapPlatformAdmin();

    expect(repository.createPlatformAdmin).not.toHaveBeenCalled();
    expect(repository.findByEmail).not.toHaveBeenCalled();
  });

  it("never overwrites an existing account email that is not a platform admin", async () => {
    repository.countPlatformAdmins.mockResolvedValue(0);
    repository.findByEmail.mockResolvedValue({
      id: "studio-owner",
      email: "platform-admin@stmanager.app",
      role: "owner",
    });

    await service.bootstrapPlatformAdmin();

    expect(repository.createPlatformAdmin).not.toHaveBeenCalled();
  });

  it("skips bootstrap when env credentials are missing", async () => {
    configService.get.mockReturnValue(undefined);

    await service.bootstrapPlatformAdmin();

    expect(repository.countPlatformAdmins).not.toHaveBeenCalled();
    expect(repository.createPlatformAdmin).not.toHaveBeenCalled();
  });
});
