import { z } from "zod";

import { PROJECT_CATEGORIES } from "./constants";

export const customServiceSchema = z.object({
  id: z.string(),
  name: z.string().trim().min(1, "Service name is required"),
  price: z.number().min(0),
});

export const inquiryWizardSchema = z.object({
  existingClientId: z.string(),
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
  projectCategory: z.enum(PROJECT_CATEGORIES, {
    error: "Project category is required",
  }),
  eventDate: z.string(),
  deliveryDate: z.string(),
  priority: z.enum(["low", "medium", "high"]),
  projectDescription: z.string(),
  planId: z.string(),
  selectedServiceIds: z.array(z.string()),
  servicePricingTier: z.enum(["basic", "standard", "premium"]),
  customServices: z.array(customServiceSchema),
  studioRentHours: z.number().min(0).max(999),
  studioDiscountPercent: z.number().min(0).max(100),
  advancePercent: z.number().min(0).max(100),
  advanceMethod: z.enum(["cash", "upi"]),
  advanceNotes: z.string(),
  advanceConfirmed: z.boolean(),
});

export type InquiryWizardSchema = z.infer<typeof inquiryWizardSchema>;
export type InquiryWizardFormValues = InquiryWizardSchema;

export const STEP_FIELD_MAP: Record<number, (keyof InquiryWizardSchema)[]> = {
  1: ["clientName", "mobileNumber", "email"],
  2: ["projectName", "projectCategory"],
  3: [],
  4: ["selectedServiceIds"],
  5: [],
  6: ["advancePercent"],
};

export const defaultWizardValues: InquiryWizardSchema = {
  existingClientId: "",
  clientName: "",
  mobileNumber: "",
  whatsappNumber: "",
  email: "",
  address: "",
  reference: "",
  notes: "",
  projectName: "",
  projectCategory: "Audio",
  eventDate: "",
  deliveryDate: "",
  priority: "medium",
  projectDescription: "",
  planId: "",
  selectedServiceIds: [],
  servicePricingTier: "standard",
  customServices: [],
  studioRentHours: 0,
  studioDiscountPercent: 0,
  advancePercent: 20,
  advanceMethod: "cash",
  advanceNotes: "",
  advanceConfirmed: false,
};

export function normalizeInquiryForm(
  form: Partial<InquiryWizardSchema> | undefined,
): InquiryWizardSchema {
  const category = PROJECT_CATEGORIES.includes(form?.projectCategory as (typeof PROJECT_CATEGORIES)[number])
    ? form?.projectCategory
    : "Audio";

  return {
    ...defaultWizardValues,
    ...form,
    existingClientId: form?.existingClientId ?? "",
    projectCategory: category as InquiryWizardSchema["projectCategory"],
    selectedServiceIds: form?.selectedServiceIds ?? [],
    servicePricingTier: form?.servicePricingTier ?? "standard",
    customServices: form?.customServices ?? [],
    studioRentHours: form?.studioRentHours ?? 0,
    advanceMethod: form?.advanceMethod ?? "cash",
    advanceNotes: form?.advanceNotes ?? "",
    advanceConfirmed: form?.advanceConfirmed ?? false,
  };
}
