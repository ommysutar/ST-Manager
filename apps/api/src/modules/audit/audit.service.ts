import { Injectable } from "@nestjs/common";

import { AUDIT_ACTIONS, AuditRepository, type CreateAuditLogInput } from "./audit.repository";

@Injectable()
export class AuditService {
  constructor(private readonly auditRepository: AuditRepository) {}

  async log(input: CreateAuditLogInput): Promise<void> {
    await this.auditRepository.create(input);
  }
}

export { AUDIT_ACTIONS };
