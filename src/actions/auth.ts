"use server";

import { createClient } from "@/lib/supabase/server";
import { SignUpSchema, SignInSchema } from "@/lib/validations/auth";
import { revalidatePath } from "next/cache";
import { redirect } from "next/navigation";

export interface ActionResponse<T = unknown> {
  success: boolean;
  data?: T;
  error?: string;
  fieldErrors?: Record<string, string[]>;
}

export async function signUpAction(formData: FormData): Promise<ActionResponse> {
  const rawData = {
    email: formData.get("email"),
    password: formData.get("password"),
    full_name: formData.get("full_name"),
    phone: formData.get("phone"),
    district: formData.get("district"),
    state: formData.get("state"),
  };

  const validation = SignUpSchema.safeParse(rawData);
  if (!validation.success) {
    return {
      success: false,
      error: "Please correct the errors in the form.",
      fieldErrors: validation.error.flatten().fieldErrors,
    };
  }

  const { email, password, full_name, phone, district, state } = validation.data;
  const supabase = await createClient();

  const { data, error } = await supabase.auth.signUp({
    email,
    password,
    options: {
      data: {
        full_name,
        phone,
        district,
        state,
      },
    },
  });

  if (error) {
    return {
      success: false,
      error: error.message,
    };
  }

  revalidatePath("/", "layout");
  return {
    success: true,
    data: { userId: data.user?.id },
  };
}

export async function signInAction(formData: FormData): Promise<ActionResponse> {
  const rawData = {
    email: formData.get("email"),
    password: formData.get("password"),
  };

  const validation = SignInSchema.safeParse(rawData);
  if (!validation.success) {
    return {
      success: false,
      error: "Please enter your email and password.",
      fieldErrors: validation.error.flatten().fieldErrors,
    };
  }

  const { email, password } = validation.data;
  const supabase = await createClient();

  const { error } = await supabase.auth.signInWithPassword({
    email,
    password,
  });

  if (error) {
    return {
      success: false,
      error: error.message,
    };
  }

  revalidatePath("/", "layout");
  return {
    success: true,
  };
}

export async function signOutAction(): Promise<void> {
  const supabase = await createClient();
  await supabase.auth.signOut();
  revalidatePath("/", "layout");
  redirect("/");
}

export async function getCurrentUserAction() {
  try {
    const supabase = await createClient();
    const {
      data: { user },
    } = await supabase.auth.getUser();

    if (!user) return null;

    const { data: profile } = await supabase
      .from("profiles")
      .select("*")
      .eq("id", user.id)
      .single();

    return {
      user,
      profile,
    };
  } catch {
    return null;
  }
}
