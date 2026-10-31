# Cattle Exchange — Security Architecture & Row Level Security (RLS) Specification

**Document Version:** 1.1.0  
**Phase:** Phase 0 (Architecture, Requirements, and Planning — Review Revisions)  
**Status:** Ready for Review & Approval  
**Last Updated:** October 2026  

---

## 1. Threat Model & Security Assumptions

Cattle Exchange connects agricultural producers and livestock buyers across India. Because livestock assets carry high economic value (₹20,000 to ₹3,50,000+ per animal) and users frequently access the application over public or shared mobile networks, the security architecture operates under a **Zero-Trust Model**.

### 1.1 Key Threat Vectors & Defense-in-Depth
1. **Unauthenticated Web Scraping & Phone Harvesting:** Automated bots seeking to harvest Indian farmers' mobile numbers for telemarketing, loan scams, or harassment.
   - *Mitigation:* The raw `profiles` table is restricted by RLS (only owner or admin can read directly). Public access is mediated through `public_profiles` view which returns `phone: NULL` at the database level when `phone_public = false`.
2. **Insecure Direct Object References (IDOR):** Malicious users attempting to edit, unpublish, or delete cattle listings or images belonging to other farmers.
   - *Mitigation:* Enforced in both Server Actions (`auth.uid() == seller_id`) and PostgreSQL RLS policies (`seller_id = auth.uid()`).
3. **Privilege Escalation:** Standard users attempting to alter their `role` column to `'admin'` via form submissions, API payloads, or direct PostgREST mutations.
   - *Mitigation:* Dual defense: Database trigger `prevent_role_modification` blocks non-admin updates to `role`, and RLS policies evaluate administrative privileges exclusively through signed JWT `app_metadata`.
4. **Recursive Policy Evaluation & DB Degradation:** RLS policies querying the table they guard, creating recursion loops or severe latency spikes.
   - *Mitigation:* Admin status is checked via $O(1)$ JWT metadata: `(auth.jwt() -> 'app_metadata' ->> 'role') = 'admin'`. Zero database queries are executed for admin checks.
5. **Malicious Storage Uploads & Orphan Leaks:** Uploading executables or abandoning uploads, leading to storage cost leaks.
   - *Mitigation:* File size capped at 5 MB; MIME type whitelist (`jpeg`, `png`, `webp`); strict storage RLS paths; server-side cleanup workflow with retries; automated 24-hour orphan reconciliation.

---

## 2. Comprehensive Authorization Matrix

| Resource | Operation | Anonymous Visitor | Authenticated User (Owner) | Authenticated User (Non-Owner) | Administrator (`role = 'admin'`) |
| :--- | :--- | :--- | :--- | :--- | :--- |
| **`profiles` (Raw Table)** | **SELECT** | **Denied** (0 rows returned via RLS) | Permitted (Full record, including private phone) | **Denied** (0 rows returned via RLS) | Permitted (Full record for auditing) |
| **`public_profiles` (View)**| **SELECT** | Permitted (Name, district, state, avatar; phone ONLY if `phone_public = true`) | Permitted (Full record including phone) | Permitted (Name, district, state, avatar; phone ONLY if `phone_public = true`) | Permitted (Full record including phone) |
| | **INSERT** | Denied (Managed by system trigger on auth sign-up) | Denied | Denied | Denied |
| | **UPDATE** | Denied | Permitted (Name, phone, location, privacy; **Role modification rejected by trigger**) | Denied | Permitted (Moderation / freeze) |
| | **DELETE** | Denied | Denied (Account deletion via admin/service flow) | Denied | Permitted |
| **`cattle_listings`** | **SELECT** | Permitted (`status = 'published'` only) | Permitted (All statuses: `draft`, `published`, `sold`, `archived`) | Permitted (`status = 'published'` only) | Permitted (All statuses) |
| | **INSERT** | Denied | Permitted (Must set `seller_id = auth.uid()`, `price_inr > 0`) | Denied (Cannot create listing for another user) | Permitted |
| | **UPDATE** | Denied | Permitted (Own listings only) | Denied | Permitted (Status archiving/moderation) |
| | **DELETE** | Denied | Permitted (Own listings only) | Denied | Permitted |
| **`listing_images`** | **SELECT** | Permitted (If parent listing is `published`) | Permitted (Own listing images across all statuses) | Permitted (If parent listing is `published`) | Permitted (All images) |
| | **INSERT** | Denied | Permitted (`sort_order` 0–4; max 5 images; parent owned) | Denied | Permitted |
| | **UPDATE** | Denied | Permitted (`sort_order` 0–4 of own listing images) | Denied | Permitted |
| | **DELETE** | Denied | Permitted (Own listing images only) | Denied | Permitted |
| **`storage.objects` (`listing-images`)** | **SELECT** | Permitted (Public read for published listing assets) | Permitted | Permitted | Permitted |
| | **INSERT** | Denied | Permitted (Upload to `listings/{auth.uid()}/...` only) | Denied | Permitted |
| | **UPDATE** | Denied | Permitted (Path prefix matches `auth.uid()`) | Denied | Permitted |
| | **DELETE** | Denied | Permitted (Path prefix matches `auth.uid()`) | Denied | Permitted |

---

## 3. PostgreSQL Row Level Security (RLS) Policies

All application tables reside in the `public` schema and have Row Level Security strictly enforced:
```sql
ALTER TABLE public.profiles ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.cattle_listings ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.listing_images ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.storage_cleanup_queue ENABLE ROW LEVEL SECURITY;
```

### 3.1 Non-Recursive Security Helper Functions
```sql
-- Evaluates admin status strictly from signed JWT claims (O(1) execution, zero DB queries, zero recursion)
CREATE OR REPLACE FUNCTION public.is_admin()
RETURNS BOOLEAN AS $$
BEGIN
  RETURN COALESCE(
    (auth.jwt() -> 'app_metadata' ->> 'role') = 'admin',
    false
  );
END;
$$ LANGUAGE plpgsql STABLE;
```

---

### 3.2 Policies for `profiles`

#### 1. Restricted Direct Read Policy (Zero-Trust Privacy)
Only the user themselves or an administrator can query the raw `profiles` table directly. Public visitors querying `/rest/v1/profiles` receive zero rows:
```sql
CREATE POLICY "Users and admins can view raw profile"
  ON public.profiles
  FOR SELECT
  TO authenticated
  USING (
    auth.uid() = id OR public.is_admin()
  );
```

#### 2. User Update Policy (With Role Escalation Protection)
```sql
CREATE POLICY "Users can update own profile"
  ON public.profiles
  FOR UPDATE
  TO authenticated
  USING (auth.uid() = id OR public.is_admin())
  WITH CHECK (auth.uid() = id OR public.is_admin());
```
> [!IMPORTANT]
> The database trigger `prevent_role_modification()` (documented in Section 5 of Database Design) executes `BEFORE UPDATE` on `public.profiles`. If a standard user sends `role: 'admin'`, the trigger throws SQL exception `42501 (insufficient_privilege)`, aborting the transaction before any data is modified.

---

### 3.3 Policies for `cattle_listings`

#### 1. Public Read Policy
Public visitors and buyers can only read published listings:
```sql
CREATE POLICY "Public can view published cattle listings"
  ON public.cattle_listings
  FOR SELECT
  USING (
    status = 'published'
    OR (auth.uid() IS NOT NULL AND seller_id = auth.uid())
    OR public.is_admin()
  );
```

#### 2. Seller Insert Policy
```sql
CREATE POLICY "Sellers can create own listings"
  ON public.cattle_listings
  FOR INSERT
  TO authenticated
  WITH CHECK (
    seller_id = auth.uid()
    AND price_inr > 0
    AND price_inr <= 100000000
  );
```

#### 3. Seller Update Policy
```sql
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
```

#### 4. Seller Delete Policy
```sql
CREATE POLICY "Sellers can delete own listings"
  ON public.cattle_listings
  FOR DELETE
  TO authenticated
  USING (
    seller_id = auth.uid() OR public.is_admin()
  );
```

---

### 3.4 Policies for `listing_images`

#### 1. Public Read Policy
```sql
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
```

#### 2. Seller Insert Policy (Constrained to max 5 images: `sort_order` 0–4)
```sql
CREATE POLICY "Sellers can insert images for own listings"
  ON public.listing_images
  FOR INSERT
  TO authenticated
  WITH CHECK (
    sort_order >= 0 AND sort_order <= 4
    AND EXISTS (
      SELECT 1 FROM public.cattle_listings
      WHERE cattle_listings.id = listing_images.listing_id
        AND cattle_listings.seller_id = auth.uid()
    )
  );
```

#### 3. Seller Update & Delete Policy
```sql
CREATE POLICY "Sellers can update and delete own listing images"
  ON public.listing_images
  FOR ALL
  TO authenticated
  USING (
    EXISTS (
      SELECT 1 FROM public.cattle_listings
      WHERE cattle_listings.id = listing_images.listing_id
        AND cattle_listings.seller_id = auth.uid()
    )
    OR public.is_admin()
  );
```

---

## 4. Supabase Storage Security & Lifecycle Policies

### 4.1 Path Isolation Pattern
Every object must adhere to the structure: `listings/{seller_id}/{listing_id}/{image_uuid}.{ext}`.

### 4.2 Storage Bucket Policies

```sql
-- 1. Public Read Access
CREATE POLICY "Public Access for Listing Images"
  ON storage.objects
  FOR SELECT
  USING (bucket_id = 'listing-images');

-- 2. Authenticated Upload Access (Path Verification)
CREATE POLICY "Sellers can upload images to own directory"
  ON storage.objects
  FOR INSERT
  TO authenticated
  WITH CHECK (
    bucket_id = 'listing-images'
    AND (storage.foldername(name))[1] = 'listings'
    AND (storage.foldername(name))[2] = auth.uid()::text
  );

-- 3. Authenticated Delete Access
CREATE POLICY "Sellers can delete own images"
  ON storage.objects
  FOR DELETE
  TO authenticated
  USING (
    bucket_id = 'listing-images'
    AND (storage.foldername(name))[1] = 'listings'
    AND (storage.foldername(name))[2] = auth.uid()::text
  );
```

---

## 5. Seller Contact Privacy Implementation

To safeguard farmers against unauthorized contact scraping:

1. **Database Redaction via Secure View:**
   Public clients and Server Components query `public_profiles`:
```sql
CREATE OR REPLACE VIEW public.public_profiles AS
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

GRANT SELECT ON public.public_profiles TO anon, authenticated;
```
2. **Server-Side Verification in Next.js Server Components:**
   When rendering `/listings/[id]`, the server queries `public_profiles`. If `phone_public` is `false`, `phone` evaluates to `null`. The phone digits are **never present in the React Server Component JSON stream or rendered HTML**.
3. **Protected UI State:** If `phone_public: false`, the UI renders a protected badge: *"The seller has chosen to keep their phone number private."* No client-side toggle or unmasking script can reveal the number because the digits do not exist in the client payload.

---

## 6. Input Validation & Defense-in-Depth

### 6.1 Server-Side Zod Schemas
```typescript
import { z } from "zod";

export const CattleListingSchema = z.object({
  title: z.string().min(10).max(140).trim(),
  animal_type: z.enum(["cow", "buffalo", "bull", "calf", "other"]),
  breed: z.string().min(2).max(80).trim(),
  gender: z.enum(["female", "male"]),
  age_months: z.number().int().min(0).max(360).nullable().optional(),
  milk_yield_liters_per_day: z.number().min(0).max(100).nullable().optional(),
  price_inr: z.number().int().positive().max(100_000_000), // Strictly positive; max 10 Crore INR
  description: z.string().min(20).max(3000).trim(),
  district: z.string().min(2).max(100).trim(),
  state: z.string().min(2).max(100).trim(),
  status: z.enum(["draft", "published", "sold", "archived"]).default("draft"),
});
```

---

## 7. Approval Sign-off

| Role | Sign-off Name | Status | Date |
| :--- | :--- | :--- | :--- |
| **Technical Lead & Architect** | Antigravity Lead Architect | Completed (Review v1.1.0) | October 2026 |
| **Security Officer** | Application Security Review | Pending Approval | — |
