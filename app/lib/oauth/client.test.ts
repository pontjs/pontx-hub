import { describe, expect, it } from "vitest";
import { randomOAuthValue } from "./client";

describe("OAuth browser helpers", () => {
  it("creates URL-safe high-entropy state and verifier values", () => {
    const value = randomOAuthValue(64);
    expect(value.length).toBeGreaterThanOrEqual(80);
    expect(value).toMatch(/^[A-Za-z0-9_-]+$/);
  });
});
