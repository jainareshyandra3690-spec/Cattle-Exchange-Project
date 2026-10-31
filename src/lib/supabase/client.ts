import { createBrowserClient } from "@supabase/ssr";

/**
 * Creates a Supabase client for use in browser / Client Components.
 * Throws a descriptive configuration error if required environment variables are missing.
 */
export function createClient() {
  const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL;
  const supabaseAnonKey = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY;

  if (!supabaseUrl || !supabaseAnonKey) {
    throw new Error(
      "Missing Supabase browser environment variables. Ensure NEXT_PUBLIC_SUPABASE_URL and NEXT_PUBLIC_SUPABASE_ANON_KEY are set."
    );
  }

  return createBrowserClient(supabaseUrl, supabaseAnonKey);
}

