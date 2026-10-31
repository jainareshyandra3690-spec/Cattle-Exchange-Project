import { z } from "zod";

export const SignUpSchema = z.object({
  email: z.string().email("Please enter a valid email address").trim(),
  password: z.string().min(6, "Password must be at least 6 characters"),
  full_name: z
    .string()
    .min(2, "Full name must be at least 2 characters")
    .max(100, "Full name cannot exceed 100 characters")
    .trim(),
  phone: z
    .string()
    .regex(/^\+?[0-9]{10,15}$/, "Please enter a valid phone number (10-15 digits)")
    .trim(),
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

export type SignUpInput = z.infer<typeof SignUpSchema>;

export const SignInSchema = z.object({
  email: z.string().email("Please enter a valid email address").trim(),
  password: z.string().min(1, "Password is required"),
});

export type SignInInput = z.infer<typeof SignInSchema>;

