export interface UpdateClientDto {
  name?: string;
  email?: string | null;
  phone?: string | null;
  whatsappNumber?: string | null;
  whatsappSameAsPhone?: boolean;
  company?: string | null;
  notes?: string | null;
}
