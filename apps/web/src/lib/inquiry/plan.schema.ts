import { z } from "zod";

export const projectPlanFormSchema = z.object({
  name: z.string().trim().min(1, "Plan name is required").max(120),
  price: z.number().min(0, "Price must be zero or greater"),
  featuresText: z.string().trim().min(1, "Add at least one feature"),
  highlighted: z.boolean(),
  active: z.boolean(),
});

export type ProjectPlanFormValues = z.infer<typeof projectPlanFormSchema>;

export const defaultProjectPlanFormValues: ProjectPlanFormValues = {
  name: "",
  price: 0,
  featuresText: "",
  highlighted: false,
  active: true,
};

export function featuresToText(features: string[]): string {
  return features.join("\n");
}

export function textToFeatures(featuresText: string): string[] {
  return featuresText
    .split("\n")
    .map((feature) => feature.trim())
    .filter(Boolean);
}
