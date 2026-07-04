import { z } from "zod";

export const serviceFormSchema = z.object({
  name: z.string().trim().min(1, "Service name is required").max(120),
  price: z.number().min(0, "Price must be zero or greater"),
  category: z.string().trim().max(80).optional().or(z.literal("")),
  description: z.string().trim().max(500).optional().or(z.literal("")),
  active: z.boolean(),
});

export type ServiceFormValues = z.infer<typeof serviceFormSchema>;

export const defaultServiceFormValues: ServiceFormValues = {
  name: "",
  price: 0,
  category: "",
  description: "",
  active: true,
};
