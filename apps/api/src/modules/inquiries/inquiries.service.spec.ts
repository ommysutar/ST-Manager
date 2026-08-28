import { beforeEach, describe, expect, it, vi } from "vitest";

import type { CreateInquiryInput } from "@st-manager/validation";

import type { AuthenticatedUser } from "../auth/auth.types";
import { AuthRepository } from "../auth/auth.repository";
import { InquiriesRepository } from "./inquiries.repository";
import { InquiriesService } from "./inquiries.service";

const actor: AuthenticatedUser = {
  userId: "user-1",
  email: "owner@studio.test",
  role: "owner",
};

describe("InquiriesService", () => {
  let service: InquiriesService;
  let repository: {
    create: ReturnType<typeof vi.fn>;
    findMany: ReturnType<typeof vi.fn>;
    count: ReturnType<typeof vi.fn>;
    findById: ReturnType<typeof vi.fn>;
    update: ReturnType<typeof vi.fn>;
    softDelete: ReturnType<typeof vi.fn>;
    findChangesSince: ReturnType<typeof vi.fn>;
  };
  let authRepository: {
    findById: ReturnType<typeof vi.fn>;
  };

  beforeEach(() => {
    repository = {
      create: vi.fn(),
      findMany: vi.fn(),
      count: vi.fn(),
      findById: vi.fn(),
      update: vi.fn(),
      softDelete: vi.fn(),
      findChangesSince: vi.fn(),
    };
    authRepository = {
      findById: vi.fn().mockResolvedValue({ id: "user-1", studioId: "studio-1" }),
    };

    service = new InquiriesService(
      repository as unknown as InquiriesRepository,
      authRepository as unknown as AuthRepository,
    );
  });

  it("creates an inquiry scoped to the actor studio", async () => {
    const inquiry = {
      id: "inquiry-1",
      studioId: "studio-1",
      inquiryNumber: "INQ-0001",
      status: "inquiry",
      projectId: null,
      advanceAmount: null,
      remainingBalance: null,
      form: { clientName: "Acme" },
      quotation: { grandTotal: 1000 },
      deletedAt: null,
      createdAt: new Date("2026-01-01T00:00:00.000Z"),
      updatedAt: new Date("2026-01-01T00:00:00.000Z"),
    };
    repository.create.mockResolvedValue(inquiry);

    const input = {
      status: "inquiry" as const,
      projectId: null,
      form: { clientName: "Acme" },
      quotation: { grandTotal: 1000 },
    } satisfies CreateInquiryInput;

    const result = await service.create(actor, input);

    expect(repository.create).toHaveBeenCalledWith({
      studioId: "studio-1",
      status: "inquiry",
      projectId: null,
      advanceAmount: null,
      remainingBalance: null,
      form: { clientName: "Acme" },
      quotation: { grandTotal: 1000 },
    });
    expect(result).toEqual(inquiry);
  });

  it("pulls changes with pagination metadata", async () => {
    const rows = Array.from({ length: 3 }, (_, index) => ({
      id: `inquiry-${index}`,
      studioId: "studio-1",
      inquiryNumber: `INQ-000${index + 1}`,
      status: "inquiry",
      projectId: null,
      advanceAmount: null,
      remainingBalance: null,
      form: {},
      quotation: {},
      deletedAt: null,
      createdAt: new Date("2026-01-01T00:00:00.000Z"),
      updatedAt: new Date(`2026-01-0${index + 1}T00:00:00.000Z`),
    }));
    repository.findChangesSince.mockResolvedValue(rows);

    const result = await service.pullChanges(actor, { since: "2026-01-01T00:00:00.000Z" });

    expect(repository.findChangesSince).toHaveBeenCalled();
    expect(result.data).toHaveLength(3);
    expect(result.hasMore).toBe(false);
    expect(result.serverTime).toBe("2026-01-03T00:00:00.000Z");
  });
});
