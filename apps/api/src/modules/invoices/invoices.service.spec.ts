import { ConflictException, NotFoundException } from "@nestjs/common";
import { beforeEach, describe, expect, it, vi } from "vitest";

import { ClientsRepository } from "../clients/clients.repository";
import { SessionsRepository } from "../sessions/sessions.repository";
import { InvoicesRepository } from "./invoices.repository";
import { InvoicesService } from "./invoices.service";

describe("InvoicesService", () => {
  let service: InvoicesService;
  let invoicesRepository: {
    generateNumber: ReturnType<typeof vi.fn>;
    create: ReturnType<typeof vi.fn>;
    findById: ReturnType<typeof vi.fn>;
    findBySessionId: ReturnType<typeof vi.fn>;
    findMany: ReturnType<typeof vi.fn>;
    update: ReturnType<typeof vi.fn>;
    send: ReturnType<typeof vi.fn>;
    markPaid: ReturnType<typeof vi.fn>;
    void: ReturnType<typeof vi.fn>;
  };
  let clientsRepository: {
    findById: ReturnType<typeof vi.fn>;
  };
  let sessionsRepository: {
    findById: ReturnType<typeof vi.fn>;
  };

  const invoice = {
    id: "invoice-1",
    clientId: "client-1",
    sessionId: null,
    number: "000001",
    status: "draft" as const,
    lineItems: [{ description: "Studio time", quantity: 1, unitPrice: 150, amount: 150 }],
    subtotal: 150,
    taxRate: 0,
    tax: 0,
    total: 150,
    dueDate: new Date("2026-07-10T00:00:00.000Z"),
    issuedAt: null,
    paidAt: null,
    notes: null,
    deletedAt: null,
    createdAt: new Date("2026-07-03T00:00:00.000Z"),
    updatedAt: new Date("2026-07-03T00:00:00.000Z"),
    clientName: "Acme Records",
    sessionTitle: null,
  };

  beforeEach(() => {
    invoicesRepository = {
      generateNumber: vi.fn(),
      create: vi.fn(),
      findById: vi.fn(),
      findBySessionId: vi.fn(),
      findMany: vi.fn(),
      update: vi.fn(),
      send: vi.fn(),
      markPaid: vi.fn(),
      void: vi.fn(),
    };
    clientsRepository = {
      findById: vi.fn(),
    };
    sessionsRepository = {
      findById: vi.fn(),
    };

    service = new InvoicesService(
      invoicesRepository as unknown as InvoicesRepository,
      clientsRepository as unknown as ClientsRepository,
      sessionsRepository as unknown as SessionsRepository,
    );
  });

  it("creates a draft invoice", async () => {
    clientsRepository.findById.mockResolvedValue({ id: "client-1", name: "Acme Records" });
    invoicesRepository.generateNumber.mockResolvedValue("000001");
    invoicesRepository.create.mockResolvedValue(invoice);

    await expect(
      service.create({
        clientId: "client-1",
        sessionId: null,
        lineItems: [{ description: "Studio time", quantity: 1, unitPrice: 150, amount: 150 }],
        taxRate: 0,
        dueDate: "2026-07-10T00:00:00.000Z",
        notes: null,
      }),
    ).resolves.toEqual(invoice);
  });

  it("creates an invoice from a completed session", async () => {
    sessionsRepository.findById.mockResolvedValue({
      id: "session-1",
      clientId: "client-1",
      status: "completed",
      title: "Tracking session",
      notes: "Done",
    });
    invoicesRepository.findBySessionId.mockResolvedValue(null);
    clientsRepository.findById.mockResolvedValue({ id: "client-1", name: "Acme Records" });
    invoicesRepository.generateNumber.mockResolvedValue("000002");
    invoicesRepository.create.mockResolvedValue({
      ...invoice,
      id: "invoice-2",
      sessionId: "session-1",
      sessionTitle: "Tracking session",
    });

    await expect(
      service.create({
        clientId: "client-1",
        sessionId: "session-1",
        lineItems: [{ description: "Tracking session", quantity: 1, unitPrice: 0, amount: 0 }],
        taxRate: 0,
        dueDate: "2026-07-10T00:00:00.000Z",
        notes: null,
      }),
    ).resolves.toMatchObject({ sessionId: "session-1" });
  });

  it("rejects duplicate session invoices", async () => {
    sessionsRepository.findById.mockResolvedValue({
      id: "session-1",
      clientId: "client-1",
      status: "completed",
      title: "Tracking session",
      notes: null,
    });
    invoicesRepository.findBySessionId.mockResolvedValue(invoice);

    await expect(
      service.create({
        clientId: "client-1",
        sessionId: "session-1",
        lineItems: [{ description: "Tracking session", quantity: 1, unitPrice: 0, amount: 0 }],
        taxRate: 0,
        dueDate: "2026-07-10T00:00:00.000Z",
        notes: null,
      }),
    ).rejects.toBeInstanceOf(ConflictException);
  });

  it("sends a draft invoice", async () => {
    invoicesRepository.findById.mockResolvedValue(invoice);
    invoicesRepository.send.mockResolvedValue({ ...invoice, status: "sent" });

    await expect(service.send("invoice-1")).resolves.toMatchObject({ status: "sent" });
  });

  it("marks a sent invoice paid", async () => {
    invoicesRepository.findById.mockResolvedValue({ ...invoice, status: "sent" });
    invoicesRepository.markPaid.mockResolvedValue({ ...invoice, status: "paid" });

    await expect(service.markPaid("invoice-1")).resolves.toMatchObject({ status: "paid" });
  });

  it("rejects invalid send transition", async () => {
    invoicesRepository.findById.mockResolvedValue({ ...invoice, status: "paid" });

    await expect(service.send("invoice-1")).rejects.toBeInstanceOf(ConflictException);
  });

  it("rejects editing a sent invoice", async () => {
    invoicesRepository.findById.mockResolvedValue({ ...invoice, status: "sent" });

    await expect(service.update("invoice-1", { notes: "Updated" })).rejects.toBeInstanceOf(
      ConflictException,
    );
  });

  it("throws when invoice is missing", async () => {
    invoicesRepository.findById.mockResolvedValue(null);

    await expect(service.getById("missing")).rejects.toBeInstanceOf(NotFoundException);
  });
});
