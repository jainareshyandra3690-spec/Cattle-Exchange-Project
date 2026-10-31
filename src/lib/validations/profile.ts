import { z } from "zod";

export const ProfileUpdateSchema = z.object({
  full_name: z
    .string()
    .min(2, "Full name must be at least 2 characters")
    .max(100, "Full name cannot exceed 100 characters")
    .trim(),
  phone: z
    .string()
    .regex(/^\+?[0-9]{10,15}$/, "Please enter a valid phone number (10-15 digits)")
    .trim(),
  phone_public: z.boolean().default(false),
  district: z
    .string()
    .min(2, "District must be at least 2 characters")
    .max(100, "District cannot exceed 100 characters")
    .trim(),
  state: z
    .string()
    .min(2, "State must be at least 2 characters")
    .max(100, "State cannot exceed 100 characters")
    .trim(),
});

export type ProfileUpdateInput = z.infer<typeof ProfileUpdateSchema>;

