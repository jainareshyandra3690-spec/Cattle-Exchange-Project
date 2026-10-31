# Cattle Exchange — Architecture Decision Records (ADRs) & Risk Register

**Document Version:** 1.1.0  
**Phase:** Phase 0 (Architecture, Requirements, and Planning — Review Revisions)  
**Status:** Ready for Review & Approval  
**Last Updated:** October 2026  

---

## 1. Architecture Decision Records (ADRs)

### ADR-001: Adoption of Next.js App Router & Supabase vs Legacy Flask/SQLite
- **Status:** Accepted (Frozen Stack)
- **Context:** The previous prototype was built with Flask, SQLite, and client-side templating. SQLite cannot support concurrent rural traffic or Row Level Security; Flask requires managing custom authentication sessions and separate API servers.
- **Decision:** Re-architect the application on Next.js 15+ (App Router) and Supabase (PostgreSQL + Auth + Storage).
- **Consequences:**
  - *Positive:* Unified TypeScript codebase across frontend and server; native Server-Side Rendering (SSR) for fast mobile page delivery and SEO; enterprise-grade PostgreSQL with kernel-level RLS.
  - *Negative:* Requires developer familiarity with React Server Components (RSC) and `@supabase/ssr`.

---

### ADR-002: Monetary Representation as `BIGINT` in Whole Indian Rupees (₹)
- **Status:** Accepted
- **Context:** Currency values in financial systems often use either floating point (prone to precision errors), integer cents/paise, or arbitrary precision decimals (`NUMERIC`).
- **Decision:** Represent `price_inr` as a PostgreSQL `BIGINT` storing **exact whole Indian Rupees**, strictly positive (`price_inr > 0`).
- **Rationale:**
  1. Indian livestock transactions in *pashu mela* and private sales are executed strictly in whole rupees (e.g., ₹25,000, ₹85,000, ₹1,50,000). Fractional currency (paise) does not exist in cattle commerce.
  2. `BIGINT` avoids any floating-point rounding issues (unlike `FLOAT` or `DOUBLE PRECISION`).
  3. Eliminates unnecessary division/multiplication by 100 throughout the application codebase and form inputs.
  4. Supports price values up to ₹9,223,372,036,854,775,807, easily accommodating the ₹10,00,00,000 (10 Crore INR) domain ceiling.
  5. Negative or zero prices are rejected at the DB constraint, Zod schema, and UI levels.
- **Consequences:** Clean, unambiguous integer arithmetic.

---

### ADR-003: Row Level Security (RLS) as the Primary Authorization Boundary
- **Status:** Accepted (Frozen Stack)
- **Context:** Traditional web apps rely purely on application-level `if (user.id !== item.seller_id)` checks. Any omitted check in an API route introduces an Insecure Direct Object Reference (IDOR) vulnerability.
- **Decision:** Enforce PostgreSQL Row Level Security (RLS) on all tables (`profiles`, `cattle_listings`, `listing_images`, `storage_cleanup_queue`).
- **Consequences:**
  - *Positive:* Defense-in-depth: even if a developer makes a mistake in a Server Action or Route Handler, the database kernel rejects unauthorized queries.
  - *Negative:* Requires careful index optimization to ensure RLS subqueries do not cause query execution degradation.

---

### ADR-004: Direct-to-Storage Upload with Scoped Folder Paths
- **Status:** Accepted (Frozen Stack)
- **Context:** Uploading large image files through Next.js serverless functions can exceed Vercel body-size limits (4.5 MB) and consume unnecessary serverless execution memory.
- **Decision:** Clients upload images directly to Supabase Storage using authenticated tokens, targeting deterministic paths: `listings/{seller_id}/{listing_id}/{image_uuid}.{ext}`. Storage RLS validates path ownership.
- **Consequences:** Fast, direct S3-compatible uploads with zero serverless proxy bottleneck.

---

### ADR-005: Non-Recursive Role Authorization via JWT App Metadata & Anti-Escalation Trigger
- **Status:** Accepted
- **Context:** Storing and querying roles directly in `profiles` during RLS policy execution risks infinite recursion (`infinite recursion detected in policy for relation "profiles"`). Additionally, ordinary users must be strictly prevented from elevating their own role to `'admin'`.
- **Decision:**
  1. Store the primary authoritative role in `profiles.role`, but synchronize admin grants to `auth.users.raw_app_meta_data->>'role' = 'admin'`.
  2. Implement `is_admin()` SQL helper checking signed JWT `app_metadata` in $O(1)$ memory without database queries.
  3. Attach `prevent_role_modification` trigger to `profiles` raising exception `42501` if a non-admin attempts to change `role`.
- **Consequences:** Zero RLS recursion, zero database query overhead for admin checks, and mathematically impossible self-promotion by standard users.

---

### ADR-006: Universal Schema Validation with Zod
- **Status:** Accepted (Frozen Stack)
- **Context:** Discrepancies between frontend and backend validation rules cause inconsistent error reporting and security holes.
- **Decision:** Define single source-of-truth Zod schemas in `src/lib/validations/` used by both React Hook Form on the client and Server Actions on the server.
- **Consequences:** DRY validation rules, automatic TypeScript type inference, and guaranteed sanitization before database insertion.

---

### ADR-007: Image Limits & Sequence Constraint (Max 5 Photos, `sort_order` 0–4)
- **Status:** Accepted
- **Context:** Unbounded image uploads increase storage costs and mobile load times. Inconsistent sort order indices create fragmented galleries.
- **Decision:** Limit listings to a maximum of 5 images. Enforce `sort_order` values strictly between `0` and `4` via database check constraint, Zod validation, and UI dropzone controls.
- **Consequences:** Predictable gallery rendering and controlled storage bandwidth.

---

### ADR-008: Database-Enforced Contact Privacy via Secure View (`public_profiles`)
- **Status:** Accepted
- **Context:** Relying solely on client-side masking or server-side component stripping allows malicious actors to query `/rest/v1/profiles?select=phone` via PostgREST and scrape private phone numbers.
- **Decision:**
  1. Restrict raw `profiles` table SELECT via RLS so only the owner or an admin can read raw profile records.
  2. Create a secure view `public.public_profiles` that executes SQL-level phone redaction (`CASE WHEN phone_public = true THEN phone ... ELSE NULL END`).
  3. Public browsing and search routes join exclusively against `public_profiles`.
- **Consequences:** Private phone numbers never leave the database kernel for unauthorized requests.

---

### ADR-009: Decoupled Storage Cleanup & Resilient Reconciliation Workflow
- **Status:** Accepted
- **Context:** A PostgreSQL `DELETE` or foreign-key cascade deletes metadata rows in the database, but **does not delete physical binary objects from Supabase Storage (S3)**.
- **Decision:**
  1. Server Actions explicitly invoke `supabase.storage.from('listing-images').remove(paths)` upon listing or image deletion.
  2. If the storage API call fails, paths are enqueued in `storage_cleanup_queue` for retry with exponential backoff.
  3. A scheduled 24-hour reconciliation job scans for orphaned storage objects older than 24 hours that lack corresponding database records in `listing_images` and deletes them.
- **Consequences:** Eliminates storage cost leaks while ensuring user deletion operations remain fast and non-blocking.

---

### ADR-010: Trusted Administrator Provisioning Workflow
- **Status:** Accepted
- **Context:** Admin accounts hold broad moderation powers. They must never be provisioned through public registration or browser forms.
- **Decision:**
  1. **Bootstrap Admin:** Provisioned exclusively via Supabase SQL Editor / CLI using the Service Role.
  2. **Secondary Admins:** Promoted exclusively by existing verified admins via dedicated administrative actions requiring re-authentication.
  3. Standard registration trigger strictly hardcodes `role = 'user'`.
- **Consequences:** Guarantees zero unauthorized administrator creation.

---

## 2. Technical Risk Register & Mitigation Strategies

| Risk ID | Risk Description | Severity | Probability | Mitigation Strategy |
| :--- | :--- | :--- | :--- | :--- |
| **TR-01** | **Rural Bandwidth & High Latency:** Farmers uploading 5 MB camera photos over spotty connections experience timeouts. | High | High | Client-side canvas compression/resizing (max dimension 1600px, 80% WebP) before upload, reducing 5 MB files to ~300 KB. |
| **TR-02** | **Automated Scraping of Seller Phone Numbers:** Bots harvest phone numbers via direct PostgREST queries. | High | Medium | Direct `profiles` table SELECT blocked by RLS; public access routed through `public_profiles` view with SQL-level redaction; rate limiting on contact endpoints. |
| **TR-03** | **Orphaned Storage Binaries & Cost Leaks:** Uploaded images from abandoned drafts or failed deletes accumulate in S3. | Medium | Medium | Explicit server action deletion + `storage_cleanup_queue` retry table + scheduled 24h orphan reconciliation cron job. |
| **TR-04** | **Privilege Escalation via Profile Mutations:** Malicious user submits `role: 'admin'` in profile update payload. | Critical | Low | Database trigger `prevent_role_modification` throws exception `42501`; admin checks read signed JWT `app_metadata`. |
| **TR-05** | **Recursive RLS Query Deadlock:** Profile policies checking profiles table cause query timeouts. | High | Low | Admin check `is_admin()` evaluates signed JWT `app_metadata` directly ($O(1)$, zero database queries). |
| **TR-06** | **Service-Role Key Leakage:** Accidental exposure of the Supabase service-role secret in client bundles. | Critical | Low | Strict Next.js convention: service key is never prefixed with `NEXT_PUBLIC_`; CI lint checks scan for leaked secrets. |

---

## 3. Unresolved Decisions & Open Inquiries

All architectural questions and technical considerations raised during Phase 0 and the review cycle have been addressed and formally resolved in this specification:
1. **Whole INR Representation:** Formally approved as `BIGINT > 0` representing exact whole Indian Rupees.
2. **Image Limit:** Formally approved as **maximum 5 photographs** per listing with `sort_order` constrained to `0` through `4`.
3. **Authentication Mechanism for MVP:** Formally approved as Email + Password with mandatory contact phone captured during registration; phone privacy controlled via `phone_public`.
4. **Storage Cleanup:** Formally approved as decoupled server-side API removal + retry queue + 24h reconciliation cron.

There are currently **zero blocking architectural ambiguities** remaining.

---

## 4. Approval Sign-off

| Role | Sign-off Name | Status | Date |
| :--- | :--- | :--- | :--- |
| **Technical Lead & Architect** | Antigravity Lead Architect | Completed (Review v1.1.0) | October 2026 |
| **Product Stakeholder** | User / Stakeholder Review | Pending Approval | — |
