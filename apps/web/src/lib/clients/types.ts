import type { ClientFormPayloadInput } from "./normalize-client-payload";

export type ClientSyncInput = ClientFormPayloadInput & {
  existingClientId?: string;
};
