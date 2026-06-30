import "@testing-library/jest-dom";
import { afterEach, vi } from "vitest";
import { cleanup } from "@testing-library/react";

// Cleanup DOM after each test
afterEach(() => {
  cleanup();
});

// Mock environment variables if needed
vi.stubEnv("VITE_SUPABASE_URL", "https://mock.supabase.co");
vi.stubEnv("VITE_SUPABASE_PUBLISHABLE_KEY", "mock-key");
