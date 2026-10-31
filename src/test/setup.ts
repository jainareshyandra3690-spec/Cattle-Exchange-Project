import "@testing-library/jest-dom/vitest";
import { vi } from "vitest";

// Mock Next.js 16 connection() function so Server Components can be rendered in unit tests
vi.mock("next/server", async (importOriginal) => {
  const actual = await importOriginal<typeof import("next/server")>();
  return {
    ...actual,
    connection: vi.fn().mockResolvedValue(undefined),
  };
});

