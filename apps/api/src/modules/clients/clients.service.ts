import {
  ForbiddenException,
  Injectable,
  NotFoundException,
  UnauthorizedException,
} from "@nestjs/common";
import { PLATFORM_ROLES, SYNC } from "@st-manager/constants";
import type { PaginationMetaDto } from "@st-manager/contracts";
import type { Client } from "@st-manager/types";
import type {
  CreateClientInput,
  ListClientsQueryInput,
  SyncClientsPullQueryInput,
  UpdateClientInput,
} from "@st-manager/validation";

import { AuthRepository } from "../auth/auth.repository";
import type { AuthenticatedUser } from "../auth/auth.types";
import { ClientsRepository } from "./clients.repository";

@Injectable()
export class ClientsService {
  constructor(
    private readonly clientsRepository: ClientsRepository,
    private readonly authRepository: AuthRepository,
  ) {}

  async create(actor: AuthenticatedUser, input: CreateClientInput): Promise<Client> {
    const studioId = await this.requireStudioId(actor);
    const whatsappSameAsPhone = input.whatsappSameAsPhone ?? false;
    const phone = input.phone ?? null;
    const whatsappNumber = whatsappSameAsPhone ? phone : (input.whatsappNumber ?? null);

    return this.clientsRepository.create({
      studioId,
      name: input.name,
      email: input.email ?? null,
      phone,
      whatsappNumber,
      whatsappSameAsPhone,
      company: input.company ?? null,
      notes: input.notes ?? null,
    });
  }

  async list(
    actor: AuthenticatedUser,
    query: ListClientsQueryInput,
  ): Promise<{ data: Client[]; meta: PaginationMetaDto }> {
    const studioId = await this.requireStudioId(actor);
    const { page, pageSize, search } = query;
    const skip = (page - 1) * pageSize;

    const [data, total] = await Promise.all([
      this.clientsRepository.findMany({ studioId, skip, take: pageSize, search }),
      this.clientsRepository.count(studioId, search),
    ]);

    return { data, meta: { page, pageSize, total } };
  }

  async pullChanges(
    actor: AuthenticatedUser,
    query: SyncClientsPullQueryInput,
  ): Promise<{ data: Client[]; serverTime: string; hasMore: boolean }> {
    const studioId = await this.requireStudioId(actor);
    const serverNow = new Date();
    let since = query.since ? new Date(query.since) : undefined;
    if (since && Number.isNaN(since.getTime())) {
      since = undefined;
    }
    // A client-stamped cursor ahead of the API/DB clock would skip deletes forever.
    if (since && since.getTime() > serverNow.getTime()) {
      since = undefined;
    }

    const take = SYNC.MAX_CLIENTS_PULL_BATCH;
    const rows = await this.clientsRepository.findChangesSince({
      studioId,
      since,
      take: take + 1,
    });
    const hasMore = rows.length > take;
    const page = hasMore ? rows.slice(0, take) : rows;
    const lastUpdatedAt = page.at(-1)?.updatedAt;
    const serverTime = lastUpdatedAt
      ? lastUpdatedAt.toISOString()
      : since && since.getTime() <= serverNow.getTime()
        ? since.toISOString()
        : serverNow.toISOString();

    return {
      data: page,
      serverTime,
      hasMore,
    };
  }

  async getById(actor: AuthenticatedUser, id: string): Promise<Client> {
    const studioId = await this.requireStudioId(actor);
    const client = await this.clientsRepository.findById(id, studioId);
    if (!client) {
      throw new NotFoundException(`Client ${id} not found`);
    }
    return client;
  }

  async update(actor: AuthenticatedUser, id: string, input: UpdateClientInput): Promise<Client> {
    const studioId = await this.requireStudioId(actor);
    const existing = await this.clientsRepository.findById(id, studioId);
    if (!existing) {
      throw new NotFoundException(`Client ${id} not found`);
    }

    const whatsappSameAsPhone =
      input.whatsappSameAsPhone !== undefined
        ? input.whatsappSameAsPhone
        : existing.whatsappSameAsPhone;
    const phone = input.phone !== undefined ? input.phone : existing.phone;

    const updateData: {
      name?: string;
      email?: string | null;
      phone?: string | null;
      whatsappNumber?: string | null;
      whatsappSameAsPhone?: boolean;
      company?: string | null;
      notes?: string | null;
    } = {};

    if (input.name !== undefined) updateData.name = input.name;
    if (input.email !== undefined) updateData.email = input.email;
    if (input.phone !== undefined) updateData.phone = input.phone;
    if (input.company !== undefined) updateData.company = input.company;
    if (input.notes !== undefined) updateData.notes = input.notes;

    if (input.whatsappSameAsPhone !== undefined || input.phone !== undefined) {
      updateData.whatsappNumber = whatsappSameAsPhone
        ? phone
        : (input.whatsappNumber ?? existing.whatsappNumber);
      updateData.whatsappSameAsPhone = whatsappSameAsPhone;
    } else if (input.whatsappNumber !== undefined && !whatsappSameAsPhone) {
      updateData.whatsappNumber = input.whatsappNumber;
    }

    try {
      return await this.clientsRepository.update(id, studioId, updateData);
    } catch (error) {
      if (error instanceof Error && error.message.startsWith("CLIENT_NOT_FOUND:")) {
        throw new NotFoundException(`Client ${id} not found`);
      }
      throw error;
    }
  }

  async softDelete(actor: AuthenticatedUser, id: string): Promise<void> {
    const studioId = await this.requireStudioId(actor);
    try {
      await this.clientsRepository.softDelete(id, studioId);
    } catch (error) {
      if (error instanceof Error && error.message.startsWith("CLIENT_NOT_FOUND:")) {
        throw new NotFoundException(`Client ${id} not found`);
      }
      throw error;
    }
  }

  async requireStudioId(actor: AuthenticatedUser): Promise<string> {
    if (actor.role === PLATFORM_ROLES.PLATFORM_ADMIN) {
      throw new ForbiddenException("Platform admin cannot access studio clients");
    }

    const user = await this.authRepository.findById(actor.userId);
    if (!user?.studioId) {
      throw new UnauthorizedException("Studio context required");
    }
    return user.studioId;
  }
}
