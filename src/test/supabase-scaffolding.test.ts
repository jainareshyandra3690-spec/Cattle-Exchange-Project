import { describe, it, expect, beforeEach, afterEach } from "vitest";
import { createClient as createBrowserClient } from "@/lib/supabase/client";
import { createClient as createServerClient } from "@/lib/supabase/server";

describe("Supabase Client Configuration Scaffolding", () => {
  const originalUrl = process.env.NEXT_PUBLIC_SUPABASE_URL;
  const originalKey = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY;

  beforeEach(() => {
    delete process.env.NEXT_PUBLIC_SUPABASE_URL;
    delete process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY;
  });

  afterEach(() => {
    process.env.NEXT_PUBLIC_SUPABASE_URL = originalUrl;
    process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY = originalKey;
  });

  describe("Browser Client (client.ts)", () => {
    it("throws a clear descriptive error when environment variables are missing", () => {
      expect(() => createBrowserClient()).toThrowError(
        /Missing Supabase browser environment variables/i
      );
    });

    it("creates client instance when environment variables are configured", () => {
      process.env.NEXT_PUBLIC_SUPABASE_URL = "https://example.supabase.co";
      process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY = "dummy-anon-key-test-payload";

      const client = createBrowserClient();
      expect(client).toBeDefined();
      expect(typeof client.from).toBe("function");
      expect(typeof client.auth.getUser).toBe("function");
    });
  });

  describe("Server Client (server.ts)", () => {
    it("rejects with a clear descriptive error when environment variables are missing", async () => {
      await expect(createServerClient()).rejects.toThrowError(
        /Missing Supabase server environment variables/i
      );
    });
  });
});

