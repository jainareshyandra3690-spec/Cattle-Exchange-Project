export type AnimalType = "cow" | "buffalo" | "bull" | "calf" | "other";
export type Gender = "female" | "male";
export type ListingStatus = "draft" | "published" | "sold" | "archived";
export type UserRole = "user" | "admin";

export interface Profile {
  id: string;
  full_name: string;
  phone: string;
  phone_public: boolean;
  district: string;
  state: string;
  avatar_path: string | null;
  role: UserRole;
  created_at: string;
  updated_at: string;
}

export interface PublicProfile {
  id: string;
  full_name: string;
  district: string;
  state: string;
  avatar_path: string | null;
  created_at: string;
  phone_public: boolean;
  phone: string | null; // Redacted to null unless phone_public = true or caller is owner/admin
}

export interface CattleListing {
  id: string;
  seller_id: string;
  title: string;
  animal_type: AnimalType;
  breed: string;
  gender: Gender;
  age_months: number | null;
  milk_yield_liters_per_day: number | null;
  price_inr: number;
  description: string;
  district: string;
  state: string;
  status: ListingStatus;
  created_at: string;
  updated_at: string;
  images?: ListingImage[];
  seller?: PublicProfile;
}

export interface ListingImage {
  id: string;
  listing_id: string;
  storage_path: string;
  sort_order: number;
  created_at: string;
}

export interface StorageCleanupQueueItem {
  id: string;
  storage_path: string;
  bucket_id: string;
  retry_count: number;
  last_error: string | null;
  created_at: string;
  next_retry_at: string;
}

