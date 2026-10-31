# Cattle Exchange — Product Requirements Document (PRD)

**Document Version:** 1.1.0  
**Phase:** Phase 0 (Architecture, Requirements, and Planning — Review Revisions)  
**Status:** Ready for Review & Approval  
**Last Updated:** October 2026  

---

## 1. Executive Summary & Problem Statement

### 1.1 Context
In India, the rural and semi-urban livestock sector represents a critical economic lifeline for tens of millions of smallholder farmers, pastoralists, and dairy entrepreneurs. The trade of cattle (cows, buffaloes, bulls, calves) has traditionally been conducted through physical weekly animal fairs (*pashu mela* or *haat*), informal village brokers (*dalals*), and word-of-mouth networks.

### 1.2 The Problem
1. **High Transaction Costs & Friction:** Smallholder farmers spend significant time and money transporting livestock to physical fairs without any guarantee of a fair sale.
2. **Lack of Price & Quality Transparency:** Buyers lack verifiable information regarding breed pedigree, age, and actual daily milk yield. Intermediaries frequently exploit information asymmetry, driving down margins for sellers while inflating prices for buyers.
3. **Severe Privacy & Safety Concerns:** In informal online channels (such as generic classifieds or social media groups), farmers' personal phone numbers and locations are indiscriminately broadcast, leading to harassment, spam, and predatory bargaining.
4. **Poor Digital Experience for Rural Users:** Existing generic e-commerce and classified platforms are not tailored to livestock workflows, requiring heavy bandwidth, complex navigation, and irrelevant metadata fields.

### 1.3 The Solution: Cattle Exchange MVP
**Cattle Exchange** is a dedicated, production-minded, digital livestock marketplace engineered specifically for the Indian agricultural ecosystem. It connects cattle buyers and sellers directly, providing:
- Structured, livestock-specific listing details (animal type, breed, age in months, milk yield in liters/day, exact INR pricing, district, and state).
- Multi-photograph galleries (up to 5 photos) for visual appraisal.
- Granular seller privacy controls over phone number visibility backed by database-level redaction.
- Fast, accessible, mobile-first search and filtering.
- A secure administrative moderation foundation to maintain platform safety and trust.

---

## 2. Target Users & Personas

### Persona A: Ramesh Kumar — Smallholder Dairy Farmer (Seller)
- **Profile:** 42 years old, manages 4 crossbred cows and 2 Murrah buffaloes in Karnal district, Haryana. Uses a mid-tier Android smartphone with a 4G connection.
- **Goals:** Sell a 2nd-lactation Murrah buffalo at a fair market price to fund fodder and farm repairs; avoid paying excessive cuts to local middlemen.
- **Pain Points:** Cannot afford to haul the animal 40 km to the weekly fair only to return unsold; worries about sharing his mobile number openly with strangers.
- **Needs from Cattle Exchange:** Simple photo upload from phone (max 5 photos), clear entry of milk yield (liters/day) and positive whole INR price, and the ability to keep his phone number private until he chooses to share it.

### Persona B: Suresh Patel — Dairy Farm Entrepreneur (Buyer)
- **Profile:** 35 years old, runs a commercial dairy farm near Anand, Gujarat. Needs to purchase 5 high-yielding Gir and Holstein Friesian (HF) cross cows.
- **Goals:** Search for lactating cows within a 150 km radius with verified milk yields (>15 L/day) and clear photos showing udder structure and body condition.
- **Pain Points:** Wastes days traveling to inspect animals that do not match the seller's verbal claims.
- **Needs from Cattle Exchange:** Fast search by breed and district/state, multi-attribute filtering (milk yield, price range, age), high-resolution photo inspection, and direct contact with verified sellers who have chosen to disclose their phone numbers.

### Persona C: Mahendra Singh — Smallholder Draft/Calf Trader (Buyer/Seller)
- **Profile:** 50 years old, raises calves and working bulls in Nagaur, Rajasthan.
- **Goals:** Browse young stock (calves, heifers, bulls) in neighboring districts to restock draft animals.
- **Pain Points:** Most platforms only cater to dairy cows, failing to account for gender, young age, or non-milking cattle.
- **Needs from Cattle Exchange:** Animal type classification (`cow`, `buffalo`, `bull`, `calf`, `other`) where milk yield is cleanly omitted for bulls and calves without displaying broken UI values like "0 L/day" or "null".

### Persona D: Platform Moderator / Administrator
- **Profile:** Operations team member responsible for marketplace health, quality assurance, and community guidelines compliance.
- **Goals:** Prevent fraudulent listings, abuse, animal cruelty imagery, and fraudulent contact numbers.
- **Needs from Cattle Exchange:** Secure administrative view to audit, unpublish, or archive violating listings and manage abusive profiles without exposing user credentials or private data.

---

## 3. User Journeys

```
                    ┌────────────────────────────────────────────────────────┐
                    │               CATTLE EXCHANGE USER JOURNEYS            │
                    └────────────────────────────────────────────────────────┘

[ Anonymous Visitor / Buyer ]
       │
       ▼
 ┌─────────────┐        ┌─────────────────┐        ┌──────────────────┐
 │  Homepage   │ ────►  │ Browse & Filter │ ────►  │  Listing Detail  │
 └─────────────┘        └─────────────────┘        └──────────────────┘
                                                             │
                                                             ▼
                                                   ┌──────────────────┐
                                                   │ View Contact     │
                                                   │ (Database-Gated  │
                                                   │  Seller Privacy) │
                                                   └──────────────────┘

[ Registered Farmer / Seller ]
       │
       ▼
 ┌─────────────┐        ┌─────────────────┐        ┌──────────────────┐
 │   Sign Up   │ ────►  │ Create Listing  │ ────►  │ Manage Lifecycle │
 │  & Profile  │        │ (Details/Photos)│        │ Draft / Publish  │
 └─────────────┘        └─────────────────┘        │ Mark Sold        │
                                                   └──────────────────┘

[ Platform Administrator ]
       │
       ▼
 ┌─────────────┐        ┌─────────────────┐        ┌──────────────────┐
 │ Admin Login │ ────►  │ Moderation Deck │ ────►  │ Unpublish / Flag │
 │ (Provisioned│        │ Review Listings │        │ Archive Bad Data │
 │ via Metadata)        └─────────────────┘        └──────────────────┘
 └─────────────┘
```

### 3.1 Buyer Discovery Journey
1. **Entry:** Visitor visits the homepage on mobile or desktop; views popular cattle categories (Cows, Buffaloes, Calves) and recent listings.
2. **Search & Filter:** Visitor navigates to `/browse`, searches for breed "Murrah", filters by animal type "Buffalo", location "Haryana / Karnal", and maximum price ₹90,000.
3. **Inspection:** Clicks a listing card to view `/listings/[id]`. Inspects photo carousel (front, side, udder condition; up to 5 photos), reads age (38 months), daily milk yield (16.5 L/day), and seller notes.
4. **Contact Initiation (Privacy-Guarded):** 
   - If seller set `phone_public: true`, buyer sees the phone number with a direct "Call" or "WhatsApp" CTA.
   - If seller set `phone_public: false`, the database kernel and API layer return `phone: null`. The UI indicates phone privacy without exposing digits in HTML or API responses.
5. **Off-Platform Finalization:** Buyer and seller coordinate physical inspection, veterinary check, and cash/direct payment offline.

### 3.2 Seller Listing Management Journey
1. **Registration:** Farmer registers with email and password, entering profile data (name, phone, district, state). Defaults `phone_public` to `false` for privacy. Default role is strictly hardcoded to `'user'`.
2. **Drafting a Listing:** Navigates to `/dashboard/listings/new`. Selects animal type (`cow`), breed (`Sahiwal`), gender (`female`), age (36 months), milk yield (14 L/day), price (₹55,000 strictly positive integer), district (`Amritsar`), and state (`Punjab`).
3. **Photo Upload:** Selects between 1 and 5 photographs directly from mobile gallery or camera. Images are optimized and uploaded to secure Supabase Storage with deterministic paths and sort orders (0 to 4).
4. **Publishing:** Farmer reviews details and clicks "Publish". The listing immediately appears in the public marketplace feed.
5. **Lifecycle Updates & Cleanup:** When the cow is sold, the farmer marks it as "Sold". If the farmer deletes the listing, a server-side cleanup workflow purges both database records and physical Supabase Storage objects.

### 3.3 Administrator Moderation Journey
1. **Access:** Administrator logs in via standard Supabase Auth; backend checks `app_metadata.role = 'admin'` or database verification.
2. **Moderation Queue:** Administrator accesses `/admin` to inspect newly published listings and flagged content.
3. **Intervention:** If a listing includes offensive imagery or deceptive pricing, the admin changes status to `archived` or deletes offending images.

---

## 4. MVP Scope Definition

### 4.1 In Scope (The 10 Frozen Requirements)
1. **Account Management:** User registration, login, session persistence, logout, and profile management (full name, phone, district, state, avatar, privacy preferences). Role elevation is strictly forbidden.
2. **Public Marketplace Browsing:** Fast, responsive public browsing of published cattle listings without requiring authentication.
3. **Keyword & Location Search:** Search by breed (exact and partial matching) and geographic location (district and state).
4. **Faceted Filtering:** Real-time filtering by animal type (`cow`, `buffalo`, `bull`, `calf`, `other`), price range (min/max INR strictly positive), age range (months), and milk yield range (liters/day).
5. **Comprehensive Listing Details:** Dedicated detail pages with rich metadata, structured specifications table, location badges, and multi-image galleries (up to 5 photos).
6. **Seller Listing Lifecycle (CRUD):** Authenticated sellers can create, view, edit, publish, unpublish (draft), mark as sold, and delete their own listings.
7. **Multiple Photographs:** Upload, display, reorder, and delete up to 5 photographs per listing stored in Supabase Storage (`sort_order` values 0–4). Includes reliable server-side storage cleanup for deleted listings, replaced images, and abandoned drafts.
8. **Seller Contact Privacy Controls:** Strict control over seller phone number exposure via user profile privacy settings (`phone_public: boolean`), enforced at the database RLS, API view, and SSR layer.
9. **Responsive, Accessible UI:** Mobile-first, responsive layouts tailored for rural Indian network conditions, adhering to WCAG 2.1 AA accessibility standards.
10. **Administrative Moderation Foundation:** Role-based administrative dashboard foundation allowing authorized moderators to review, unpublish, and archive listings.

### 4.2 Explicit Out-of-Scope Exclusions
- **No In-App Payments or Escrow:** No payment gateways or token payments. All transactions are direct buyer-seller agreements.
- **No Commission Tracking:** Pure discovery and contact platform for MVP.
- **No Real-Time In-App Chat / WebSockets:** Out-of-band communication (phone, WhatsApp) avoids server state complexity.
- **No AI / Machine Learning Price Predictions:** No automated price estimations or computer-vision breed detection.
- **No Native Mobile Apps (iOS/Android):** Next.js Progressive Web App (PWA) responsive web experience only.
- **No Delivery / Transport Logistics:** Buyer and seller arrange their own animal transport and veterinary fitness certificates.

---

## 5. Functional Requirements & Acceptance Criteria

### 5.1 Account & Profile Management
- **FR-1.1 Registration & Authentication:** Users can register using email and password via Supabase Auth.
- **FR-1.2 Profile Creation:** On registration, a matching `profiles` record is created with default `role = 'user'` and `phone_public = false`.
- **FR-1.3 Profile Editing:** Users can update their full name, phone number, district, state, and avatar.
- **FR-1.4 Role Security:** Standard users cannot modify their own `role` column through profile updates, Server Actions, or API payloads.
- **FR-1.5 Phone Privacy Toggle:** Users can independently toggle `phone_public` (true/false) at any time.

*Acceptance Criteria:*
- A newly registered user cannot set their role to `admin` through client payloads or API mutations.
- Attempting to pass `role: 'admin'` in a profile update yields an RLS error or trigger exception.
- An unauthenticated user cannot view the user's phone number if `phone_public` is `false`.

### 5.2 Public Browsing & Search
- **FR-2.1 Public Access:** Any visitor can access `/` and `/browse` without an account.
- **FR-2.2 Published Listings Only:** Anonymous queries to the database must strictly return records where `status = 'published'`.
- **FR-2.3 Breed Search:** Searching for "Sahiwal" returns all published listings whose breed matches case-insensitively.
- **FR-2.4 Location Filtering:** Filtering by state (e.g., "Punjab") and district (e.g., "Amritsar") filters results instantly.

*Acceptance Criteria:*
- Listings with status `draft`, `sold`, or `archived` are never visible in public browse or search feeds.

### 5.3 Faceted Filtering
- **FR-3.1 Animal Type Filter:** Filter by one or more supported animal types: `cow`, `buffalo`, `bull`, `calf`, `other`.
- **FR-3.2 Price Filter:** Numeric range filter in whole Indian Rupees (INR > 0).
- **FR-3.3 Age Filter:** Filter by animal age in months (0–360).
- **FR-3.4 Milk Yield Filter:** Filter by minimum daily milk yield (liters/day, 0–100). Automatically disabled or hidden when searching exclusively for male animals (`bull`) or calves.

*Acceptance Criteria:*
- Resetting filters immediately restores the default full catalogue.
- Query parameters are reflected in the URL for shareability.

### 5.4 Listing Detail & Presentation
- **FR-4.1 Detail Route:** Dynamic route `/listings/[id]` renders full listing specifications.
- **FR-4.2 Photo Gallery:** Displays up to 5 associated images in `sort_order` sequence (indices 0 to 4) with touch swipe and thumbnail navigation.
- **FR-4.3 Specification Badges:** Prominently highlights Price (formatted as `₹XX,XXX`), Breed, Age, Milk Yield, Gender, and Location.
  - If `age_months` is null, displays `"Age: Not specified"`.
  - If `milk_yield_liters_per_day` is null or animal is male, milk yield badge is cleanly omitted.
- **FR-4.4 Contact Box:** Renders seller name and location. Renders phone number and Call/WhatsApp CTAs only if permitted by privacy rules (`phone_public: true`).

*Acceptance Criteria:*
- Visiting a non-existent or unapproved UUID returns a proper 404 page.

### 5.5 Seller Listing Management (CRUD)
- **FR-5.1 Create Listing:** Authenticated sellers can submit new cattle listings with mandatory fields: title, animal_type, breed, gender, price_inr (strictly positive `BIGINT`), description, district, state.
- **FR-5.2 Conditional Validation:** `milk_yield_liters_per_day` is required or recommended only for female cows/buffaloes; optional or omitted for bulls and calves.
- **FR-5.3 Lifecycle Transitions:** Sellers can switch listing status:
  - `draft` ➔ `published`
  - `published` ➔ `draft` (unpublish)
  - `published` ➔ `sold`
  - Any ➔ `archived` (soft delete)
- **FR-5.4 Ownership Guard:** A seller can never edit, modify, or delete another seller's listing.

*Acceptance Criteria:*
- Server Actions enforce that `auth.uid() == seller_id` before committing updates.
- Validation rejects zero or negative prices (`price_inr <= 0`).

### 5.6 Photograph Upload & Lifecycle Management
- **FR-6.1 Multi-Photo Support:** Minimum 1 photo, maximum 5 photos per listing.
- **FR-6.2 Sequence Indices:** Photo sort order is strictly constrained to integers `0` through `4`.
- **FR-6.3 Format & Size Restrictions:** Supported MIME types: `image/jpeg`, `image/png`, `image/webp`. Maximum file size: 5 MB per image.
- **FR-6.4 Storage Hierarchy:** Uploads stored in dedicated Supabase Storage bucket `listing-images` under folder paths: `listings/{seller_id}/{listing_id}/{uuid}.{ext}`.
- **FR-6.5 Reliable Server-Side Cleanup:**
  - Deleting a listing triggers explicit deletion of physical storage objects from Supabase Storage before or alongside DB row removal.
  - Replacing or deleting an image triggers physical deletion of the superseded object.
  - Periodic automated reconciliation purges orphaned storage objects from abandoned drafts (>24h old).

*Acceptance Criteria:*
- Database cascade deletion alone is never assumed to delete storage binaries; explicit storage API removal is executed with retry logic.
- Non-image files or files exceeding 5 MB are rejected.

### 5.7 Seller Contact Privacy
- **FR-7.1 Privacy Mode:** If seller has `phone_public: false`:
  - Public listing page displays "Phone Protected by Seller".
  - Phone digits are completely omitted (`null`) from rendered HTML / SSR payloads and from API responses via PostgreSQL view/RLS.
- **FR-7.2 Public Mode:** If seller has `phone_public: true`:
  - Phone is displayed in international/Indian standard format (+91 XXXXX XXXXX) with click-to-call and WhatsApp integration links.

*Acceptance Criteria:*
- Anonymous and unauthenticated API calls to `/rest/v1/profiles` or public views cannot retrieve private phone numbers under any circumstances.

### 5.8 Administrator Moderation
- **FR-8.1 Moderation Access:** Only users whose `profiles.role` equals `'admin'` can access `/admin`.
- **FR-8.2 Actionable Controls:** Admins can transition any listing from `published` to `archived` or `draft`, and can ban/suspend users by updating profile status.
- **FR-8.3 Immutability:** Admin operations are audited and cannot be invoked by normal users.

---

## 6. Non-Functional Requirements (NFRs)

### 6.1 Performance
- **First Contentful Paint (FCP):** < 1.5 seconds on 4G rural mobile connections.
- **Time to Interactive (TTI):** < 2.8 seconds on mid-tier Android devices.
- **Image Optimization:** Automated WebP/AVIF transformation, lazy loading, and responsive srcset via Next.js `<Image />` component.

### 6.2 Security & Compliance
- **Data Protection:** Passwords securely hashed and managed exclusively by Supabase Auth (bcrypt).
- **Access Control:** PostgreSQL Row Level Security (RLS) enabled on 100% of public database tables.
- **Input Sanitization:** All user inputs validated through Zod schemas on both client and server before database transactions.
- **Zero Secret Leakage:** No Supabase service-role keys bundled into client bundles or repository files.

### 6.3 Accessibility (a11y)
- Conformance with **WCAG 2.1 Level AA**.
- Minimum contrast ratio of 4.5:1 for normal text and 3:1 for large text.
- Full keyboard navigability for interactive elements.
- Proper ARIA labels on icon buttons and assistive-technology support.

---

## 7. Approval Sign-off

| Role | Sign-off Name | Status | Date |
| :--- | :--- | :--- | :--- |
| **Technical Lead & Architect** | Antigravity Lead Architect | Completed (Review v1.1.0) | October 2026 |
| **Product Stakeholder** | User / Stakeholder Review | Pending Approval | — |
