import { Injectable, NotFoundException } from "@nestjs/common";
import type { PaginationMetaDto } from "@st-manager/contracts";
import type { Client } from "@st-manager/types";
import type {
  CreateClientInput,
  ListClientsQueryInput,
  UpdateClientInput,
} from "@st-manager/validation";

import { ClientsRepository } from "./clients.repository";

@Injectable()
export class ClientsService {
  constructor(private readonly clientsRepository: ClientsRepository) {}

  async create(input: CreateClientInput): Promise<Client> {
    const whatsappSameAsPhone = input.whatsappSameAsPhone ?? false;
    const phone = input.phone ?? null;
    const whatsappNumber = whatsappSameAsPhone ? phone : (input.whatsappNumber ?? null);

    return this.clientsRepository.create({
      name: input.name,
      email: input.email ?? null,
      phone,
      whatsappNumber,
      whatsappSameAsPhone,
      company: input.company ?? null,
      notes: input.notes ?? null,
    });
  }

  async list(query: ListClientsQueryInput): Promise<{ data: Client[]; meta: PaginationMetaDto }> {
    const { page, pageSize, search } = query;
    const skip = (page - 1) * pageSize;

    const [data, total] = await Promise.all([
      this.clientsRepository.findMany({ skip, take: pageSize, search }),
      this.clientsRepository.count(search),
    ]);

    return { data, meta: { page, pageSize, total } };
  }

  async getById(id: string): Promise<Client> {
    const client = await this.clientsRepository.findById(id);
    if (!client) {
      throw new NotFoundException(`Client ${id} not found`);
    }

    return client;
  }

  async update(id: string, input: UpdateClientInput): Promise<Client> {
    await this.getById(id);
    const existing = await this.getById(id);

    const whatsappSameAsPhone =
      input.whatsappSameAsPhone !== undefined
        ? input.whatsappSameAsPhone
        : existing.whatsappSameAsPhone;
    const phone = input.phone !== undefined ? input.phone : existing.phone;

    const updateData: UpdateClientInput = { ...input };

    if (input.whatsappSameAsPhone !== undefined || input.phone !== undefined) {
      updateData.whatsappNumber = whatsappSameAsPhone ? phone : (input.whatsappNumber ?? existing.whatsappNumber);
      updateData.whatsappSameAsPhone = whatsappSameAsPhone;
    } else if (input.whatsappNumber !== undefined && !whatsappSameAsPhone) {
      updateData.whatsappNumber = input.whatsappNumber;
    }

    return this.clientsRepository.update(id, updateData);
  }

  async softDelete(id: string): Promise<void> {
    await this.getById(id);
    await this.clientsRepository.softDelete(id);
  }
}
