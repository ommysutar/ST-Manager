import { Injectable } from "@nestjs/common";
import type { PostgresPrismaClient } from "@st-manager/database";
import type { Invoice, InvoiceLineItem, InvoiceWithRelations } from "@st-manager/types";
import type { ListInvoicesQueryInput } from "@st-manager/validation";

import type { DatabaseClient } from "../../common/prisma/prisma.service";
import { PrismaService } from "../../common/prisma/prisma.service";
import { parseLineItems } from "./invoices.mapper";

function asInvoiceClient(client: DatabaseClient): PostgresPrismaClient {
  return client as PostgresPrismaClient;
}

const ACTIVE_INVOICE_FILTER = { status: { not: "void" } } as const;

const invoiceInclude = {
  client: { select: { name: true } },
  session: { select: { title: true } },
} as const;

function mapInvoice(record: {
  id: string;
  clientId: string;
  sessionId: string | null;
  number: string;
  status: string;
  lineItems: unknown;
  subtotal: number;
  taxRate: number;
  tax: number;
  total: number;
  dueDate: Date;
  issuedAt: Date | null;
  paidAt: Date | null;
  notes: string | null;
  deletedAt: Date | null;
  createdAt: Date;
  updatedAt: Date;
  client?: { name: string } | null;
  session?: { title: string } | null;
}): InvoiceWithRelations {
  return {
    id: record.id,
    clientId: record.clientId,
    sessionId: record.sessionId,
    number: record.number,
    status: record.status as Invoice["status"],
    lineItems: parseLineItems(record.lineItems),
    subtotal: record.subtotal,
    taxRate: record.taxRate,
    tax: record.tax,
    total: record.total,
    dueDate: record.dueDate,
    issuedAt: record.issuedAt,
    paidAt: record.paidAt,
    notes: record.notes,
    deletedAt: record.deletedAt,
    createdAt: record.createdAt,
    updatedAt: record.updatedAt,
    clientName: record.client?.name ?? "Unknown client",
    sessionTitle: record.session?.title ?? null,
  };
}

@Injectable()
export class InvoicesRepository {
  constructor(private readonly prismaService: PrismaService) {}

  async generateNumber(): Promise<string> {
    const client = asInvoiceClient(this.prismaService.getClient());
    const count = await client.invoice.count();
    return String(count + 1).padStart(6, "0");
  }

  async create(data: {
    clientId: string;
    sessionId: string | null;
    number: string;
    lineItems: InvoiceLineItem[];
    subtotal: number;
    taxRate: number;
    tax: number;
    total: number;
    dueDate: Date;
    notes: string | null;
  }): Promise<InvoiceWithRelations> {
    const client = asInvoiceClient(this.prismaService.getClient());
    const invoice = await client.invoice.create({
      data: {
        clientId: data.clientId,
        sessionId: data.sessionId,
        number: data.number,
        lineItems: JSON.parse(JSON.stringify(data.lineItems)),
        subtotal: data.subtotal,
        taxRate: data.taxRate,
        tax: data.tax,
        total: data.total,
        dueDate: data.dueDate,
        notes: data.notes,
        status: "draft",
      },
      include: invoiceInclude,
    });

    return mapInvoice(invoice);
  }

  async findById(id: string): Promise<InvoiceWithRelations | null> {
    const client = asInvoiceClient(this.prismaService.getClient());
    const invoice = await client.invoice.findFirst({
      where: { id, ...ACTIVE_INVOICE_FILTER },
      include: invoiceInclude,
    });

    return invoice ? mapInvoice(invoice) : null;
  }

  async findBySessionId(sessionId: string): Promise<InvoiceWithRelations | null> {
    const client = asInvoiceClient(this.prismaService.getClient());
    const invoice = await client.invoice.findFirst({
      where: { sessionId, ...ACTIVE_INVOICE_FILTER },
      include: invoiceInclude,
    });

    return invoice ? mapInvoice(invoice) : null;
  }

  async findMany(query: ListInvoicesQueryInput): Promise<{
    items: InvoiceWithRelations[];
    total: number;
  }> {
    const client = asInvoiceClient(this.prismaService.getClient());
    const skip = (query.page - 1) * query.pageSize;
    const where = {
      ...ACTIVE_INVOICE_FILTER,
      ...(query.status ? { status: query.status } : {}),
      ...(query.clientId ? { clientId: query.clientId } : {}),
      ...(query.sessionId ? { sessionId: query.sessionId } : {}),
    };

    const [invoices, total] = await Promise.all([
      client.invoice.findMany({
        where,
        include: invoiceInclude,
        orderBy: { createdAt: "desc" },
        skip,
        take: query.pageSize,
      }),
      client.invoice.count({ where }),
    ]);

    return {
      items: invoices.map(mapInvoice),
      total,
    };
  }

  async findOutstanding(): Promise<InvoiceWithRelations[]> {
    const client = asInvoiceClient(this.prismaService.getClient());
    const invoices = await client.invoice.findMany({
      where: { status: "sent" },
      include: invoiceInclude,
      orderBy: { dueDate: "asc" },
    });

    return invoices.map(mapInvoice);
  }

  async findPaidThisMonth(): Promise<InvoiceWithRelations[]> {
    const now = new Date();
    const startOfMonth = new Date(Date.UTC(now.getUTCFullYear(), now.getUTCMonth(), 1));
    const startOfNextMonth = new Date(Date.UTC(now.getUTCFullYear(), now.getUTCMonth() + 1, 1));

    const client = asInvoiceClient(this.prismaService.getClient());
    const invoices = await client.invoice.findMany({
      where: {
        status: "paid",
        paidAt: {
          gte: startOfMonth,
          lt: startOfNextMonth,
        },
      },
      include: invoiceInclude,
      orderBy: { paidAt: "desc" },
    });

    return invoices.map(mapInvoice);
  }

  async update(
    id: string,
    data: Partial<{
      clientId: string;
      lineItems: InvoiceLineItem[];
      subtotal: number;
      taxRate: number;
      tax: number;
      total: number;
      dueDate: Date;
      notes: string | null;
    }>,
  ): Promise<InvoiceWithRelations> {
    const client = asInvoiceClient(this.prismaService.getClient());
    const invoice = await client.invoice.update({
      where: { id },
      data: {
        ...(data.clientId !== undefined ? { clientId: data.clientId } : {}),
        ...(data.lineItems !== undefined
          ? { lineItems: JSON.parse(JSON.stringify(data.lineItems)) }
          : {}),
        ...(data.subtotal !== undefined ? { subtotal: data.subtotal } : {}),
        ...(data.taxRate !== undefined ? { taxRate: data.taxRate } : {}),
        ...(data.tax !== undefined ? { tax: data.tax } : {}),
        ...(data.total !== undefined ? { total: data.total } : {}),
        ...(data.dueDate !== undefined ? { dueDate: data.dueDate } : {}),
        ...(data.notes !== undefined ? { notes: data.notes } : {}),
      },
      include: invoiceInclude,
    });

    return mapInvoice(invoice);
  }

  async send(id: string, issuedAt: Date): Promise<InvoiceWithRelations> {
    const client = asInvoiceClient(this.prismaService.getClient());
    const invoice = await client.invoice.update({
      where: { id },
      data: {
        status: "sent",
        issuedAt,
      },
      include: invoiceInclude,
    });

    return mapInvoice(invoice);
  }

  async markPaid(id: string, paidAt: Date): Promise<InvoiceWithRelations> {
    const client = asInvoiceClient(this.prismaService.getClient());
    const invoice = await client.invoice.update({
      where: { id },
      data: {
        status: "paid",
        paidAt,
      },
      include: invoiceInclude,
    });

    return mapInvoice(invoice);
  }

  async void(id: string): Promise<InvoiceWithRelations> {
    const client = asInvoiceClient(this.prismaService.getClient());
    const invoice = await client.invoice.update({
      where: { id },
      data: { status: "void" },
      include: invoiceInclude,
    });

    return mapInvoice(invoice);
  }
}
