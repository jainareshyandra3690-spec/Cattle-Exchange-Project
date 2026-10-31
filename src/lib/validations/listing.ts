import { z } from "zod";

export const CattleListingSchema = z.object({
  title: z
    .string()
    .min(10, "Title must be at least 10 characters")
    .max(140, "Title cannot exceed 140 characters")
    .trim(),
  animal_type: z.enum(["cow", "buffalo", "bull", "calf", "other"]),
  breed: z
    .string()
    .min(2, "Breed must be at least 2 characters")
    .max(80, "Breed cannot exceed 80 characters")
    .trim(),
  gender: z.enum(["female", "male"]),
  age_months: z
    .number()
    .int("Age must be a whole number")
    .min(0, "Age cannot be negative")
    .max(360, "Age cannot exceed 30 years (360 months)")
    .nullable()
    .optional(),
  milk_yield_liters_per_day: z
    .number()
    .min(0, "Yield cannot be negative")
    .max(100, "Daily milk yield cannot exceed 100 liters")
    .nullable()
    .optional(),
  price_inr: z
    .number()
    .int("Price must be a whole number")
    .positive("Price must be greater than zero")
    .max(100_000_000, "Price cannot exceed ₹10 Crore (100,000,000)"),
  description: z
    .string()
    .min(20, "Description must be at least 20 characters")
    .max(3000, "Description cannot exceed 3000 characters")
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
  status: z.enum(["draft", "published", "sold", "archived"]).default("draft"),
});

export type CattleListingInput = z.infer<typeof CattleListingSchema>;

export const ListingImageSchema = z.object({
  storage_path: z
    .string()
    .regex(
      /^listings\/[a-f0-9-]+\/[a-f0-9-]+\/[a-f0-9-]+\.(jpg|jpeg|png|webp)$/,
      "Invalid storage path format"
    ),
  sort_order: z
    .number()
    .int()
    .min(0, "Sort order must be between 0 and 4")
    .max(4, "Maximum 5 images allowed (sort order 0-4)"),
});

export type ListingImageInput = z.infer<typeof ListingImageSchema>;

export const ListingFilterSchema = z.object({
  animal_type: z.enum(["cow", "buffalo", "bull", "calf", "other"]).optional(),
  state: z.string().optional(),
  district: z.string().optional(),
  min_price: z.number().positive().optional(),
  max_price: z.number().positive().optional(),
  search: z.string().optional(),
  page: z.number().int().positive().default(1),
  limit: z.number().int().positive().max(50).default(12),
});

export type ListingFilterInput = z.infer<typeof ListingFilterSchema>;

