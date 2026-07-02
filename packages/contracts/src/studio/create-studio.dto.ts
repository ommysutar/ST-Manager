/**
 * Request body for `POST /studios`. `packages/validation`'s
 * `createStudioSchema` is written to produce a value structurally
 * compatible with this type — the schema is checked against this DTO at its
 * own definition site, not the other way around (this package never depends
 * on `packages/validation`).
 */
export interface CreateStudioDto {
  name: string;
}
