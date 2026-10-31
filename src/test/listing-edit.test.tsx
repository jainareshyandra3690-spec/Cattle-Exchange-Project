import React from "react";
import { describe, it, expect, vi, beforeEach } from "vitest";
import { render, screen } from "@testing-library/react";
import { ListingEditForm } from "@/components/listing-edit-form";
import { ListingEditContent } from "@/app/listings/[id]/edit/page";
import { updateListingAction } from "@/actions/listings";
import type { CattleListing } from "@/types/database";

// Mock next/navigation
const mockRedirect = vi.fn();
const mockNotFound = vi.fn();
const mockPush = vi.fn();
const mockRefresh = vi.fn();

vi.mock("next/navigation", () => ({
  useRouter: () => ({
    push: mockPush,
    refresh: mockRefresh,
  }),
  redirect: (url: string) => {
    mockRedirect(url);
    throw new Error(`NEXT_REDIRECT: ${url}`);
  },
  notFound: () => {
    mockNotFound();
    throw new Error("NEXT_NOT_FOUND");
  },
  usePathname: () => "/listings/listing-123/edit",
}));

// Mock next/cache
vi.mock("next/cache", () => ({
  revalidatePath: vi.fn(),
}));

// Mock server auth
const mockGetCurrentUserAction = vi.fn();

vi.mock("@/actions/auth", () => ({
  getCurrentUserAction: () => mockGetCurrentUserAction(),
}));

// Mock Supabase server client for updateListingAction tests
const mockGetUser = vi.fn();
const mockCattleListingsUpdate = vi.fn();
const mockListingImagesSelect = vi.fn();
const mockListingImagesDelete = vi.fn();
const mockListingImagesInsert = vi.fn();
const mockStorageRemove = vi.fn();
const mockStorageQueueInsert = vi.fn();

vi.mock("@/lib/supabase/server", () => ({
  createClient: vi.fn().mockImplementation(async () => ({
    auth: {
      getUser: mockGetUser,
    },
    from: (table: string) => {
      if (table === "cattle_listings") {
        return {
          update: mockCattleListingsUpdate,
        };
      }
      if (table === "listing_images") {
        return {
          select: mockListingImagesSelect,
          delete: mockListingImagesDelete,
          insert: mockListingImagesInsert,
        };
      }
      if (table === "storage_cleanup_queue") {
        return {
          insert: mockStorageQueueInsert,
        };
      }
      return {};
    },
    storage: {
      from: () => ({
        remove: mockStorageRemove,
      }),
    },
  })),
}));

// Mock Supabase client for ImageDropzone
vi.mock("@/lib/supabase/client", () => ({
  createClient: () => ({
    storage: {
      from: () => ({
        upload: vi.fn().mockResolvedValue({ data: {}, error: null }),
      }),
    },
  }),
}));

const mockSampleListing: CattleListing = {
  id: "listing-123",
  seller_id: "seller-1",
  title: "High-Yielding Murrah Buffalo for Sale",
  animal_type: "buffalo",
  breed: "Murrah",
  gender: "female",
  age_months: 48,
  milk_yield_liters_per_day: 16.5,
  price_inr: 85000,
  description: "Very docile and healthy animal with 16.5L daily yield, second lactation.",
  district: "Karnal",
  state: "Haryana",
  status: "published",
  created_at: "2026-10-25T10:00:00Z",
  updated_at: "2026-10-25T10:00:00Z",
  images: [
    {
      id: "img-1",
      listing_id: "listing-123",
      storage_path: "listings/seller-1/listing-123/img-1.webp",
      sort_order: 0,
      created_at: "2026-10-25T10:00:00Z",
    },
    {
      id: "img-2",
      listing_id: "listing-123",
      storage_path: "listings/seller-1/listing-123/img-2.webp",
      sort_order: 1,
      created_at: "2026-10-25T10:00:00Z",
    },
  ],
};

describe("Listing Edit UI & Workflow", () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  describe("1. Action Logic (updateListingAction)", () => {
    it("rejects unauthenticated users", async () => {
      mockGetUser.mockResolvedValueOnce({ data: { user: null } });

      const result = await updateListingAction("listing-123", {
        title: "Valid title with enough length",
        animal_type: "cow",
        breed: "Sahiwal",
        gender: "female",
        price_inr: 50000,
        district: "Rohtak",
        state: "Haryana",
        description: "Valid description that meets minimum length requirements.",
        status: "published",
      });

      expect(result.success).toBe(false);
      expect(result.error).toContain("You must be signed in");
    });

    it("validates form schema and returns fieldErrors on invalid data", async () => {
      mockGetUser.mockResolvedValueOnce({
        data: { user: { id: "seller-1" } },
      });

      const invalidPayload = {
        title: "Short", // < 10 characters
        animal_type: "cow",
        breed: "S", // < 2 characters
        gender: "female",
        price_inr: -500, // Negative price invalid
        district: "K",
        state: "H",
        description: "Too short", // < 20 characters
        status: "published",
      };

      const result = await updateListingAction("listing-123", invalidPayload);
      expect(result.success).toBe(false);
      expect(result.fieldErrors?.title).toBeDefined();
      expect(result.fieldErrors?.price_inr).toBeDefined();
      expect(result.fieldErrors?.description).toBeDefined();
    });

    it("rejects unauthorized update when DB returns zero updated rows under RLS", async () => {
      mockGetUser.mockResolvedValueOnce({
        data: { user: { id: "unauthorized-user" } },
      });

      mockCattleListingsUpdate.mockReturnValueOnce({
        eq: vi.fn().mockReturnValueOnce({
          select: vi.fn().mockResolvedValueOnce({
            data: [], // RLS filtered out the update
            error: null,
          }),
        }),
      });

      const validPayload = {
        title: "High-Yielding Murrah Buffalo for Sale",
        animal_type: "buffalo",
        breed: "Murrah",
        gender: "female",
        price_inr: 85000,
        district: "Karnal",
        state: "Haryana",
        description: "Very docile and healthy animal with 16.5L daily yield.",
        status: "published",
      };

      const result = await updateListingAction("listing-123", validPayload);
      expect(result.success).toBe(false);
      expect(result.error).toContain("permission");
    });

    it("successfully updates listing and syncs added/removed images", async () => {
      mockGetUser.mockResolvedValueOnce({
        data: { user: { id: "seller-1" } },
      });

      mockCattleListingsUpdate.mockReturnValueOnce({
        eq: vi.fn().mockReturnValueOnce({
          select: vi.fn().mockResolvedValueOnce({
            data: [{ id: "listing-123" }],
            error: null,
          }),
        }),
      });

      // Existing images query returns img-1 and img-2
      mockListingImagesSelect.mockReturnValueOnce({
        eq: vi.fn().mockResolvedValueOnce({
          data: [
            { storage_path: "listings/seller-1/listing-123/img-1.webp" },
            { storage_path: "listings/seller-1/listing-123/img-2.webp" },
          ],
          error: null,
        }),
      });

      // Old images delete succeeds
      mockListingImagesDelete.mockReturnValueOnce({
        eq: vi.fn().mockResolvedValueOnce({ error: null }),
      });

      // New images insert succeeds
      mockListingImagesInsert.mockResolvedValueOnce({ error: null });

      // Storage remove for img-2 (removed by user)
      mockStorageRemove.mockResolvedValueOnce({ error: null });

      const validPayload = {
        title: "High-Yielding Murrah Buffalo for Sale",
        animal_type: "buffalo",
        breed: "Murrah",
        gender: "female",
        price_inr: 90000,
        district: "Karnal",
        state: "Haryana",
        description: "Very docile and healthy animal with 16.5L daily yield.",
        status: "published",
      };

      // Keep img-1, remove img-2, add img-3
      const updatedImagePaths = [
        "listings/seller-1/listing-123/img-1.webp",
        "listings/seller-1/listing-123/img-3.webp",
      ];

      const result = await updateListingAction("listing-123", validPayload, updatedImagePaths);
      expect(result.success).toBe(true);
      expect(result.data?.listingId).toBe("listing-123");

      // Verify listing_images insert was called with sort_order 0 and 1
      expect(mockListingImagesInsert).toHaveBeenCalledWith([
        {
          listing_id: "listing-123",
          storage_path: "listings/seller-1/listing-123/img-1.webp",
          sort_order: 0,
        },
        {
          listing_id: "listing-123",
          storage_path: "listings/seller-1/listing-123/img-3.webp",
          sort_order: 1,
        },
      ]);

      // Verify storage removal was called for img-2
      expect(mockStorageRemove).toHaveBeenCalledWith([
        "listings/seller-1/listing-123/img-2.webp",
      ]);
    });
  });

  describe("2. Client Component (ListingEditForm)", () => {
    it("prepopulates form fields with existing listing values", () => {
      render(
        <ListingEditForm listing={mockSampleListing} userId="seller-1" />
      );

      expect(screen.getByLabelText(/Listing Title/i)).toHaveValue(
        "High-Yielding Murrah Buffalo for Sale"
      );
      expect(screen.getByLabelText(/Animal Category/i)).toHaveValue("buffalo");
      expect(screen.getByLabelText(/Breed/i)).toHaveValue("Murrah");
      expect(screen.getByLabelText(/Gender/i)).toHaveValue("female");
      expect(screen.getByLabelText(/Age/i)).toHaveValue(48);
      expect(screen.getByLabelText(/Daily Milk Yield/i)).toHaveValue(16.5);
      expect(screen.getByLabelText(/Price/i)).toHaveValue(85000);
      expect(screen.getByLabelText(/State/i)).toHaveValue("Haryana");
      expect(screen.getByLabelText(/District/i)).toHaveValue("Karnal");
      expect(screen.getByLabelText(/Detailed Description/i)).toHaveValue(
        "Very docile and healthy animal with 16.5L daily yield, second lactation."
      );
      expect(screen.getByLabelText(/Listing Status/i)).toHaveValue("published");

      // Verify images count indicator
      expect(screen.getByText("2/5 uploaded")).toBeInTheDocument();

      // Verify action buttons
      expect(screen.getByRole("button", { name: /Save Changes/i })).toBeInTheDocument();
      expect(screen.getByRole("button", { name: /Save as Draft/i })).toBeInTheDocument();
      expect(screen.getByRole("button", { name: /Cancel/i })).toBeInTheDocument();
    });

    it("renders Cancel link targeting the listing detail page", () => {
      render(
        <ListingEditForm listing={mockSampleListing} userId="seller-1" />
      );

      const cancelLink = screen.getByRole("link", { name: /Cancel/i });
      expect(cancelLink).toHaveAttribute("href", "/listings/listing-123");
    });
  });

  describe("3. Route Guard & Access Control (ListingEditContent)", () => {
    it("redirects unauthenticated users to sign-in with redirect param", async () => {
      mockGetCurrentUserAction.mockResolvedValueOnce(null);

      await expect(
        ListingEditContent({ params: Promise.resolve({ id: "listing-123" }) })
      ).rejects.toThrow(/NEXT_REDIRECT: \/auth\/sign-in\?redirect=\/listings\/listing-123\/edit/);
      expect(mockRedirect).toHaveBeenCalledWith(
        "/auth/sign-in?redirect=/listings/listing-123/edit"
      );
    });

    it("triggers notFound when listing does not exist", async () => {
      mockGetCurrentUserAction.mockResolvedValueOnce({
        user: { id: "seller-1", app_metadata: {} },
        profile: { role: "user" },
      });

      // Default mock for getListingByIdAction will return null if we mock it in this test
      // Since it's imported in page.tsx, let's test notFound when listing is missing
      mockGetUser.mockResolvedValueOnce({
        data: { user: { id: "seller-1" } },
      });

      // Let's test with a non-existent ID where supabase returns null
      await expect(
        ListingEditContent({ params: Promise.resolve({ id: "non-existent-id" }) })
      ).rejects.toThrow("NEXT_NOT_FOUND");
      expect(mockNotFound).toHaveBeenCalled();
    });

    it("denies access to authenticated users who are not the owner or admin", async () => {
      mockGetCurrentUserAction.mockResolvedValueOnce({
        user: { id: "different-user", app_metadata: { role: "user" } },
        profile: { role: "user" },
      });

      // Using demo listing fallback in getListingByIdAction
      const content = await ListingEditContent({
        params: Promise.resolve({ id: "demo-listing-1" }),
      });
      render(content);

      expect(screen.getByText("Access Denied")).toBeInTheDocument();
      expect(
        screen.getByText(/Only the listing owner or an administrator can modify it/i)
      ).toBeInTheDocument();
      expect(screen.getByRole("button", { name: /View Listing/i })).toBeInTheDocument();
      expect(screen.getByRole("button", { name: /Go to Dashboard/i })).toBeInTheDocument();
    });

    it("allows access for listing owner", async () => {
      // demo-listing-1 seller_id is "demo-seller-1"
      mockGetCurrentUserAction.mockResolvedValueOnce({
        user: { id: "demo-seller-1", app_metadata: { role: "user" } },
        profile: { role: "user" },
      });

      const content = await ListingEditContent({
        params: Promise.resolve({ id: "demo-listing-1" }),
      });
      render(content);

      expect(screen.getByText("Edit Cattle Listing")).toBeInTheDocument();
      expect(screen.getByRole("button", { name: /Save Changes/i })).toBeInTheDocument();
    });

    it("allows access for administrator even if not the owner", async () => {
      mockGetCurrentUserAction.mockResolvedValueOnce({
        user: { id: "admin-officer", app_metadata: { role: "admin" } },
        profile: { role: "admin" },
      });

      const content = await ListingEditContent({
        params: Promise.resolve({ id: "demo-listing-1" }),
      });
      render(content);

      expect(screen.getByText("Edit Cattle Listing")).toBeInTheDocument();
      expect(screen.getByRole("button", { name: /Save Changes/i })).toBeInTheDocument();
    });
  });
});
