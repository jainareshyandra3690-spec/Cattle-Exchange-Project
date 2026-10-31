import { describe, it, expect } from "vitest";
import fs from "fs";
import path from "path";

describe("Phase 2B Initial Schema Migration", () => {
  const migrationsDir = path.resolve(process.cwd(), "supabase", "migrations");
  const migrationFiles = fs.readdirSync(migrationsDir).filter((file) => file.endsWith(".sql"));

  it("contains at least one valid SQL migration file", () => {
    expect(migrationFiles.length).toBeGreaterThanOrEqual(1);
  });

  const migrationFilePath = path.join(migrationsDir, migrationFiles[0]!);
  const sql = fs.readFileSync(migrationFilePath, "utf8");

  describe("Extensions", () => {
    it("installs uuid-ossp and pg_trgm extensions", () => {
      expect(sql).toContain('CREATE EXTENSION IF NOT EXISTS "uuid-ossp"');
      expect(sql).toContain('CREATE EXTENSION IF NOT EXISTS "pg_trgm"');
    });
  });

  describe("Helper Functions & Role Security", () => {
    it("defines an O(1) non-recursive is_admin function based on JWT app_metadata with empty search_path", () => {
      expect(sql).toContain("CREATE OR REPLACE FUNCTION public.is_admin()");
      expect(sql).toContain("(auth.jwt() -> 'app_metadata' ->> 'role') = 'admin'");
      expect(sql).toContain("SET search_path = ''");
    });

    it("defines prevent_role_modification trigger function supporting CLI/SQL editor, service_role, and admin", () => {
      expect(sql).toContain("CREATE OR REPLACE FUNCTION public.prevent_role_modification()");
      expect(sql).toContain("session_user IN ('postgres', 'supabase_admin')");
      expect(sql).toContain("(auth.jwt()->>'role') = 'service_role'");
      expect(sql).toContain("public.is_admin()");
      expect(sql).toContain("Unauthorized: Users cannot modify their own assigned role");
      expect(sql).toContain("42501");
      expect(sql).toContain("SET search_path = ''");
    });

    it("defines handle_new_user trigger function hardcoding role to 'user' with empty search_path", () => {
      expect(sql).toContain("CREATE OR REPLACE FUNCTION public.handle_new_user()");
      expect(sql).toContain("'user'");
      expect(sql).toContain("SET search_path = ''");
    });

    it("defines check_listing_image_limit trigger function with row-locking and UPDATE handling", () => {
      expect(sql).toContain("CREATE OR REPLACE FUNCTION public.check_listing_image_limit()");
      expect(sql).toContain("FOR UPDATE");
      expect(sql).toContain("A listing cannot exceed the maximum limit of 5 images");
      expect(sql).toContain("23514");
      expect(sql).toContain("BEFORE INSERT OR UPDATE OF listing_id ON public.listing_images");
    });
  });

  describe("Core Application Tables & Domain Constraints", () => {
    it("defines profiles table with valid domain constraints and phone privacy flag", () => {
      expect(sql).toContain("CREATE TABLE IF NOT EXISTS public.profiles");
      expect(sql).toContain("phone_public BOOLEAN NOT NULL DEFAULT false");
      expect(sql).toContain("role TEXT NOT NULL DEFAULT 'user' CHECK (role IN ('user', 'admin'))");
      expect(sql).toContain("REVOKE ALL ON TABLE public.profiles FROM anon");
      expect(sql).toContain("GRANT SELECT, UPDATE ON TABLE public.profiles TO authenticated");
      expect(sql).toContain("profiles_phone_unique_idx");
    });

    it("defines cattle_listings table with whole INR BIGINT price constraint and valid animal types", () => {
      expect(sql).toContain("CREATE TABLE IF NOT EXISTS public.cattle_listings");
      expect(sql).toContain("price_inr BIGINT NOT NULL CHECK (price_inr > 0 AND price_inr <= 100000000)");
      expect(sql).toContain("animal_type IN ('cow', 'buffalo', 'bull', 'calf', 'other')");
      expect(sql).toContain("status IN ('draft', 'published', 'sold', 'archived')");
    });

    it("defines listing_images table with maximum 5 images constraint (sort_order 0-4)", () => {
      expect(sql).toContain("CREATE TABLE IF NOT EXISTS public.listing_images");
      expect(sql).toContain("sort_order >= 0 AND sort_order <= 4");
      expect(sql).toContain("storage_path TEXT NOT NULL UNIQUE CHECK");
    });

    it("defines storage_cleanup_queue table for resilient storage object lifecycle handling", () => {
      expect(sql).toContain("CREATE TABLE IF NOT EXISTS public.storage_cleanup_queue");
      expect(sql).toContain("bucket_id TEXT NOT NULL DEFAULT 'listing-images'");
      expect(sql).toContain("retry_count INTEGER NOT NULL DEFAULT 0 CHECK (retry_count >= 0)");
    });
  });

  describe("Indexes & Performance", () => {
    it("creates required indexes including trigram fuzzy search", () => {
      expect(sql).toContain("idx_cattle_listings_marketplace_feed");
      expect(sql).toContain("idx_cattle_listings_trgm_search");
      expect(sql).toContain("USING gin (breed gin_trgm_ops, title gin_trgm_ops)");
      expect(sql).toContain("idx_listing_images_listing_sort");
    });
  });

  describe("Secure Public Profiles View", () => {
    it("creates public_profiles view with security_barrier and SQL-level redaction of seller phone number", () => {
      expect(sql).toContain("CREATE OR REPLACE VIEW public.public_profiles WITH (security_barrier = true) AS");
      expect(sql).toContain("WHEN p.phone_public = true THEN p.phone");
      expect(sql).toContain("WHEN auth.uid() = p.id THEN p.phone");
      expect(sql).toContain("WHEN public.is_admin() THEN p.phone");
      expect(sql).toContain("ELSE NULL");
      expect(sql).toContain("REVOKE ALL ON public.public_profiles FROM PUBLIC;");
      expect(sql).toContain("GRANT SELECT ON public.public_profiles TO anon, authenticated;");
    });
  });

  describe("Row Level Security (RLS)", () => {
    it("enables RLS on all four core tables", () => {
      expect(sql).toContain("ALTER TABLE public.profiles ENABLE ROW LEVEL SECURITY;");
      expect(sql).toContain("ALTER TABLE public.cattle_listings ENABLE ROW LEVEL SECURITY;");
      expect(sql).toContain("ALTER TABLE public.listing_images ENABLE ROW LEVEL SECURITY;");
      expect(sql).toContain("ALTER TABLE public.storage_cleanup_queue ENABLE ROW LEVEL SECURITY;");
    });

    it("restricts direct profile reads to owner or admin", () => {
      expect(sql).toContain('"Users and admins can view raw profile"');
      expect(sql).toContain("auth.uid() = id OR public.is_admin()");
    });

    it("allows public to view only published cattle listings", () => {
      expect(sql).toContain('"Public can view published cattle listings"');
      expect(sql).toContain("status = 'published'");
    });

    it("enforces seller ownership and storage_path coupling on listing_images RLS policies", () => {
      expect(sql).toContain('"Sellers can insert images for own listings"');
      expect(sql).toContain('"Sellers can update own listing images"');
      expect(sql).toContain('"Sellers can delete own listing images"');
      expect(sql).toContain("storage_path LIKE ('listings/' || auth.uid()::text || '/' || listing_id::text || '/%')");
    });

    it("defines storage policies for listing-images bucket with strict name regex and ownership validation", () => {
      expect(sql).toContain('"Public Access for Listing Images"');
      expect(sql).toContain('"Sellers can upload images to own directory"');
      expect(sql).toContain('"Sellers can update own images"');
      expect(sql).toContain('"Sellers can delete own images"');
      expect(sql).toContain("name ~ '^listings/[a-f0-9-]+/[a-f0-9-]+/[a-f0-9-]+\\.(jpg|jpeg|png|webp)$'");
      expect(sql).toContain("(storage.foldername(name))[2] = auth.uid()::text OR public.is_admin()");
    });
  });
});
