import {
  ConflictException,
  Injectable,
  NotFoundException,
} from "@nestjs/common";
import { API_ERROR_CODES } from "@st-manager/constants";
import type { InvoiceWithRelations } from "@st-manager/types";
import type {
  CreateInvoiceInput,
  ListInvoicesQueryInput,
  UpdateInvoiceInput,
} from "@st-manager/validation";
import { computeInvoiceTotals } from "@st-manager/validation";

import { ClientsRepository } from "../clients/clients.repository";
import { SessionsRepository } from "../sessions/sessions.repository";
import { InvoicesRepository } from "./invoices.repository";

@Injectable()
export class InvoicesService {
  constructor(
    private readonly invoicesRepository: InvoicesRepository,
    private readonly clientsRepository: ClientsRepository,
    private readonly sessionsRepository: SessionsRepository,
  ) {}

  async create(input: CreateInvoiceInput): Promise<InvoiceWithRelations> {
    if (input.sessionId) {
      return this.createFromSession(input);
    }

    await this.assertClientActive(input.clientId);

    const totals = computeInvoiceTotals(input.lineItems, input.taxRate ?? 0);
    const number = await this.invoicesRepository.generateNumber();

    return this.invoicesRepository.create({
      clientId: input.clientId,
      sessionId: null,
      number,
      lineItems: input.lineItems,
      ...totals,
      taxRate: input.taxRate ?? 0,
      dueDate: new Date(input.dueDate),
      notes: input.notes ?? null,
    });
  }

  async list(query: ListInvoicesQueryInput): Promise<{
    items: InvoiceWithRelations[];
    total: number;
    page: number;
    pageSize: number;
  }> {
    const result = await this.invoicesRepository.findMany(query);
    return {
      ...result,
      page: query.page,
      pageSize: query.pageSize,
    };
  }

  async getById(id: string): Promise<InvoiceWithRelations> {
    const invoice = await this.invoicesRepository.findById(id);
    if (!invoice) {
      throw new NotFoundException(`Invoice ${id} not found`);
    }

    return invoice;
  }

  async update(id: string, input: UpdateInvoiceInput): Promise<InvoiceWithRelations> {
    const existing = await this.getById(id);
    if (existing.status !== "draft") {
      throw this.invalidTransition("Only draft invoices can be edited");
    }

    const clientId = input.clientId ?? existing.clientId;
    const lineItems = input.lineItems ?? existing.lineItems;
    const taxRate = input.taxRate ?? existing.taxRate;
    const dueDate = input.dueDate ? new Date(input.dueDate) : existing.dueDate;
    const notes = input.notes !== undefined ? input.notes : existing.notes;

    await this.assertClientActive(clientId);
    const totals = computeInvoiceTotals(lineItems, taxRate);

    return this.invoicesRepository.update(id, {
      clientId,
      lineItems,
      ...totals,
      taxRate,
      dueDate,
      notes,
    });
  }

  async send(id: string): Promise<InvoiceWithRelations> {
    const invoice = await this.getById(id);
    if (invoice.status !== "draft") {
      throw this.invalidTransition("Only draft invoices can be sent");
    }

    return this.invoicesRepository.send(id, new Date());
  }

  async markPaid(id: string): Promise<InvoiceWithRelations> {
    const invoice = await this.getById(id);
    if (invoice.status !== "sent") {
      throw this.invalidTransition("Only sent invoices can be marked paid");
    }

    return this.invoicesRepository.markPaid(id, new Date());
  }

  async void(id: string): Promise<void> {
    const invoice = await this.getById(id);
    if (invoice.status !== "draft" && invoice.status !== "sent") {
      throw this.invalidTransition("Only draft or sent invoices can be voided");
    }

    await this.invoicesRepository.void(id);
  }

  private async createFromSession(input: CreateInvoiceInput): Promise<InvoiceWithRelations> {
    const sessionId = input.sessionId!;
    const session = await this.sessionsRepository.findById(sessionId);
    if (!session) {
      throw new NotFoundException(`Session ${sessionId} not found`);
    }

    if (session.status !== "completed") {
      throw this.invalidTransition("Only completed sessions can generate invoices");
    }

    if (!session.clientId) {
      throw new ConflictException({
        message: "Session must have a client before generating an invoice",
        details: { code: API_ERROR_CODES.VALIDATION_ERROR },
      });
    }

    const existingInvoice = await this.invoicesRepository.findBySessionId(sessionId);
    if (existingInvoice) {
      throw new ConflictException({
        message: "An invoice already exists for this session",
        details: { code: API_ERROR_CODES.INVOICE_SESSION_ALREADY_LINKED },
      });
    }

    const clientId = input.clientId || session.clientId;
    await this.assertClientActive(clientId);

    const lineItems =
      input.lineItems.length > 0
        ? input.lineItems
        : [
            {
              description: session.title,
              quantity: 1,
              unitPrice: 0,
              amount: 0,
            },
          ];
    const taxRate = input.taxRate ?? 0;
    const totals = computeInvoiceTotals(lineItems, taxRate);
    const number = await this.invoicesRepository.generateNumber();

    return this.invoicesRepository.create({
      clientId,
      sessionId,
      number,
      lineItems,
      ...totals,
      taxRate,
      dueDate: new Date(input.dueDate),
      notes: input.notes ?? session.notes,
    });
  }

  private async assertClientActive(clientId: string): Promise<void> {
    const client = await this.clientsRepository.findById(clientId);
    if (!client) {
      throw new NotFoundException(`Client ${clientId} not found`);
    }
  }

  private invalidTransition(message: string): ConflictException {
    return new ConflictException({
      message,
      details: { code: API_ERROR_CODES.INVOICE_INVALID_TRANSITION },
    });
  }
}
