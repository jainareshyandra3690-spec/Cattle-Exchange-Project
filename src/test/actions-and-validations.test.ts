import { describe, it, expect } from "vitest";
import { SignUpSchema, SignInSchema } from "@/lib/validations/auth";
import { ProfileUpdateSchema } from "@/lib/validations/profile";
import { CattleListingSchema, ListingImageSchema } from "@/lib/validations/listing";

describe("Validation Schemas & Domain Rules", () => {
  describe("Authentication Schemas", () => {
    it("validates legitimate farmer sign-up data", () => {
      const validData = {
        email: "ramesh@karnal.in",
        password: "securepassword123",
        full_name: "Ramesh Kumar",
        phone: "+919876543210",
        district: "Karnal",
        state: "Haryana",
      };
      const result = SignUpSchema.safeParse(validData);
      expect(result.success).toBe(true);
    });

    it("rejects invalid emails and short passwords", () => {
      const invalidData = {
        email: "not-an-email",
        password: "123", // Too short
        full_name: "R",
        phone: "123", // Invalid phone
        district: "K",
        state: "H",
      };
      const result = SignUpSchema.safeParse(invalidData);
      expect(result.success).toBe(false);
      if (!result.success) {
        const errors = result.error.flatten().fieldErrors;
        expect(errors.email).toBeDefined();
        expect(errors.password).toBeDefined();
        expect(errors.phone).toBeDefined();
      }
    });

    it("validates sign-in credentials", () => {
      expect(SignInSchema.safeParse({ email: "farmer@test.com", password: "mypassword" }).success).toBe(true);
      expect(SignInSchema.safeParse({ email: "invalid", password: "" }).success).toBe(false);
    });
  });

  describe("Profile Schemas", () => {
    it("validates profile update including phone_public flag", () => {
      const updateData = {
        full_name: "Satish Yadav",
        phone: "9876543210",
        phone_public: true,
        district: "Rohtak",
        state: "Haryana",
      };
      const result = ProfileUpdateSchema.safeParse(updateData);
      expect(result.success).toBe(true);
    });
  });

  describe("Cattle Listing Schemas", () => {
    it("validates compliant livestock listing", () => {
      const validListing = {
        title: "High Yielding 2nd Lactation Murrah Buffalo",
        animal_type: "buffalo",
        breed: "Murrah",
        gender: "female",
        age_months: 48,
        milk_yield_liters_per_day: 18.5,
        price_inr: 95000,
        description: "Excellent healthy Murrah buffalo with healthy calf, vaccinated and ready for milking.",
        district: "Rohtak",
        state: "Haryana",
        status: "published",
      };
      const result = CattleListingSchema.safeParse(validListing);
      expect(result.success).toBe(true);
    });

    it("strictly rejects non-positive or zero prices (price_inr > 0)", () => {
      const zeroPriceListing = {
        title: "High Yielding 2nd Lactation Murrah Buffalo",
        animal_type: "buffalo",
        breed: "Murrah",
        gender: "female",
        price_inr: 0, // Invalid! Must be > 0
        description: "Excellent healthy Murrah buffalo with healthy calf.",
        district: "Rohtak",
        state: "Haryana",
      };
      const result = CattleListingSchema.safeParse(zeroPriceListing);
      expect(result.success).toBe(false);
    });

    it("rejects prices exceeding ₹10 Crore ceiling", () => {
      const excessivePriceListing = {
        title: "High Yielding 2nd Lactation Murrah Buffalo",
        animal_type: "buffalo",
        breed: "Murrah",
        gender: "female",
        price_inr: 100_000_001, // Over ₹10 Crore
        description: "Excellent healthy Murrah buffalo with healthy calf.",
        district: "Rohtak",
        state: "Haryana",
      };
      const result = CattleListingSchema.safeParse(excessivePriceListing);
      expect(result.success).toBe(false);
    });

    it("enforces maximum 5 images and sort_order 0-4 constraint", () => {
      const validStoragePath =
        "listings/11111111-1111-1111-1111-111111111111/22222222-2222-2222-2222-222222222222/33333333-3333-3333-3333-333333333333.webp";

      expect(
        ListingImageSchema.safeParse({
          storage_path: validStoragePath,
          sort_order: 0,
        }).success
      ).toBe(true);

      expect(
        ListingImageSchema.safeParse({
          storage_path: validStoragePath,
          sort_order: 4,
        }).success
      ).toBe(true);

      // sort_order 5 must be rejected
      expect(
        ListingImageSchema.safeParse({
          storage_path: validStoragePath,
          sort_order: 5,
        }).success
      ).toBe(false);

      // negative sort_order must be rejected
      expect(
        ListingImageSchema.safeParse({
          storage_path: validStoragePath,
          sort_order: -1,
        }).success
      ).toBe(false);
    });
  });
});
