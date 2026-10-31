import React from "react";
import { describe, it, expect, vi, beforeEach } from "vitest";
import { render, screen, fireEvent, waitFor } from "@testing-library/react";
import { AdminModerationTable } from "@/components/admin-moderation-table";
import { archiveListingByAdminAction, getAdminDashboardDataAction } from "@/actions/admin";
import { AdminDashboardContent } from "@/app/admin/page";
import type { CattleListing } from "@/types/database";

// Mock next/navigation
const mockRedirect = vi.fn();
const mockRefresh = vi.fn();

vi.mock("next/navigation", () => ({
  useRouter: () => ({
    refresh: mockRefresh,
  }),
  redirect: (url: string) => {
    mockRedirect(url);
    throw new Error(`NEXT_REDIRECT: ${url}`);
  },
  usePathname: () => "/admin",
}));

// Mock next/cache
vi.mock("next/cache", () => ({
  revalidatePath: vi.fn(),
}));

// Mock server auth helper
const mockGetCurrentUserAction = vi.fn();
vi.mock("@/actions/auth", () => ({
  getCurrentUserAction: () => mockGetCurrentUserAction(),
}));

// Mock Supabase server client
const mockSupabaseUpdate = vi.fn();
const mockSupabaseSingle = vi.fn();
const mockSupabaseOrder = vi.fn();
const mockGetUser = vi.fn();

vi.mock("@/lib/supabase/server", () => ({
  createClient: vi.fn().mockImplementation(async () => ({
    auth: {
      getUser: mockGetUser,
    },
    from: (table: string) => {
      if (table === "profiles") {
        return {
          select: (fields: string, opts?: { count?: string; head?: boolean }) => {
            if (opts?.head) {
              return Promise.resolve({ count: 12, error: null });
            }
            return {
              eq: () => ({
                single: mockSupabaseSingle,
              }),
            };
          },
        };
      }
      if (table === "cattle_listings") {
        return {
          update: mockSupabaseUpdate,
          select: () => ({
            order: mockSupabaseOrder,
          }),
        };
      }
      return {};
    },
  })),
}));

const mockSampleListings: CattleListing[] = [
  {
    id: "listing-1",
    seller_id: "seller-1",
    title: "High-Yielding Murrah Buffalo",
    animal_type: "buffalo",
    breed: "Murrah",
    gender: "female",
    age_months: 48,
    milk_yield_liters_per_day: 18.5,
    price_inr: 95000,
    description: "Docile Murrah buffalo with high milk fat content.",
    district: "Rohtak",
    state: "Haryana",
    status: "published",
    created_at: "2026-10-24T12:00:00.000Z",
    updated_at: "2026-10-24T12:00:00.000Z",
    seller: {
      id: "seller-1",
      full_name: "Suresh Kumar",
      district: "Rohtak",
      state: "Haryana",
      avatar_path: null,
      created_at: "2026-10-24T12:00:00.000Z",
      phone_public: true,
      phone: "+919876543210",
    },
  },
  {
    id: "listing-2",
    seller_id: "seller-2",
    title: "Indigenous Gir Cow",
    animal_type: "cow",
    breed: "Gir",
    gender: "female",
    age_months: 36,
    milk_yield_liters_per_day: 14.0,
    price_inr: 70000,
    description: "Purebred Gir cow with excellent pedigree.",
    district: "Junagadh",
    state: "Gujarat",
    status: "archived",
    created_at: "2026-10-25T12:00:00.000Z",
    updated_at: "2026-10-25T12:00:00.000Z",
    seller: {
      id: "seller-2",
      full_name: "Ramesh Patel",
      district: "Junagadh",
      state: "Gujarat",
      avatar_path: null,
      created_at: "2026-10-25T12:00:00.000Z",
      phone_public: false,
      phone: null,
    },
  },
];

describe("Phase 6: Admin Moderation Deck & Operational Safeguards", () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  describe("1. Server-Side Authorization Enforcement in archiveListingByAdminAction", () => {
    it("rejects unauthenticated callers with authentication required error", async () => {
      mockGetUser.mockResolvedValueOnce({ data: { user: null } });

      const result = await archiveListingByAdminAction("listing-1");
      expect(result.success).toBe(false);
      expect(result.error).toMatch(/authentication required/i);
    });

    it("rejects invalid or missing listing IDs", async () => {
      const result = await archiveListingByAdminAction("");
      expect(result.success).toBe(false);
      expect(result.error).toMatch(/invalid listing id/i);
    });

    it("rejects authenticated non-admin users attempting to archive a listing", async () => {
      mockGetUser.mockResolvedValueOnce({
        data: {
          user: { id: "user-123", app_metadata: { role: "user" } },
        },
      });
      mockSupabaseSingle.mockResolvedValueOnce({
        data: { role: "user" },
        error: null,
      });

      const result = await archiveListingByAdminAction("listing-1");
      expect(result.success).toBe(false);
      expect(result.error).toMatch(/administrator privileges required/i);
    });

    it("allows authorized administrators to archive a listing and revalidates paths", async () => {
      mockGetUser.mockResolvedValueOnce({
        data: {
          user: { id: "admin-999", app_metadata: { role: "admin" } },
        },
      });
      mockSupabaseUpdate.mockReturnValueOnce({
        eq: vi.fn().mockReturnValueOnce({
          select: vi.fn().mockResolvedValueOnce({
            data: [{ id: "listing-1" }],
            error: null,
          }),
        }),
      });

      const result = await archiveListingByAdminAction("listing-1");
      expect(result.success).toBe(true);
    });

    it("returns error message if database update fails", async () => {
      mockGetUser.mockResolvedValueOnce({
        data: {
          user: { id: "admin-999", app_metadata: { role: "admin" } },
        },
      });
      mockSupabaseUpdate.mockReturnValueOnce({
        eq: vi.fn().mockReturnValueOnce({
          select: vi.fn().mockResolvedValueOnce({
            data: null,
            error: { message: "Database constraint error" },
          }),
        }),
      });

      const result = await archiveListingByAdminAction("listing-1");
      expect(result.success).toBe(false);
      expect(result.error).toBe("Database constraint error");
    });

    it("returns error if database RLS denies row update (0 rows updated)", async () => {
      mockGetUser.mockResolvedValueOnce({
        data: {
          user: { id: "admin-999", app_metadata: { role: "admin" } },
        },
      });
      mockSupabaseUpdate.mockReturnValueOnce({
        eq: vi.fn().mockReturnValueOnce({
          select: vi.fn().mockResolvedValueOnce({
            data: [],
            error: null,
          }),
        }),
      });

      const result = await archiveListingByAdminAction("listing-1");
      expect(result.success).toBe(false);
      expect(result.error).toMatch(/database authorization policy denied/i);
    });
  });

  describe("2. Server-Side Data Fetching in getAdminDashboardDataAction", () => {
    it("denies non-admin callers from accessing operational metrics", async () => {
      mockGetUser.mockResolvedValueOnce({
        data: {
          user: { id: "user-123", app_metadata: { role: "user" } },
        },
      });
      mockSupabaseSingle.mockResolvedValueOnce({
        data: { role: "user" },
        error: null,
      });

      const result = await getAdminDashboardDataAction();
      expect(result.success).toBe(false);
      expect(result.error).toMatch(/administrator privileges required/i);
    });

    it("computes accurate metrics for authorized admin callers", async () => {
      mockGetUser.mockResolvedValueOnce({
        data: {
          user: { id: "admin-999", app_metadata: { role: "admin" } },
        },
      });
      mockSupabaseOrder.mockResolvedValueOnce({
        data: mockSampleListings,
        error: null,
      });

      const result = await getAdminDashboardDataAction();
      expect(result.success).toBe(true);
      expect(result.data?.metrics.totalListings).toBe(2);
      expect(result.data?.metrics.publishedListings).toBe(1);
      expect(result.data?.metrics.archivedListings).toBe(1);
      expect(result.data?.metrics.totalUsers).toBe(12);
    });
  });

  describe("3. Admin Moderation Table Component (AdminModerationTable)", () => {
    it("renders listings with titles, category, breed, price in INR, and seller location", () => {
      render(<AdminModerationTable initialListings={mockSampleListings} />);

      expect(screen.getByText("High-Yielding Murrah Buffalo")).toBeInTheDocument();
      expect(screen.getByText("Indigenous Gir Cow")).toBeInTheDocument();
      expect(screen.getByText("₹95,000")).toBeInTheDocument();
      expect(screen.getByText("₹70,000")).toBeInTheDocument();
      expect(screen.getByText("Suresh Kumar")).toBeInTheDocument();
      expect(screen.getByText("Rohtak, Haryana")).toBeInTheDocument();
      expect(screen.getByText("Junagadh, Gujarat")).toBeInTheDocument();
    });

    it("filters listings by status tabs", () => {
      render(<AdminModerationTable initialListings={mockSampleListings} />);

      // Switch to Archived tab
      const archivedTab = screen.getByRole("button", { name: /^Archived/i });
      fireEvent.click(archivedTab);

      expect(screen.queryByText("High-Yielding Murrah Buffalo")).not.toBeInTheDocument();
      expect(screen.getByText("Indigenous Gir Cow")).toBeInTheDocument();
    });

    it("filters listings by text search query", () => {
      render(<AdminModerationTable initialListings={mockSampleListings} />);

      const searchInput = screen.getByPlaceholderText(/search listings/i);
      fireEvent.change(searchInput, { target: { value: "Murrah" } });

      expect(screen.getByText("High-Yielding Murrah Buffalo")).toBeInTheDocument();
      expect(screen.queryByText("Indigenous Gir Cow")).not.toBeInTheDocument();
    });

    it("displays empty state when no listings match the query", () => {
      render(<AdminModerationTable initialListings={mockSampleListings} />);

      const searchInput = screen.getByPlaceholderText(/search listings/i);
      fireEvent.change(searchInput, { target: { value: "NonExistentBreedXYZ" } });

      expect(screen.getByText(/no listings found/i)).toBeInTheDocument();
    });

    it("enforces confirmation step before archiving a listing", () => {
      render(<AdminModerationTable initialListings={mockSampleListings} />);

      // Find the specific Archive action button for the published listing
      const archiveBtn = screen.getByRole("button", { name: /^Archive$/ });
      fireEvent.click(archiveBtn);

      // Confirmation prompt must appear
      expect(screen.getByText(/Confirm\?/i)).toBeInTheDocument();
      expect(screen.getByRole("button", { name: /Yes, Archive/i })).toBeInTheDocument();
      expect(screen.getByRole("button", { name: /Cancel/i })).toBeInTheDocument();

      // Cancelling must dismiss confirmation
      fireEvent.click(screen.getByRole("button", { name: /Cancel/i }));
      expect(screen.queryByText(/Confirm\?/i)).not.toBeInTheDocument();
      expect(screen.getByRole("button", { name: /^Archive$/ })).toBeInTheDocument();
    });

    it("executes archive when confirmed, updates status, and displays success alert", async () => {
      mockGetUser.mockResolvedValueOnce({
        data: {
          user: { id: "admin-999", app_metadata: { role: "admin" } },
        },
      });
      mockSupabaseUpdate.mockReturnValueOnce({
        eq: vi.fn().mockReturnValueOnce({
          select: vi.fn().mockResolvedValueOnce({
            data: [{ id: "listing-1" }],
            error: null,
          }),
        }),
      });

      render(<AdminModerationTable initialListings={mockSampleListings} />);

      // Click Archive
      fireEvent.click(screen.getByRole("button", { name: /^Archive$/ }));

      // Confirm Archive
      const confirmBtn = screen.getByRole("button", { name: /Yes, Archive/i });
      fireEvent.click(confirmBtn);

      await waitFor(() => {
        expect(screen.getByText(/has been successfully archived/i)).toBeInTheDocument();
      });
    });
  });

  describe("4. Route Guard & Server-Side Access Control (AdminDashboardContent)", () => {
    it("redirects unauthenticated visitors to sign-in with redirect parameter", async () => {
      mockGetCurrentUserAction.mockResolvedValueOnce(null);

      await expect(AdminDashboardContent()).rejects.toThrow(/NEXT_REDIRECT: \/auth\/sign-in\?redirect=\/admin/);
      expect(mockRedirect).toHaveBeenCalledWith("/auth/sign-in?redirect=/admin");
    });

    it("denies authenticated non-admin users with 403 Access Denied screen", async () => {
      mockGetCurrentUserAction.mockResolvedValueOnce({
        user: { id: "farmer-1", app_metadata: { role: "user" } },
        profile: { role: "user", full_name: "Farmer Ram" },
      });

      const content = await AdminDashboardContent();
      render(content);

      expect(
        screen.getByText(/Access Denied: Administrator Privileges Required/i)
      ).toBeInTheDocument();
      expect(
        screen.getByText(/Return to Farmer Dashboard/i)
      ).toBeInTheDocument();
    });

    it("renders moderation deck with metrics and queue for authorized admin", async () => {
      mockGetCurrentUserAction.mockResolvedValueOnce({
        user: { id: "admin-1", app_metadata: { role: "admin" } },
        profile: { role: "admin", full_name: "Admin Officer" },
      });

      mockGetUser.mockResolvedValueOnce({
        data: {
          user: { id: "admin-1", app_metadata: { role: "admin" } },
        },
      });
      mockSupabaseOrder.mockResolvedValueOnce({
        data: mockSampleListings,
        error: null,
      });

      const content = await AdminDashboardContent();
      render(content);

      expect(
        screen.getByRole("heading", { name: /Administrator Moderation Deck/i })
      ).toBeInTheDocument();
      expect(screen.getByText("Verified Admin Session")).toBeInTheDocument();
      expect(screen.getByText("Total Listings")).toBeInTheDocument();
      expect(screen.getAllByText("Published")[0]).toBeInTheDocument();
      expect(screen.getByText("Sold Cattle")).toBeInTheDocument();
      expect(screen.getByText("Registered Users")).toBeInTheDocument();
    });
  });
});
