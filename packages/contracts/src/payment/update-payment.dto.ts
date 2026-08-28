import type { PaymentMethod, PaymentSource, PaymentStatus } from "@st-manager/types";

export interface UpdatePaymentDto {
  projectId?: string;
  amount?: number;
  method?: PaymentMethod;
  notes?: string;
  receivedBy?: string;
  source?: PaymentSource;
  status?: PaymentStatus;
}
