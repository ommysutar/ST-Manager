import { z } from "zod";

export const manualProjectSchema = z.object({
  projectName: z.string().trim().min(1, "Project name is required"),
  clientName: z.string().trim().min(1, "Client name is required"),
  clientMobile: z.string().trim().optional().or(z.literal("")),
  assignedEngineer: z.string().trim().optional().or(z.literal("")),
  selectedServiceIds: z.array(z.string()).min(1, "Select at least one service"),
  notes: z.string().optional().or(z.literal("")),
});

export type ManualProjectFormValues = z.infer<typeof manualProjectSchema>;

export const defaultManualProjectValues: ManualProjectFormValues = {
  projectName: "",
  clientName: "",
  clientMobile: "",
  assignedEngineer: "",
  selectedServiceIds: [],
  notes: "",
};

export const projectTaskSchema = z.object({
  name: z.string().trim().min(1, "Task name is required"),
  assignedEngineer: z.string().trim().optional().or(z.literal("")),
  estimatedDurationMinutes: z.number().min(15, "Minimum 15 minutes"),
  notes: z.string().optional().or(z.literal("")),
  dueDate: z.string().optional().or(z.literal("")),
});

export type ProjectTaskFormValues = z.infer<typeof projectTaskSchema>;
