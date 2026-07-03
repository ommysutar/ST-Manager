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
    return this.clientsRepository.create({
      name: input.name,
      email: input.email ?? null,
      phone: input.phone ?? null,
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
    return this.clientsRepository.update(id, input);
  }

  async softDelete(id: string): Promise<void> {
    await this.getById(id);
    await this.clientsRepository.softDelete(id);
  }
}
