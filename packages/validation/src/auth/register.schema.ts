import { z } from "zod";

export const registerSchema = z
  .object({
    studioName: z.string().trim().min(1, "Studio name is required"),
    ownerName: z.string().trim().min(1, "Owner name is required"),
    email: z.string().trim().email(),
    password: z.string().min(8),
    confirmPassword: z.string().min(8),
  })
  .refine((data) => data.password === data.confirmPassword, {
    message: "Passwords do not match",
    path: ["confirmPassword"],
  });

export type RegisterInput = z.infer<typeof registerSchema>;
