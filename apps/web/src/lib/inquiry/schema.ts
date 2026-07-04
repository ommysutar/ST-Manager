import { z } from "zod";

export const inquiryWizardSchema = z.object({
  clientName: z.string().trim().min(1, "Client name is required"),
  mobileNumber: z
    .string()
    .trim()
    .min(10, "Enter a valid mobile number")
    .regex(/^[0-9+\-\s()]+$/, "Enter a valid mobile number"),
  whatsappNumber: z.string(),
  email: z.union([z.string().trim().email("Enter a valid email"), z.literal("")]),
  address: z.string(),
  reference: z.string(),
  notes: z.string(),
  projectName: z.string().trim().min(1, "Project name is required"),
  projectCategory: z.string().trim().min(1, "Project category is required"),
  eventDate: z.string(),
  deliveryDate: z.string(),
  priority: z.enum(["low", "medium", "high"]),
  projectDescription: z.string(),
  planId: z.string(),
  selectedServiceIds: z.array(z.string()),
  studioDiscountPercent: z.number().min(0).max(100),
  advancePercent: z.number().min(0).max(100),
});

export type InquiryWizardSchema = z.infer<typeof inquiryWizardSchema>;
export type InquiryWizardFormValues = InquiryWizardSchema;

export const STEP_FIELD_MAP: Record<number, (keyof InquiryWizardSchema)[]> = {
  1: ["clientName", "mobileNumber"],
  2: ["projectName", "projectCategory"],
  3: ["planId"],
  4: ["selectedServiceIds"],
  5: [],
  6: ["advancePercent"],
};

export const defaultWizardValues: InquiryWizardSchema = {
  clientName: "",
  mobileNumber: "",
  whatsappNumber: "",
  email: "",
  address: "",
  reference: "",
  notes: "",
  projectName: "",
  projectCategory: "",
  eventDate: "",
  deliveryDate: "",
  priority: "medium",
  projectDescription: "",
  planId: "",
  selectedServiceIds: [],
  studioDiscountPercent: 0,
  advancePercent: 20,
};
