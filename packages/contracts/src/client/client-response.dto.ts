import type { Client } from "@st-manager/types";

export interface ClientResponseDto
  extends Omit<Client, "createdAt" | "updatedAt" | "deletedAt"> {
  createdAt: string;
  updatedAt: string;
}
