# Cattle Exchange — Implementation Roadmap & Execution Plan

**Document Version:** 1.1.0  
**Phase:** Phase 0 (Architecture, Requirements, and Planning — Review Revisions)  
**Status:** Ready for Review & Approval  
**Last Updated:** October 2026  

---

## 1. Roadmap Strategy & Phase Sequence Overview

The implementation roadmap is structured into **8 sequential phases**, intentionally ordered to minimize development risk, respect architectural dependencies, and establish rock-solid security boundaries from day one.

```
┌────────────────────────────────────────────────────────────────────────┐
│                   IMPLEMENTATION ROADMAP PHASES                        │
└────────────────────────────────────────────────────────────────────────┘

  Phase 1: Project Foundation & Design System Setup
     │
     ▼
  Phase 2: Authentication, Profiles & Authorization Foundation
     │
     ▼
  Phase 3: Public Marketplace, Search, Filtering & Detail Pages
     │
     ▼
  Phase 4: Seller Listing Management & Storage Lifecycle
     │
     ▼
  Phase 5: Seller Contact Experience & Privacy Controls
     │
     ▼
  Phase 6: Administrator Moderation & Operational Safeguards
     │
     ▼
  Phase 7: Security Hardening, Automated Testing & a11y
     │
     ▼
  Phase 8: Production Deployment & Acceptance Testing
```

### Dependency Rationale
- **Phase 1 before Phase 2:** Next.js App Router, TypeScript strict mode, Tailwind design tokens, and Supabase client bindings must exist before auth can be wired.
- **Phase 2 before Phase 3 & 4:** User identity (`auth.users` ➔ `profiles`), anti-privilege escalation trigger, `public_profiles` view, and RLS context must be established so that queries can safely evaluate caller permissions.
- **Phase 3 before Phase 4:** Building the public marketplace view first establishes read models, cards, and UI components before building write/mutation forms.
- **Phase 4 before Phase 5:** Listing creation, 5-photo upload limit (`sort_order` 0–4), and explicit storage cleanup workflows must be operational before contact privacy is linked to live listings.
- **Phase 5 & 6 before Phase 7:** All features must exist before running full E2E test suites and accessibility audits.
- **Phase 7 before Phase 8:** Zero production deployment occurs without automated test passes and security sign-off.

---

## 2. Detailed Phase Specifications

---

### Phase 1: Project Foundation, Environment Configuration, & Design System
**Objective:** Scaffold a clean Next.js 15+ App Router project, configure strict TypeScript, establish the Tailwind/shadcn UI design system, and configure Supabase connectivity.

- **Dependencies:** Approved Phase 0 Planning Documentation.
- **Deliverables:**
  - Next.js 15+ initialization with TypeScript strict mode enabled (`strict: true`, `noImplicitAny: true`).
  - Tailwind CSS configured with approved warm cream, forest green, muted olive, and charcoal design tokens.
  - shadcn/ui component library configured with Radix UI primitives.
  - Supabase client helpers (`@supabase/ssr`) configured for Server Components, Client Components, and Server Actions.
  - Environment variable definition (`.env.example`) with public keys and zero secrets.
  - Project directory structure (`src/app`, `src/components`, `src/lib`, `src/actions`).
- **Acceptance Criteria:**
  - `npm run build` passes with zero TypeScript and ESLint errors.
  - Base layout renders with approved color palette and responsive mobile viewport.
  - Supabase client successfully connects to test database instance.
- **Exit Gate:** Clean builds, passing linter, design system smoke test verified.

---

### Phase 2: Authentication, Profiles, & Authorization Foundation
**Objective:** Implement Supabase Auth, session middleware, automated profile synchronization, user profile management, anti-privilege escalation guards, and the secure public profile view.

- **Dependencies:** Phase 1 complete.
- **Deliverables:**
  - Next.js `middleware.ts` for session refresh and route protection.
  - Auth pages: `/login`, `/register`, `/forgot-password`.
  - Database migration applying `profiles` schema, `prevent_role_modification` trigger, and `on_auth_user_created` trigger.
  - Database migration creating `public_profiles` secure view with phone redaction logic.
  - Non-recursive `is_admin()` SQL function reading `auth.jwt() -> 'app_metadata' ->> 'role'`.
  - Server Actions for registration, login, logout, and profile updates (`src/actions/auth.ts`).
  - User profile page (`/profile`) allowing full name, district, state, and `phone_public` toggle updates.
  - Automated tests proving a standard user cannot modify their role to `'admin'`.
- **Acceptance Criteria:**
  - Users can register, log in, and log out with HttpOnly cookies.
  - Registration automatically creates a row in `profiles` with `role = 'user'`.
  - Standard users attempting to pass `role: 'admin'` are blocked by trigger with SQL exception `42501`.
  - Anonymous queries to `/rest/v1/profiles` return 0 rows.
- **Exit Gate:** End-to-end auth flow verified; profile CRUD functioning; anti-privilege escalation tests passing.

---

### Phase 3: Public Marketplace, Search, Filtering, & Listing Details
**Objective:** Implement public browsing, faceted search and filtering, responsive listing cards, and comprehensive listing detail pages.

- **Dependencies:** Phase 2 complete.
- **Deliverables:**
  - Database migration applying `cattle_listings` table schema and initial indexes.
  - Public catalogue page (`/browse`) with Server-Side Rendering (SSR) joining with `public_profiles`.
  - Search input for breed and location (state, district).
  - Faceted filter component (animal type, strictly positive price range in whole INR, age, milk yield).
  - `ListingCard` component with badges, milk yield indicator, and Indian currency formatting (`formatINR`).
    - Clean handling of null fields (`age_months` and `milk_yield_liters_per_day`).
  - Listing detail page (`/listings/[id]`) with specification tables, location badges, and placeholder gallery.
- **Acceptance Criteria:**
  - Anonymous visitors can browse published listings without logging in.
  - Search and filter queries execute quickly (< 100ms) utilizing Postgres indexes.
  - Draft, sold, or archived listings are never returned in public search queries.
- **Exit Gate:** Public browse, search, and detail routes fully functional and responsive on mobile and desktop.

---

### Phase 4: Seller Listing Management, Storage Lifecycle, & Cleanup
**Objective:** Build authenticated seller dashboard, multi-step listing creator, Supabase Storage image upload dropzone (max 5 photos, `sort_order` 0–4), listing lifecycle state machine, and reliable server-side storage cleanup workflows.

- **Dependencies:** Phase 3 complete.
- **Deliverables:**
  - Database migration applying `listing_images` schema (constrained to `sort_order` 0–4) and `storage_cleanup_queue` table.
  - Storage bucket policies enforcing folder isolation: `listings/{seller_id}/{listing_id}/...`.
  - Seller dashboard (`/dashboard/listings`) listing own items with status badges.
  - Create listing page (`/dashboard/listings/new`) with Zod-validated form rejecting zero/negative prices.
  - Edit listing page (`/dashboard/listings/[id]/edit`).
  - Image upload dropzone supporting 1–5 photos, MIME validation, client canvas resizing, and progress indicators.
  - Server-side storage cleanup workflow on listing/image deletion with fallback to `storage_cleanup_queue`.
  - Scheduled 24-hour orphan storage reconciliation job.
  - Status transition controls: Publish, Unpublish (Draft), Mark as Sold, Archive.
- **Acceptance Criteria:**
  - Authenticated sellers can create a listing, upload up to 5 photos, and publish it.
  - Deleting a listing explicitly invokes Supabase Storage API deletion for all attached image paths.
  - Transient storage deletion errors queue paths for retry with exponential backoff.
- **Exit Gate:** Complete seller listing lifecycle verified with multi-image gallery and verified storage cleanup.

---

### Phase 5: Seller Contact Experience & Privacy Controls
**Objective:** Implement privacy-preserving contact display, seller phone visibility toggle enforcement, click-to-call, and WhatsApp integration backed by the `public_profiles` view.

- **Dependencies:** Phase 4 complete.
- **Deliverables:**
  - `SellerContactCard` component with privacy-aware rendering.
  - Direct "Call Seller" (`tel:`) and "WhatsApp" action buttons for permitted contacts.
  - Protected contact state for `phone_public: false` listings with inquiry prompts.
  - Integration tests verifying private phone numbers are never returned in API or SSR responses.
- **Acceptance Criteria:**
  - When `phone_public` is `false`, the seller's phone digits are completely absent (`null`) from HTML/RSC payloads and database view queries.
  - When `phone_public` is `true`, valid Indian phone numbers render with working mobile dialer and WhatsApp deep links.
- **Exit Gate:** Phone number privacy verified via automated tests and manual inspection of network payloads.

---

### Phase 6: Administrator Moderation & Operational Safeguards
**Objective:** Build administrative dashboard, moderation queues, listing unpublishing/archiving tools, and user suspension capabilities.

- **Dependencies:** Phase 5 complete.
- **Deliverables:**
  - Dedicated `/admin` moderation deck protected by Next.js middleware and `is_admin()` JWT check.
  - Overview metrics: Total listings, active published cattle, registered users.
  - Moderation queue displaying newly published and reported listings.
  - Admin actions to archive/unpublish violating listings or freeze malicious profiles.
- **Acceptance Criteria:**
  - Non-admin users attempting to access `/admin` receive a 403 or redirect to `/dashboard`.
  - Admin actions immediately update listing status to `archived`, removing them from the public marketplace.
- **Exit Gate:** Admin moderation operations fully verified and tested against unauthorized access attempts.

---

### Phase 7: Security Hardening, Automated Tests, & Accessibility
**Objective:** Execute comprehensive unit, component, RLS, E2E, and accessibility test suites; perform security audits and performance tuning.

- **Dependencies:** Phase 6 complete.
- **Deliverables:**
  - Vitest test suites for formatters, validators, and core components.
  - Anti-privilege escalation automated test suite.
  - Storage cleanup failure and retry test suite.
  - Seller contact privacy test suite (verifying anonymous access, authenticated access, and privacy toggle).
  - Playwright E2E suites covering top 5 critical user journeys.
  - Axe-core accessibility audit resolving all WCAG 2.1 AA violations.
  - Rate limiting configured on auth and search endpoints.
  - Lighthouse performance optimization (target $\ge 90$).
- **Acceptance Criteria:**
  - All test suites pass with 0 failures in CI.
  - Zero critical or high-severity vulnerabilities in dependency audits (`npm audit`).
  - Lighthouse performance score $\ge 90$ on mobile emulation.
- **Exit Gate:** CI pipeline passing green; test reports and a11y sign-off completed.

---

### Phase 8: Production Deployment & Acceptance Testing
**Objective:** Deploy Cattle Exchange to Vercel and production Supabase Cloud, configure custom domain and SSL, and execute final acceptance sign-off.

- **Dependencies:** Phase 7 complete.
- **Deliverables:**
  - Production Supabase Cloud project provisioned with migrations, storage buckets, and cron reconciliation.
  - Initial administrator account provisioned via secure bootstrap workflow.
  - Vercel production deployment connected to GitHub repository.
  - Domain configuration (`cattleexchange.in`) with SSL termination.
  - Final end-to-end acceptance testing against the live production environment.
- **Acceptance Criteria:**
  - Live production marketplace accessible, responsive, and secure.
  - Real user registration, listing creation, search, and contact flows function flawlessly.
  - Final project delivery sign-off by stakeholders.
- **Exit Gate:** Production go-live sign-off.

---

## 3. Summary Schedule & Resource Tracking

| Phase | Milestone Name | Dependencies | Primary Deliverable |
| :--- | :--- | :--- | :--- |
| **Phase 1** | Foundation & Design System | Phase 0 Approval | Next.js + Tailwind + Supabase base |
| **Phase 2** | Auth, Profiles & Role Security | Phase 1 | User login, profiles, anti-escalation trigger, public_profiles view |
| **Phase 3** | Public Marketplace | Phase 2 | Browse, search, filters, detail pages |
| **Phase 4** | Seller Listing & Storage Lifecycle | Phase 3 | Seller CRUD, 5-photo upload, server-side storage cleanup |
| **Phase 5** | Contact Privacy & Usability | Phase 4 | Phone privacy toggle, call/WhatsApp, redacted API responses |
| **Phase 6** | Admin Moderation | Phase 5 | Admin deck, archive/moderation actions |
| **Phase 7** | Quality & Hardening | Phase 6 | Vitest, Playwright, a11y, storage retry & security audits |
| **Phase 8** | Production Launch | Phase 7 | Live Vercel + Supabase deployment |

---

## 4. Approval Sign-off

| Role | Sign-off Name | Status | Date |
| :--- | :--- | :--- | :--- |
| **Technical Lead & Architect** | Antigravity Lead Architect | Completed (Review v1.1.0) | October 2026 |
| **Product Stakeholder** | Implementation Roadmap Sign-off | Pending Approval | — |
