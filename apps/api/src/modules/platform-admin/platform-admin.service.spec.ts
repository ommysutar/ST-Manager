import { beforeEach, describe, expect, it, vi } from "vitest";
import * as bcrypt from "bcrypt";

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
    updatePlatformAdminPassword: ReturnType<typeof vi.fn>;
  };
  let configService: {
    get: ReturnType<typeof vi.fn>;
  };

  beforeEach(() => {
    repository = {
      countPlatformAdmins: vi.fn(),
      findByEmail: vi.fn(),
      createPlatformAdmin: vi.fn(),
      updatePlatformAdminPassword: vi.fn(),
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

    vi.mocked(bcrypt.compare).mockReset();
    vi.mocked(bcrypt.hash).mockClear();
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

  it("does not create duplicates when admin exists and password matches", async () => {
    repository.countPlatformAdmins.mockResolvedValue(1);
    repository.findByEmail.mockResolvedValue({
      id: "admin-1",
      email: "platform-admin@stmanager.app",
      role: "platform_admin",
      passwordHash: "$2b$10$existing",
    });
    vi.mocked(bcrypt.compare).mockResolvedValue(true as never);

    await service.bootstrapPlatformAdmin();
    await service.bootstrapPlatformAdmin();

    expect(repository.createPlatformAdmin).not.toHaveBeenCalled();
    expect(repository.updatePlatformAdminPassword).not.toHaveBeenCalled();
  });

  it("resets password once when existing admin hash does not match env", async () => {
    repository.countPlatformAdmins.mockResolvedValue(1);
    repository.findByEmail.mockResolvedValue({
      id: "admin-1",
      email: "platform-admin@stmanager.app",
      role: "platform_admin",
      passwordHash: "$2b$10$old-hash",
    });
    vi.mocked(bcrypt.compare).mockResolvedValue(false as never);

    await service.bootstrapPlatformAdmin();

    expect(repository.createPlatformAdmin).not.toHaveBeenCalled();
    expect(repository.updatePlatformAdminPassword).toHaveBeenCalledWith(
      "admin-1",
      "$2b$10$hashed-platform-admin-password",
    );
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
