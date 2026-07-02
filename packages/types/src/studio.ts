/**
 * Core Studio domain entity. This is the first real domain type introduced
 * in Phase 2 (M1) and is intentionally minimal — additional fields will be
 * added alongside the corresponding Prisma model in packages/database (M2).
 */
export interface Studio {
  id: string;
  name: string;
  createdAt: Date;
  updatedAt: Date;
}
