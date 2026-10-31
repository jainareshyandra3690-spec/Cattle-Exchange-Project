"use server";

import { createClient } from "@/lib/supabase/server";
import { CattleListingSchema } from "@/lib/validations/listing";
import { revalidatePath } from "next/cache";
import type { ActionResponse } from "./auth";
import type { CattleListing, ListingStatus } from "@/types/database";
import { DEMO_LISTINGS } from "@/lib/demo-data";

export async function createListingAction(
  rawData: unknown,
  imagePaths: string[] = []
): Promise<ActionResponse<{ listingId: string }>> {
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();

  if (!user) {
    return {
      success: false,
      error: "You must be signed in to create a cattle listing.",
    };
  }

  const validation = CattleListingSchema.safeParse(rawData);
  if (!validation.success) {
    return {
      success: false,
      error: "Please correct the errors in the listing form.",
      fieldErrors: validation.error.flatten().fieldErrors,
    };
  }

  const listingData = validation.data;

  // Insert cattle listing
  const { data: listing, error: listingError } = await supabase
    .from("cattle_listings")
    .insert({
      seller_id: user.id,
      title: listingData.title,
      animal_type: listingData.animal_type,
      breed: listingData.breed,
      gender: listingData.gender,
      age_months: listingData.age_months ?? null,
      milk_yield_liters_per_day: listingData.milk_yield_liters_per_day ?? null,
      price_inr: listingData.price_inr,
      description: listingData.description,
      district: listingData.district,
      state: listingData.state,
      status: listingData.status,
    })
    .select("id")
    .single();

  if (listingError || !listing) {
    return {
      success: false,
      error: listingError?.message || "Failed to create listing.",
    };
  }

  // Insert image metadata (up to 5 images, sort_order 0-4)
  if (imagePaths.length > 0) {
    const validImageRows = imagePaths.slice(0, 5).map((storagePath, idx) => ({
      listing_id: listing.id,
      storage_path: storagePath,
      sort_order: idx,
    }));

    const { error: imageError } = await supabase
      .from("listing_images")
      .insert(validImageRows);

    if (imageError) {
      console.error("Warning: Failed to save some listing images:", imageError);
    }
  }

  revalidatePath("/");
  revalidatePath("/dashboard");
  return {
    success: true,
    data: { listingId: listing.id },
  };
}

export async function updateListingAction(
  listingId: string,
  rawData: unknown,
  imagePaths?: string[]
): Promise<ActionResponse<{ listingId: string }>> {
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();

  if (!user) {
    return {
      success: false,
      error: "You must be signed in to update a listing.",
    };
  }

  const validation = CattleListingSchema.safeParse(rawData);
  if (!validation.success) {
    return {
      success: false,
      error: "Please correct the errors in the listing form.",
      fieldErrors: validation.error.flatten().fieldErrors,
    };
  }

  const listingData = validation.data;

  const { data: updatedRows, error } = await supabase
    .from("cattle_listings")
    .update({
      title: listingData.title,
      animal_type: listingData.animal_type,
      breed: listingData.breed,
      gender: listingData.gender,
      age_months: listingData.age_months ?? null,
      milk_yield_liters_per_day: listingData.milk_yield_liters_per_day ?? null,
      price_inr: listingData.price_inr,
      description: listingData.description,
      district: listingData.district,
      state: listingData.state,
      status: listingData.status,
    })
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
      error: "Listing not found or you do not have permission to update it.",
    };
  }

  if (imagePaths !== undefined) {
    // Fetch currently stored images to determine which images are being removed
    const { data: existingImages } = await supabase
      .from("listing_images")
      .select("storage_path")
      .eq("listing_id", listingId);

    const existingPaths = (existingImages || []).map(
      (img: { storage_path: string }) => img.storage_path
    );
    const newPathsSet = new Set(imagePaths);
    const removedPaths = existingPaths.filter((path) => !newPathsSet.has(path));

    // Clear existing image records
    const { error: deleteImagesError } = await supabase
      .from("listing_images")
      .delete()
      .eq("listing_id", listingId);

    if (deleteImagesError) {
      console.error(
        "Warning: Failed to clear old listing images:",
        deleteImagesError
      );
    }

    // Insert updated images (up to 5 images, sort_order 0-4)
    if (imagePaths.length > 0) {
      const validImageRows = imagePaths.slice(0, 5).map((storagePath, idx) => ({
        listing_id: listingId,
        storage_path: storagePath,
        sort_order: idx,
      }));

      const { error: insertImagesError } = await supabase
        .from("listing_images")
        .insert(validImageRows);

      if (insertImagesError) {
        console.error(
          "Warning: Failed to save updated listing images:",
          insertImagesError
        );
      }
    }

    // Physical storage cleanup for removed photos
    if (removedPaths.length > 0) {
      try {
        const { error: storageError } = await supabase.storage
          .from("listing-images")
          .remove(removedPaths);

        if (storageError) {
          throw storageError;
        }
      } catch (err) {
        console.error(
          "Direct storage removal for updated listing failed; enqueueing to storage_cleanup_queue:",
          err
        );
        try {
          const queueRows = removedPaths.map((p) => ({
            storage_path: p,
            bucket_id: "listing-images",
            retry_count: 0,
            last_error:
              err instanceof Error ? err.message : "Storage API error",
          }));
          await supabase.from("storage_cleanup_queue").insert(queueRows);
        } catch (queueErr) {
          console.error(
            "Critical: Could not enqueue removed storage paths:",
            queueErr
          );
        }
      }
    }
  }

  revalidatePath("/");
  revalidatePath(`/listings/${listingId}`);
  revalidatePath(`/listings/${listingId}/edit`);
  revalidatePath("/dashboard");
  return {
    success: true,
    data: { listingId },
  };
}

export async function updateListingStatusAction(
  listingId: string,
  newStatus: ListingStatus
): Promise<ActionResponse> {
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();

  if (!user) {
    return {
      success: false,
      error: "You must be signed in to update listing status.",
    };
  }

  const { error } = await supabase
    .from("cattle_listings")
    .update({ status: newStatus })
    .eq("id", listingId);

  if (error) {
    return {
      success: false,
      error: error.message,
    };
  }

  revalidatePath("/");
  revalidatePath(`/listings/${listingId}`);
  revalidatePath("/dashboard");
  return {
    success: true,
  };
}

export async function deleteListingAction(listingId: string): Promise<ActionResponse> {
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();

  if (!user) {
    return {
      success: false,
      error: "You must be signed in to delete a listing.",
    };
  }

  // 1. Fetch associated image paths before deleting metadata
  const { data: images } = await supabase
    .from("listing_images")
    .select("storage_path")
    .eq("listing_id", listingId);

  const pathsToDelete = images?.map((img) => img.storage_path) || [];

  // 2. Delete the listing record (cascades to listing_images rows)
  const { error: dbError } = await supabase
    .from("cattle_listings")
    .delete()
    .eq("id", listingId);

  if (dbError) {
    return {
      success: false,
      error: dbError.message,
    };
  }

  // 3. Decoupled physical binary cleanup in Supabase Storage with resilient retry queue fallback
  if (pathsToDelete.length > 0) {
    try {
      const { error: storageError } = await supabase.storage
        .from("listing-images")
        .remove(pathsToDelete);

      if (storageError) {
        throw storageError;
      }
    } catch (err) {
      console.error(
        "Direct storage removal failed; enqueueing to storage_cleanup_queue:",
        err
      );
      // Fallback: enqueue failed paths into storage_cleanup_queue for background retry
      try {
        const queueRows = pathsToDelete.map((p) => ({
          storage_path: p,
          bucket_id: "listing-images",
          retry_count: 0,
          last_error: err instanceof Error ? err.message : "Storage API error",
        }));
        await supabase.from("storage_cleanup_queue").insert(queueRows);
      } catch (queueErr) {
        console.error("Critical: Could not enqueue failed storage paths:", queueErr);
      }
    }
  }

  revalidatePath("/");
  revalidatePath("/dashboard");
  return {
    success: true,
  };
}

export async function getListingsAction(filters?: {
  animal_type?: string;
  state?: string;
  district?: string;
  min_price?: number;
  max_price?: number;
  search?: string;
  seller_id?: string;
  status?: string;
  page?: number;
  limit?: number;
}) {
  try {
    const supabase = await createClient();
    const page = filters?.page || 1;
    const limit = filters?.limit || 12;
    const from = (page - 1) * limit;
    const to = from + limit - 1;

    let query = supabase
      .from("cattle_listings")
      .select(
        `
        *,
        images:listing_images(*),
        seller:public_profiles(*)
      `,
        { count: "exact" }
      );

    // Status filter (default to 'published' for public feed)
    if (filters?.status) {
      query = query.eq("status", filters.status);
    } else if (!filters?.seller_id) {
      query = query.eq("status", "published");
    }

    // Seller filter (e.g. for user's dashboard)
    if (filters?.seller_id) {
      query = query.eq("seller_id", filters.seller_id);
    }

    // Animal category filter
    if (filters?.animal_type && filters.animal_type !== "all") {
      query = query.eq("animal_type", filters.animal_type);
    }

    // Location filters
    if (filters?.state && filters.state !== "all") {
      query = query.eq("state", filters.state);
    }
    if (filters?.district && filters.district !== "all") {
      query = query.ilike("district", `%${filters.district}%`);
    }

    // Price range filters
    if (filters?.min_price) {
      query = query.gte("price_inr", filters.min_price);
    }
    if (filters?.max_price) {
      query = query.lte("price_inr", filters.max_price);
    }

    // Text search on breed or title
    if (filters?.search && filters.search.trim()) {
      const s = filters.search.trim();
      query = query.or(`title.ilike.%${s}%,breed.ilike.%${s}%`);
    }

    query = query.order("created_at", { ascending: false }).range(from, to);

    const { data, count, error } = await query;

    if (error) {
      console.error("Error fetching listings:", error);
      return { listings: [], total: 0, page: 1, totalPages: 0 };
    }

    return {
      listings: (data as CattleListing[]) || [],
      total: count || 0,
      page,
      totalPages: Math.ceil((count || 0) / limit),
    };
  } catch {
    return { listings: [], total: 0, page: 1, totalPages: 0 };
  }
}

export async function getListingByIdAction(listingId: string): Promise<CattleListing | null> {
  // Return matching demo listing if querying a fallback demo dataset item
  if (listingId.startsWith("demo-")) {
    const demo = DEMO_LISTINGS.find((l) => l.id === listingId);
    if (demo) return demo;
  }

  try {
    const supabase = await createClient();

    const { data, error } = await supabase
      .from("cattle_listings")
      .select(
        `
        *,
        images:listing_images(*),
        seller:public_profiles(*)
      `
      )
      .eq("id", listingId)
      .single();

    if (error || !data) {
      return DEMO_LISTINGS.find((l) => l.id === listingId) || null;
    }

    // Ensure images are sorted by sort_order ascending
    if (data.images && Array.isArray(data.images)) {
      data.images.sort(
        (a: { sort_order: number }, b: { sort_order: number }) =>
          a.sort_order - b.sort_order
      );
    }

    return data as CattleListing;
  } catch {
    return DEMO_LISTINGS.find((l) => l.id === listingId) || null;
  }
}
