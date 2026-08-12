export interface Client {
  id: string;
  studioId: string;
  name: string;
  /** Stable studio-scoped display id such as CL-0001. */
  displayNumber: string;
  email: string | null;
  phone: string | null;
  whatsappNumber: string | null;
  whatsappSameAsPhone: boolean;
  company: string | null;
  notes: string | null;
  deletedAt: Date | null;
  createdAt: Date;
  updatedAt: Date;
}
