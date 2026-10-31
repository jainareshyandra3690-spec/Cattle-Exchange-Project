"use server";

import { createClient } from "@/lib/supabase/server";
import { revalidatePath } from "next/cache";
import type { ActionResponse } from "./auth";
import type { CattleListing } from "@/types/database";
import { DEMO_LISTINGS } from "@/lib/demo-data";

export interface AdminMetrics {
  totalListings: number;
  publishedListings: number;
  soldListings: number;
  archivedListings: number;
  totalUsers: number;
}

export interface AdminDashboardData {
  metrics: AdminMetrics;
  listings: CattleListing[];
  isDemo?: boolean;
}

/**
 * Administrative action to archive/unpublish any flagged listing.
 * Verifies caller administrator privileges on the server and relies on PostgreSQL RLS.
 */
export async function archiveListingByAdminAction(
  listingId: string
): Promise<ActionResponse> {
  if (!listingId || typeof listingId !== "string") {
    return {
      success: false,
      error: "Invalid listing ID.",
    };
  }

  const supabase = await createClient();

  const {
    data: { user },
  } = await supabase.auth.getUser();

  if (!user) {
    return {
      success: false,
      error: "Authentication required.",
    };
  }

  // Verify administrator privileges strictly on the server
  let isAdmin = user.app_metadata?.role === "admin";
  if (!isAdmin) {
    const { data: profile } = await supabase
      .from("profiles")
      .select("role")
      .eq("id", user.id)
      .single();

    isAdmin = profile?.role === "admin";
  }

  if (!isAdmin) {
    return {
      success: false,
      error: "Unauthorized: Administrator privileges required.",
    };
  }

  // Update status to 'archived' and verify row modification under RLS
  const { data: updatedRows, error } = await supabase
    .from("cattle_listings")
    .update({ status: "archived" })
    .eq("id", listingId)
    .select("id");

  if (error) {
    return {
      success: false,
      error: error.message,
    };
  }

  if (!updatedRows || updatedRows.length === 0) {
    return {
      success: false,
      error: "Listing could not be archived. Database authorization policy denied the update or listing does not exist.",
    };
  }

  revalidatePath("/");
  revalidatePath(`/listings/${listingId}`);
  revalidatePath("/admin");
  revalidatePath("/dashboard");
  return {
    success: true,
  };
}

/**
 * Fetches overview metrics and all listings for the admin moderation deck.
 * Strictly verifies admin privileges before querying sensitive operational data.
 */
export async function getAdminDashboardDataAction(): Promise<ActionResponse<AdminDashboardData>> {
  const supabase = await createClient();

  const {
    data: { user },
  } = await supabase.auth.getUser();

  if (!user) {
    return {
      success: false,
      error: "Authentication required.",
    };
  }

  // Verify administrator privileges
  let isAdmin = user.app_metadata?.role === "admin";
  if (!isAdmin) {
    const { data: profile } = await supabase
      .from("profiles")
      .select("role")
      .eq("id", user.id)
      .single();

    isAdmin = profile?.role === "admin";
  }

  if (!isAdmin) {
    return {
      success: false,
      error: "Unauthorized: Administrator privileges required.",
    };
  }

  try {
    // 1. Fetch all listings across all statuses (admin RLS permits this)
    const { data: listingsData, error: listingsError } = await supabase
      .from("cattle_listings")
      .select(`
        *,
        seller:public_profiles(*)
      `)
      .order("created_at", { ascending: false });

    // 2. Fetch total registered users count (admin RLS permits selecting from profiles)
    const { count: usersCount } = await supabase
      .from("profiles")
      .select("*", { count: "exact", head: true });

    let listings = (listingsData as CattleListing[]) || [];
    let isDemo = false;

    // Gracefully use demo listings if remote database table is currently empty
    if (!listingsError && listings.length === 0) {
      listings = DEMO_LISTINGS;
      isDemo = true;
    } else if (listingsError) {
      listings = DEMO_LISTINGS;
      isDemo = true;
    }

    const totalListings = listings.length;
    const publishedListings = listings.filter((l) => l.status === "published").length;
    const soldListings = listings.filter((l) => l.status === "sold").length;
    const archivedListings = listings.filter((l) => l.status === "archived").length;
    const totalUsers = usersCount ?? new Set(listings.map((l) => l.seller_id)).size;

    return {
      success: true,
      data: {
        metrics: {
          totalListings,
          publishedListings,
          soldListings,
          archivedListings,
          totalUsers,
        },
        listings,
        isDemo,
      },
    };
  } catch (err) {
    return {
      success: false,
      error: err instanceof Error ? err.message : "Failed to load admin data.",
    };
  }
}
