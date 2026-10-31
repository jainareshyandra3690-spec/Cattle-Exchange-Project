# Cattle Exchange — Testing & Quality Assurance Plan

**Document Version:** 1.1.0  
**Phase:** Phase 0 (Architecture, Requirements, and Planning — Review Revisions)  
**Status:** Ready for Review & Approval  
**Last Updated:** October 2026  

---

## 1. Testing Philosophy & Strategy

To ensure high reliability, zero data corruption, and bulletproof security for rural livestock transactions, Cattle Exchange employs a multi-tiered **Testing Pyramid**.

```
                       ┌─────────────────────────┐
                       │   End-to-End (Playwright)│  <-- Critical User Journeys & Smoke Tests
                       ├─────────────────────────┤
                       │  Integration & RLS Suite │  <-- Server Actions & Postgres Policies
                       ├─────────────────────────┤
                       │  Component Tests (RTL)   │  <-- UI State, Skeletons, Forms, A11y
                       ├─────────────────────────┤
                       │   Unit Tests (Vitest)    │  <-- Zod Schemas, Formatters, Helpers
                       └─────────────────────────┘
```

The test harness guarantees that:
1. No user can access or mutate unauthorized records.
2. Standard users cannot escalate privileges or become administrators.
3. Private phone numbers are never leaked via database APIs, views, or SSR payloads.
4. Storage objects are reliably cleaned up when listings/images are deleted, with resilient retry handling.
5. Form validation prevents erroneous cattle data (e.g. negative prices, excessive images) from reaching the database.

---

## 2. Test Types & Coverage Matrix

| Test Level | Tooling | Scope & Target Areas | Target Coverage | CI Execution Trigger |
| :--- | :--- | :--- | :--- | :--- |
| **Unit Tests** | Vitest | Zod schemas, currency formatting (`formatINR`), location filters, query param parsers. | > 90% logic coverage | Every commit & Pull Request |
| **Component Tests**| Vitest + React Testing Library | `ListingCard`, `FilterSidebar`, `SellerContactCard`, `ImageGallery`, form validation errors. | > 80% component coverage| Every commit & Pull Request |
| **Integration Tests**| Vitest + Supabase Test Client | Server Actions (`createListingAction`, `deleteListingAction`), Session handling, Storage cleanup retry. | > 85% action coverage | Every Pull Request |
| **Database & RLS**| Supabase CLI + `pgTAP` / Node | Postgres RLS policies on `profiles`, `cattle_listings`, `listing_images`, views, and Storage. | 100% policy branch coverage | DB migration changes & PRs |
| **End-to-End (E2E)**| Playwright | Full browser user journeys (Registration, Listing Creation, Search, Contact Reveal, Admin Moderation). | Top 5 user journeys | Pull Requests to `main` |
| **Accessibility** | `@axe-core/playwright` | WCAG 2.1 Level AA automated checks across all core routes. | Zero serious/critical violations | Weekly & Pre-release |
| **Visual Regression**| Playwright Screenshots | Mobile (< 640px) and Desktop viewport rendering of listing cards and detail pages. | Core layouts | Pre-release |

---

## 3. Unit & Component Testing Specifications

### 3.1 Unit Testing with Vitest
- **Target Files:** `src/lib/formatters.ts`, `src/lib/validations/*.ts`, `src/lib/constants/*.ts`
- **Key Test Cases:**
  1. `formatINR(85000)` formats correctly as `"₹85,000"`.
  2. `formatINR(1250000)` formats correctly as `"₹12,50,000"`.
  3. `CattleListingSchema` fails when `price_inr <= 0` (rejects 0 and negative prices).
  4. `CattleListingSchema` fails when `price_inr > 100000000` (exceeds ₹10 Crore ceiling).
  5. `CattleListingSchema` fails when `animal_type` is not in `['cow', 'buffalo', 'bull', 'calf', 'other']`.
  6. `CattleListingSchema` allows `milk_yield_liters_per_day` to be `null` for male animals (`gender = 'male'`).
  7. `ListingImageSchema` rejects `sort_order < 0` or `sort_order > 4` (enforcing max 5 images).
  8. Phone regex validation correctly accepts `+919876543210` and `9876543210`, but rejects invalid strings or alpha characters.

### 3.2 Component Testing with React Testing Library
- **Target Components:** `src/components/marketplace/ListingCard.tsx`, `src/components/marketplace/SellerContactCard.tsx`, `src/components/forms/ListingForm.tsx`
- **Key Test Cases:**
  1. `ListingCard` displays animal breed, price, location, and milk yield when available; cleanly hides the milk yield badge when `null` (never renders "0 L/day" or "null").
  2. `ListingCard` displays `"Age: Not specified"` when `age_months` is `null`.
  3. `SellerContactCard` displays "Phone Protected by Seller" when `phone_public: false` and hides the tel/WhatsApp buttons.
  4. `SellerContactCard` renders valid `tel:` and `https://wa.me/` links when `phone_public: true`.
  5. `ListingForm` disables the `milk_yield_liters_per_day` input when user selects `animal_type: 'bull'`.
  6. Multi-image dropzone prevents selecting more than 5 images and displays visual warnings.

---

## 4. Role Security & Anti-Privilege Escalation Test Suite

These integration tests verify that standard users can never elevate their own role to `'admin'`:

```typescript
describe("Role Security & Anti-Privilege Escalation", () => {
  it("A standard authenticated user CANNOT update their role to 'admin' via direct SQL / PostgREST", async () => {
    const userClient = createTestClient("authenticated_standard_user");
    const { error } = await userClient
      .from("profiles")
      .update({ role: "admin" })
      .eq("id", userClient.auth.user.id);

    // Expect trigger/RLS exception (42501)
    expect(error).not.toBeNull();
    expect(error?.code).toBe("42501");
  });

  it("A standard user CANNOT escalate role via Server Action payload", async () => {
    const maliciousPayload = {
      full_name: "Attacker",
      role: "admin", // Malicious injection
    };
    const result = await updateProfileAction(maliciousPayload);
    
    // Server action must strip unauthorized fields or reject
    const profile = await getProfileById(userClient.auth.user.id);
    expect(profile.role).toBe("user");
  });

  it("New registration trigger strictly sets role = 'user' regardless of metadata", async () => {
    const { data: newUser } = await supabase.auth.signUp({
      email: "test@example.com",
      password: "Password123!",
      options: {
        data: { role: "admin" }, // Attempt to sneak admin role into user metadata
      },
    });

    const { data: profile } = await adminClient
      .from("profiles")
      .select("role")
      .eq("id", newUser.user!.id)
      .single();

    expect(profile.role).toBe("user");
  });
});
```

---

## 5. Seller Contact Privacy Test Suite

Verifies that private phone numbers are never exposed at the database, view, or API layers:

```typescript
describe("Seller Contact Privacy Enforcement", () => {
  it("Anonymous user querying raw profiles table receives 0 rows (Restricted RLS)", async () => {
    const anonClient = createAnonClient();
    const { data, error } = await anonClient.from("profiles").select("*");
    expect(data).toHaveLength(0);
  });

  it("Anonymous user querying public_profiles view receives phone = NULL when phone_public = false", async () => {
    const anonClient = createAnonClient();
    const { data } = await anonClient
      .from("public_profiles")
      .select("id, full_name, phone, phone_public")
      .eq("id", privateSellerProfileId)
      .single();

    expect(data.phone).toBeNull();
    expect(data.phone_public).toBe(false);
  });

  it("Anonymous user querying public_profiles view receives phone when phone_public = true", async () => {
    const anonClient = createAnonClient();
    const { data } = await anonClient
      .from("public_profiles")
      .select("phone, phone_public")
      .eq("id", publicSellerProfileId)
      .single();

    expect(data.phone).toBe("+919876543210");
    expect(data.phone_public).toBe(true);
  });

  it("Authenticated user CANNOT view private phone of another user via public_profiles", async () => {
    const buyerClient = createTestClient("authenticated_buyer");
    const { data } = await buyerClient
      .from("public_profiles")
      .select("phone")
      .eq("id", privateSellerProfileId)
      .single();

    expect(data.phone).toBeNull();
  });

  it("Authenticated seller CAN view their own phone number", async () => {
    const sellerClient = createTestClient("authenticated_seller");
    const { data } = await sellerClient
      .from("profiles")
      .select("phone")
      .eq("id", sellerClient.auth.user.id)
      .single();

    expect(data.phone).toBe("+919876543210");
  });
});
```

---

## 6. Storage Lifecycle & Cleanup Failure Test Suite

Verifies that physical storage files are properly deleted and that transient failures are handled via the retry queue:

```typescript
describe("Supabase Storage Lifecycle & Cleanup Resilience", () => {
  it("Deleting a listing invokes storage.from.remove with all associated image paths", async () => {
    const sellerClient = createTestClient("authenticated_seller");
    const removeSpy = vi.spyOn(sellerClient.storage.from("listing-images"), "remove");

    await deleteListingAction(testListingWithImagesId);

    expect(removeSpy).toHaveBeenCalledWith(expect.arrayContaining([
      expect.stringMatching(/^listings\/.*\.jpg$/),
    ]));
  });

  it("When storage.remove fails with 500 error, paths are enqueued in storage_cleanup_queue", async () => {
    const sellerClient = createTestClient("authenticated_seller");
    vi.spyOn(sellerClient.storage.from("listing-images"), "remove").mockRejectedValueOnce(
      new Error("Transient S3 Storage Timeout")
    );

    // Deletion should succeed in DB while queueing failed storage paths
    await deleteListingAction(testListingWithImagesId);

    const { data: queueItems } = await adminClient
      .from("storage_cleanup_queue")
      .select("*")
      .eq("bucket_id", "listing-images");

    expect(queueItems.length).toBeGreaterThan(0);
    expect(queueItems[0].retry_count).toBe(0);
  });

  it("Scheduled cleanup job reconciles orphaned images older than 24 hours", async () => {
    // Seed an orphan object in storage with mock creation time > 24h ago
    await seedOrphanStorageObject("listings/test-user/orphan-listing/orphan.jpg");

    // Execute reconciliation worker
    const report = await runStorageReconciliationJob();

    expect(report.deletedOrphansCount).toBe(1);
    expect(report.errors).toHaveLength(0);
  });
});
```

---

## 7. End-to-End (E2E) Playwright Test Suites

Playwright executes full browser workflows simulating real user interaction on desktop and mobile viewports.

1. **Suite 1: Buyer Search & Discovery Flow:** Category cards ➔ Search "Murrah" ➔ State/District filter ➔ Listing detail specs verification.
2. **Suite 2: Seller Registration & Listing Creation:** Sign up ➔ Create listing ➔ Upload up to 5 photos ➔ Verify cover photo (`sort_order = 0`) ➔ Publish ➔ View in public feed.
3. **Suite 3: Seller Contact Privacy Enforcement:** Seller sets `phone_public: false` ➔ Incognito context navigates to listing ➔ Asserts phone digits are not in DOM or network response ➔ Seller toggles `phone_public: true` ➔ Reload confirms phone and click-to-call links appear.
4. **Suite 4: Listing Deletion & Storage Verification:** Seller deletes listing ➔ Asserts listing is removed from UI ➔ Verifies storage API removed associated image paths.
5. **Suite 5: Admin Moderation:** Admin logs in via provisioned account ➔ Accesses `/admin` ➔ Archives offending listing ➔ Confirms public listing returns 404.

---

## 8. Accessibility & Performance Validation

- **Automated Accessibility Testing:** `@axe-core/playwright` verifies zero WCAG 2.1 Level AA violations across all views.
- **Mobile Performance & Web Vitals:** Automated Lighthouse CI auditing on pull requests:
  - Performance Score $\ge 90$
  - Accessibility Score $\ge 95$
  - Cumulative Layout Shift (CLS) $\le 0.05$

---

## 9. Approval Sign-off

| Role | Sign-off Name | Status | Date |
| :--- | :--- | :--- | :--- |
| **Technical Lead & Architect** | Antigravity Lead Architect | Completed (Review v1.1.0) | October 2026 |
| **QA & Test Lead** | Quality Assurance Review | Pending Approval | — |
