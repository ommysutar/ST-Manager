import { beforeEach, describe, expect, it, vi } from "vitest";

import type { AuthenticatedUser } from "../auth/auth.types";
import { AuthRepository } from "../auth/auth.repository";
import { ClientsRepository } from "../clients/clients.repository";
import { SessionsRepository } from "../sessions/sessions.repository";
import { InvoicesRepository } from "./invoices.repository";
import { InvoicesService } from "./invoices.service";

const actor: AuthenticatedUser = {
  userId: "user-1",
  email: "owner@studio.test",
  role: "owner",
};

describe("InvoicesService client studio ownership", () => {
  let service: InvoicesService;
  let invoicesRepository: {
    create: ReturnType<typeof vi.fn>;
    generateNumber: ReturnType<typeof vi.fn>;
  };
  let clientsRepository: { findById: ReturnType<typeof vi.fn> };
  let sessionsRepository: Record<string, never>;
  let authRepository: { findById: ReturnType<typeof vi.fn> };

  beforeEach(() => {
    invoicesRepository = {
      create: vi.fn(),
      generateNumber: vi.fn().mockResolvedValue("000001"),
    };
    clientsRepository = { findById: vi.fn() };
    sessionsRepository = {};
    authRepository = {
      findById: vi.fn().mockResolvedValue({ id: "user-1", studioId: "studio-a" }),
    };

    service = new InvoicesService(
      invoicesRepository as unknown as InvoicesRepository,
      clientsRepository as unknown as ClientsRepository,
      sessionsRepository as unknown as SessionsRepository,
      authRepository as unknown as AuthRepository,
    );
  });

  it("rejects a foreign studio clientId", async () => {
    clientsRepository.findById.mockResolvedValue(null);

    await expect(
      service.create(actor, {
        clientId: "client-foreign",
        sessionId: null,
        taxRate: 0,
        notes: null,
        dueDate: "2026-08-20T00:00:00.000Z",
        lineItems: [{ description: "Mix", quantity: 1, unitPrice: 100, amount: 100 }],
      }),
    ).rejects.toThrow("Client client-foreign not found");

    expect(clientsRepository.findById).toHaveBeenCalledWith("client-foreign", "studio-a");
    expect(invoicesRepository.create).not.toHaveBeenCalled();
  });

  it("accepts a same-studio clientId", async () => {
    clientsRepository.findById.mockResolvedValue({
      id: "client-a",
      studioId: "studio-a",
      name: "Acme",
    });
    invoicesRepository.create.mockResolvedValue({
      id: "invoice-1",
      clientId: "client-a",
      sessionId: null,
      number: "000001",
      status: "draft",
      lineItems: [],
      subtotal: 100,
      taxRate: 0,
      tax: 0,
      total: 100,
      dueDate: new Date("2026-08-20T00:00:00.000Z"),
      issuedAt: null,
      paidAt: null,
      notes: null,
      deletedAt: null,
      createdAt: new Date(),
      updatedAt: new Date(),
      clientName: "Acme",
      sessionTitle: null,
    });

    await expect(
      service.create(actor, {
        clientId: "client-a",
        sessionId: null,
        taxRate: 0,
        notes: null,
        dueDate: "2026-08-20T00:00:00.000Z",
        lineItems: [{ description: "Mix", quantity: 1, unitPrice: 100, amount: 100 }],
      }),
    ).resolves.toMatchObject({ id: "invoice-1", clientId: "client-a" });
  });
});
