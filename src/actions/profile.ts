"use server";

import { createClient } from "@/lib/supabase/server";
import { ProfileUpdateSchema } from "@/lib/validations/profile";
import { revalidatePath } from "next/cache";
import type { ActionResponse } from "./auth";

export async function updateProfileAction(formData: FormData): Promise<ActionResponse> {
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();

  if (!user) {
    return {
      success: false,
      error: "You must be signed in to update your profile.",
    };
  }

  const rawData = {
    full_name: formData.get("full_name"),
    phone: formData.get("phone"),
    phone_public: formData.get("phone_public") === "true" || formData.get("phone_public") === "on",
    district: formData.get("district"),
    state: formData.get("state"),
  };

  const validation = ProfileUpdateSchema.safeParse(rawData);
  if (!validation.success) {
    return {
      success: false,
      error: "Please correct the errors in the profile form.",
      fieldErrors: validation.error.flatten().fieldErrors,
    };
  }

  const { full_name, phone, phone_public, district, state } = validation.data;

  const { error } = await supabase
    .from("profiles")
    .update({
      full_name,
      phone,
      phone_public,
      district,
      state,
    })
    .eq("id", user.id);

  if (error) {
    return {
      success: false,
      error: error.message,
    };
  }

  revalidatePath("/dashboard");
  revalidatePath("/profile");
  return {
    success: true,
  };
}

export async function getPublicProfileAction(userId: string) {
  const supabase = await createClient();
  const { data, error } = await supabase
    .from("public_profiles")
    .select("*")
    .eq("id", userId)
    .single();

  if (error) return null;
  return data;
}

