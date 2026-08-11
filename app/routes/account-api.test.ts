import { afterEach, describe, expect, it, vi } from "vitest";
import { action, loader } from "./account-api";
import { headers as apiDetailHeaders } from "./api-detail";

function readyEnvironment() {
  vi.stubEnv("PONTX_ACCOUNTS_ENABLED", "true");
  vi.stubEnv("DATABASE_URL", "postgresql://example.invalid/pontx");
  vi.stubEnv("BETTER_AUTH_SECRET", "a-secret-with-at-least-thirty-two-characters");
  vi.stubEnv("BETTER_AUTH_URL", "https://pontx.example.com");
  vi.stubEnv("GITHUB_CLIENT_ID", "github-client");
  vi.stubEnv("GITHUB_CLIENT_SECRET", "github-secret");
}

afterEach(() => vi.unstubAllEnvs());

describe("private account API", () => {
  it("is hidden while accounts are disabled", async () => {
    vi.stubEnv("PONTX_ACCOUNTS_ENABLED", "false");
    const response = await loader({
      request: new Request("https://pontx.example.com/api/account/v1/favorites/apis")
    } as never);
    expect(response.status).toBe(404);
    await expect(response.json()).resolves.toEqual({ error: { code: "not_found" } });
  });

  it("fails closed when account configuration is incomplete", async () => {
    vi.stubEnv("PONTX_ACCOUNTS_ENABLED", "true");
    const response = await action({
      request: new Request("https://pontx.example.com/api/account/v1/favorites/apis/dida365", {
        method: "PUT",
        headers: { Origin: "https://pontx.example.com" }
      })
    } as never);
    expect(response.status).toBe(503);
    await expect(response.json()).resolves.toEqual({ error: { code: "accounts_unavailable" } });
  });

  it("rejects cross-origin mutations before reading the session", async () => {
    readyEnvironment();
    const response = await action({
      request: new Request("https://pontx.example.com/api/account/v1/favorites/apis/dida365", {
        method: "PUT",
        headers: { Origin: "https://evil.example" }
      })
    } as never);
    expect(response.status).toBe(403);
    await expect(response.json()).resolves.toEqual({ error: { code: "invalid_origin" } });
  });

  it("rejects unknown catalog API slugs before reading the session", async () => {
    readyEnvironment();
    const response = await action({
      request: new Request("https://pontx.example.com/api/account/v1/favorites/apis/not-in-catalog", {
        method: "PUT",
        headers: { Origin: "https://pontx.example.com" }
      })
    } as never);
    expect(response.status).toBe(404);
    await expect(response.json()).resolves.toEqual({ error: { code: "unknown_api" } });
  });

  it("disables shared response caching when personalized account data is enabled", () => {
    readyEnvironment();
    expect(apiDetailHeaders()).toEqual({ "Cache-Control": "private, no-store" });
  });
});
