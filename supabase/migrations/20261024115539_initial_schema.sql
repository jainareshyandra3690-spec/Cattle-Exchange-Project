-- ==============================================================================
-- Cattle Exchange — Phase 2B: Database Schema, Constraints & Security Policies
-- Description: Core tables, indexes, triggers, secure views, and RLS policies.
-- Specification Reference: docs/phase-0/database-design.md & docs/phase-0/security-and-rls.md
-- ==============================================================================

-- 1. EXTENSIONS
-- ------------------------------------------------------------------------------
CREATE EXTENSION IF NOT EXISTS "uuid-ossp";
CREATE EXTENSION IF NOT EXISTS "pg_trgm";

-- 2. HELPER FUNCTIONS
-- ------------------------------------------------------------------------------

-- Evaluates admin role strictly from signed JWT claims in O(1) time without recursive table lookups
CREATE OR REPLACE FUNCTION public.is_admin()
RETURNS BOOLEAN AS $$
BEGIN
  RETURN COALESCE(
    (auth.jwt() -> 'app_metadata' ->> 'role') = 'admin',
    false
  );
END;
$$ LANGUAGE plpgsql STABLE
SET search_path = '';

-- Automatically maintains updated_at timestamp across mutable tables
CREATE OR REPLACE FUNCTION public.handle_updated_at()
RETURNS TRIGGER AS $$
BEGIN
  NEW.updated_at = now();
  RETURN NEW;
END;
$$ LANGUAGE plpgsql
SET search_path = '';

-- Anti-privilege escalation guard: strictly prevents standard users from altering their role
CREATE OR REPLACE FUNCTION public.prevent_role_modification()
RETURNS TRIGGER AS $$
BEGIN
  IF NEW.role IS DISTINCT FROM OLD.role THEN
    IF NOT (
      -- 1. Direct database superuser/admin connection (Dashboard SQL Editor, CLI migrations)
      session_user IN ('postgres', 'supabase_admin')
      -- 2. Service role JWT token (backend Server Actions / Admin API)
      OR COALESCE((auth.jwt()->>'role') = 'service_role', false)
      -- 3. Verified admin JWT app_metadata claim
      OR public.is_admin()
    ) THEN
      RAISE EXCEPTION 'Unauthorized: Users cannot modify their own assigned role.'
        USING ERRCODE = '42501';
    END IF;
  END IF;
  RETURN NEW;
END;
$$ LANGUAGE plpgsql
SET search_path = '';

-- New user profile synchronization trigger from auth.users
CREATE OR REPLACE FUNCTION public.handle_new_user()
RETURNS TRIGGER AS $$
BEGIN
  INSERT INTO public.profiles (
    id,
    full_name,
    phone,
    phone_public,
    district,
    state,
    role
  ) VALUES (
    NEW.id,
    COALESCE(NEW.raw_user_meta_data->>'full_name', 'Farmer'),
    COALESCE(NEW.raw_user_meta_data->>'phone', ''),
    false,
    COALESCE(NEW.raw_user_meta_data->>'district', 'Not Specified'),
    COALESCE(NEW.raw_user_meta_data->>'state', 'Not Specified'),
    'user' -- Strictly hardcoded; never trusted from client metadata
  );
  RETURN NEW;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER
SET search_path = '';

-- Image limit guard: serializes concurrent inserts/updates and strictly enforces max 5 images per listing
CREATE OR REPLACE FUNCTION public.check_listing_image_limit()
RETURNS TRIGGER AS $$
BEGIN
  -- If updating and listing_id has not changed, bypass count check
  IF TG_OP = 'UPDATE' AND NEW.listing_id = OLD.listing_id THEN
    RETURN NEW;
  END IF;

  -- Exclusively lock the parent cattle_listings row to serialize concurrent inserts/updates
  PERFORM 1
  FROM public.cattle_listings
  WHERE id = NEW.listing_id
  FOR UPDATE;

  -- Check total image count for target listing
  IF (
    SELECT count(*)
    FROM public.listing_images
    WHERE listing_id = NEW.listing_id
  ) >= 5 THEN
    RAISE EXCEPTION 'A listing cannot exceed the maximum limit of 5 images.'
      USING ERRCODE = '23514';
  END IF;

  RETURN NEW;
END;
$$ LANGUAGE plpgsql
SET search_path = '';

-- 3. CORE APPLICATION TABLES
-- ------------------------------------------------------------------------------

-- Table: profiles
CREATE TABLE IF NOT EXISTS public.profiles (
  id UUID PRIMARY KEY REFERENCES auth.users(id) ON DELETE CASCADE,
  full_name TEXT NOT NULL CHECK (char_length(trim(full_name)) BETWEEN 2 AND 100),
  phone VARCHAR(15) NOT NULL CHECK (phone = '' OR phone ~ '^\+?[0-9]{10,15}$'),
  phone_public BOOLEAN NOT NULL DEFAULT false,
  district TEXT NOT NULL CHECK (char_length(trim(district)) BETWEEN 2 AND 100),
  state TEXT NOT NULL CHECK (char_length(trim(state)) BETWEEN 2 AND 100),
  avatar_path TEXT NULL,
  role TEXT NOT NULL DEFAULT 'user' CHECK (role IN ('user', 'admin')),
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

-- Defense-in-depth: Revoke all table-level privileges from anon on raw profiles
REVOKE ALL ON TABLE public.profiles FROM anon;
GRANT SELECT, UPDATE ON TABLE public.profiles TO authenticated;
GRANT ALL ON TABLE public.profiles TO service_role;

-- Unique index on non-empty phone numbers to prevent duplicate registrations
CREATE UNIQUE INDEX IF NOT EXISTS profiles_phone_unique_idx
  ON public.profiles(phone)
  WHERE (phone IS NOT NULL AND phone <> '');

-- Table: cattle_listings
CREATE TABLE IF NOT EXISTS public.cattle_listings (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  seller_id UUID NOT NULL REFERENCES public.profiles(id) ON DELETE CASCADE,
  title TEXT NOT NULL CHECK (char_length(trim(title)) BETWEEN 10 AND 140),
  animal_type TEXT NOT NULL CHECK (animal_type IN ('cow', 'buffalo', 'bull', 'calf', 'other')),
  breed TEXT NOT NULL CHECK (char_length(trim(breed)) BETWEEN 2 AND 80),
  gender TEXT NOT NULL CHECK (gender IN ('female', 'male')),
  age_months INTEGER NULL CHECK (age_months IS NULL OR (age_months >= 0 AND age_months <= 360)),
  milk_yield_liters_per_day NUMERIC(4, 1) NULL CHECK (milk_yield_liters_per_day IS NULL OR (milk_yield_liters_per_day >= 0.0 AND milk_yield_liters_per_day <= 100.0)),
  price_inr BIGINT NOT NULL CHECK (price_inr > 0 AND price_inr <= 100000000),
  description TEXT NOT NULL CHECK (char_length(trim(description)) BETWEEN 20 AND 3000),
  district TEXT NOT NULL CHECK (char_length(trim(district)) BETWEEN 2 AND 100),
  state TEXT NOT NULL CHECK (char_length(trim(state)) BETWEEN 2 AND 100),
  status TEXT NOT NULL DEFAULT 'draft' CHECK (status IN ('draft', 'published', 'sold', 'archived')),
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

-- Table: listing_images (Constrained to max 5 images per listing: sort_order 0-4)
CREATE TABLE IF NOT EXISTS public.listing_images (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  listing_id UUID NOT NULL REFERENCES public.cattle_listings(id) ON DELETE CASCADE,
  storage_path TEXT NOT NULL UNIQUE CHECK (storage_path ~ '^listings/[a-f0-9-]+/[a-f0-9-]+/[a-f0-9-]+\.(jpg|jpeg|png|webp)$'),
  sort_order INTEGER NOT NULL DEFAULT 0 CHECK (sort_order >= 0 AND sort_order <= 4),
  created_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

-- Table: storage_cleanup_queue (Operational resilient storage cleanup)
CREATE TABLE IF NOT EXISTS public.storage_cleanup_queue (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  storage_path TEXT NOT NULL,
  bucket_id TEXT NOT NULL DEFAULT 'listing-images',
  retry_count INTEGER NOT NULL DEFAULT 0 CHECK (retry_count >= 0),
  last_error TEXT NULL,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  next_retry_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

-- 4. DATABASE TRIGGERS
-- ------------------------------------------------------------------------------

-- Timestamp triggers
DROP TRIGGER IF EXISTS on_profiles_updated ON public.profiles;
CREATE TRIGGER on_profiles_updated
  BEFORE UPDATE ON public.profiles
  FOR EACH ROW
  EXECUTE FUNCTION public.handle_updated_at();

DROP TRIGGER IF EXISTS on_cattle_listings_updated ON public.cattle_listings;
CREATE TRIGGER on_cattle_listings_updated
  BEFORE UPDATE ON public.cattle_listings
  FOR EACH ROW
  EXECUTE FUNCTION public.handle_updated_at();

-- Role protection trigger
DROP TRIGGER IF EXISTS on_profiles_role_check ON public.profiles;
CREATE TRIGGER on_profiles_role_check
  BEFORE UPDATE ON public.profiles
  FOR EACH ROW
  EXECUTE FUNCTION public.prevent_role_modification();

-- New user registration sync trigger
DROP TRIGGER IF EXISTS on_auth_user_created ON auth.users;
CREATE TRIGGER on_auth_user_created
  AFTER INSERT ON auth.users
  FOR EACH ROW
  EXECUTE FUNCTION public.handle_new_user();

-- Image limit check trigger (max 5 images per listing with serialization against race conditions)
DROP TRIGGER IF EXISTS on_listing_images_limit_check ON public.listing_images;
CREATE TRIGGER on_listing_images_limit_check
  BEFORE INSERT OR UPDATE OF listing_id ON public.listing_images
  FOR EACH ROW
  EXECUTE FUNCTION public.check_listing_image_limit();

-- 5. PERFORMANCE & SEARCH INDEXES
-- ------------------------------------------------------------------------------

-- Profiles indexes
CREATE INDEX IF NOT EXISTS idx_profiles_role ON public.profiles(role);
CREATE INDEX IF NOT EXISTS idx_profiles_location ON public.profiles(state, district);

-- Cattle Listings indexes
CREATE INDEX IF NOT EXISTS idx_cattle_listings_marketplace_feed ON public.cattle_listings(status, created_at DESC);
CREATE INDEX IF NOT EXISTS idx_cattle_listings_filter_type ON public.cattle_listings(status, animal_type);
CREATE INDEX IF NOT EXISTS idx_cattle_listings_filter_location ON public.cattle_listings(status, state, district);
CREATE INDEX IF NOT EXISTS idx_cattle_listings_filter_price ON public.cattle_listings(status, price_inr);
CREATE INDEX IF NOT EXISTS idx_cattle_listings_seller ON public.cattle_listings(seller_id, created_at DESC);

-- Fuzzy trigram search index on breed and title
CREATE INDEX IF NOT EXISTS idx_cattle_listings_trgm_search
  ON public.cattle_listings USING gin (breed gin_trgm_ops, title gin_trgm_ops);

-- Listing Images indexes
CREATE INDEX IF NOT EXISTS idx_listing_images_listing_sort ON public.listing_images(listing_id, sort_order ASC);

-- Storage cleanup queue index
CREATE INDEX IF NOT EXISTS idx_storage_cleanup_queue_retry ON public.storage_cleanup_queue(next_retry_at, retry_count);

-- 6. SECURE PUBLIC PROFILE VIEW (DATABASE-LEVEL REDACTION & SECURITY BARRIER)
-- ------------------------------------------------------------------------------

CREATE OR REPLACE VIEW public.public_profiles WITH (security_barrier = true) AS
SELECT
  p.id,
  p.full_name,
  p.district,
  p.state,
  p.avatar_path,
  p.created_at,
  p.phone_public,
  CASE
    WHEN p.phone_public = true THEN p.phone
    WHEN auth.uid() = p.id THEN p.phone
    WHEN public.is_admin() THEN p.phone
    ELSE NULL
  END AS phone
FROM public.profiles p;

-- Explicitly revoke all public permissions and grant read-only select to anon & authenticated
REVOKE ALL ON public.public_profiles FROM PUBLIC;
GRANT SELECT ON public.public_profiles TO anon, authenticated;

-- 7. ROW LEVEL SECURITY (RLS) POLICIES
-- ------------------------------------------------------------------------------

ALTER TABLE public.profiles ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.cattle_listings ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.listing_images ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.storage_cleanup_queue ENABLE ROW LEVEL SECURITY;

-- 7.1 Profiles RLS Policies
-- Direct select is restricted to own user or admin; public clients must use public_profiles view
DROP POLICY IF EXISTS "Users and admins can view raw profile" ON public.profiles;
CREATE POLICY "Users and admins can view raw profile"
  ON public.profiles
  FOR SELECT
  TO authenticated
  USING (
    auth.uid() = id OR public.is_admin()
  );

DROP POLICY IF EXISTS "Users can update own profile" ON public.profiles;
CREATE POLICY "Users can update own profile"
  ON public.profiles
  FOR UPDATE
  TO authenticated
  USING (auth.uid() = id OR public.is_admin())
  WITH CHECK (auth.uid() = id OR public.is_admin());

DROP POLICY IF EXISTS "Admins have full access to profiles" ON public.profiles;
CREATE POLICY "Admins have full access to profiles"
  ON public.profiles
  FOR ALL
  TO authenticated
  USING (public.is_admin())
  WITH CHECK (public.is_admin());

-- 7.2 Cattle Listings RLS Policies
DROP POLICY IF EXISTS "Public can view published cattle listings" ON public.cattle_listings;
CREATE POLICY "Public can view published cattle listings"
  ON public.cattle_listings
  FOR SELECT
  USING (
    status = 'published'
    OR (auth.uid() IS NOT NULL AND seller_id = auth.uid())
    OR public.is_admin()
  );

DROP POLICY IF EXISTS "Sellers can create own listings" ON public.cattle_listings;
CREATE POLICY "Sellers can create own listings"
  ON public.cattle_listings
  FOR INSERT
  TO authenticated
  WITH CHECK (
    (seller_id = auth.uid() OR public.is_admin())
    AND price_inr > 0
    AND price_inr <= 100000000
  );

DROP POLICY IF EXISTS "Sellers can update own listings" ON public.cattle_listings;
CREATE POLICY "Sellers can update own listings"
  ON public.cattle_listings
  FOR UPDATE
  TO authenticated
  USING (
    seller_id = auth.uid() OR public.is_admin()
  )
  WITH CHECK (
    seller_id = auth.uid() OR public.is_admin()
  );

DROP POLICY IF EXISTS "Sellers can delete own listings" ON public.cattle_listings;
CREATE POLICY "Sellers can delete own listings"
  ON public.cattle_listings
  FOR DELETE
  TO authenticated
  USING (
    seller_id = auth.uid() OR public.is_admin()
  );

-- 7.3 Listing Images RLS Policies
DROP POLICY IF EXISTS "Images are viewable if listing is published or owned" ON public.listing_images;
CREATE POLICY "Images are viewable if listing is published or owned"
  ON public.listing_images
  FOR SELECT
  USING (
    EXISTS (
      SELECT 1 FROM public.cattle_listings
      WHERE cattle_listings.id = listing_images.listing_id
        AND (cattle_listings.status = 'published' OR cattle_listings.seller_id = auth.uid())
    )
    OR public.is_admin()
  );

DROP POLICY IF EXISTS "Sellers can insert images for own listings" ON public.listing_images;
CREATE POLICY "Sellers can insert images for own listings"
  ON public.listing_images
  FOR INSERT
  TO authenticated
  WITH CHECK (
    sort_order >= 0 AND sort_order <= 4
    AND (
      (
        storage_path LIKE ('listings/' || auth.uid()::text || '/' || listing_id::text || '/%')
        AND EXISTS (
          SELECT 1 FROM public.cattle_listings
          WHERE cattle_listings.id = listing_images.listing_id
            AND cattle_listings.seller_id = auth.uid()
        )
      )
      OR public.is_admin()
    )
  );

DROP POLICY IF EXISTS "Sellers can update and delete own listing images" ON public.listing_images;
DROP POLICY IF EXISTS "Sellers can update own listing images" ON public.listing_images;
CREATE POLICY "Sellers can update own listing images"
  ON public.listing_images
  FOR UPDATE
  TO authenticated
  USING (
    EXISTS (
      SELECT 1 FROM public.cattle_listings
      WHERE cattle_listings.id = listing_images.listing_id
        AND cattle_listings.seller_id = auth.uid()
    )
    OR public.is_admin()
  )
  WITH CHECK (
    sort_order >= 0 AND sort_order <= 4
    AND (
      (
        storage_path LIKE ('listings/' || auth.uid()::text || '/' || listing_id::text || '/%')
        AND EXISTS (
          SELECT 1 FROM public.cattle_listings
          WHERE cattle_listings.id = listing_images.listing_id
            AND cattle_listings.seller_id = auth.uid()
        )
      )
      
      OR public.is_admin()
    )
  );

DROP POLICY IF EXISTS "Sellers can delete own listing images" ON public.listing_images;
CREATE POLICY "Sellers can delete own listing images"
  ON public.listing_images
  FOR DELETE
  TO authenticated
  USING (
    EXISTS (
      SELECT 1 FROM public.cattle_listings
      WHERE cattle_listings.id = listing_images.listing_id
        AND cattle_listings.seller_id = auth.uid()
    )
    OR public.is_admin()
  );

-- 7.4 Storage Cleanup Queue RLS Policies
DROP POLICY IF EXISTS "Admins have full access to storage_cleanup_queue" ON public.storage_cleanup_queue;
CREATE POLICY "Admins have full access to storage_cleanup_queue"
  ON public.storage_cleanup_queue
  FOR ALL
  TO authenticated
  USING (public.is_admin())
  WITH CHECK (public.is_admin());

-- 8. STORAGE SECURITY DESIGN (FOR BUCKET: listing-images)
-- Note: Buckets are provisioned per approved roadmap; these policies enforce storage object access.
-- ------------------------------------------------------------------------------

DROP POLICY IF EXISTS "Public Access for Listing Images" ON storage.objects;
CREATE POLICY "Public Access for Listing Images"
  ON storage.objects
  FOR SELECT
  USING (bucket_id = 'listing-images');

DROP POLICY IF EXISTS "Sellers can upload images to own directory" ON storage.objects;
CREATE POLICY "Sellers can upload images to own directory"
  ON storage.objects
  FOR INSERT
  TO authenticated
  WITH CHECK (
    bucket_id = 'listing-images'
    AND name ~ '^listings/[a-f0-9-]+/[a-f0-9-]+/[a-f0-9-]+\.(jpg|jpeg|png|webp)$'
    AND (storage.foldername(name))[1] = 'listings'
    AND ((storage.foldername(name))[2] = auth.uid()::text OR public.is_admin())
  );

DROP POLICY IF EXISTS "Sellers and admins can update own images" ON storage.objects;
DROP POLICY IF EXISTS "Sellers can update own images" ON storage.objects;
CREATE POLICY "Sellers can update own images"
  ON storage.objects
  FOR UPDATE
  TO authenticated
  USING (
    bucket_id = 'listing-images'
    AND (storage.foldername(name))[1] = 'listings'
    AND ((storage.foldername(name))[2] = auth.uid()::text OR public.is_admin())
  )
  WITH CHECK (
    bucket_id = 'listing-images'
    AND name ~ '^listings/[a-f0-9-]+/[a-f0-9-]+/[a-f0-9-]+\.(jpg|jpeg|png|webp)$'
    AND (storage.foldername(name))[1] = 'listings'
    AND ((storage.foldername(name))[2] = auth.uid()::text OR public.is_admin())
  );

DROP POLICY IF EXISTS "Sellers can delete own images" ON storage.objects;
CREATE POLICY "Sellers can delete own images"
  ON storage.objects
  FOR DELETE
  TO authenticated
  USING (
    bucket_id = 'listing-images'
    AND (storage.foldername(name))[1] = 'listings'
    AND ((storage.foldername(name))[2] = auth.uid()::text OR public.is_admin())
  );
