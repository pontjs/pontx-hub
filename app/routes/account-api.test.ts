import { afterEach, describe, expect, it, vi } from "vitest";
import { action, loader } from "./account-api";
import { headers as apiDetailHeaders } from "./api-detail";
import { headers as catalogHeaders } from "./catalog";

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
      request: new Request("https://pontx.example.com/api/account/v1/favorites/endpoints")
    } as never);
    expect(response.status).toBe(404);
    expect(response.headers.get("Cache-Control")).toBe("private, no-store");
    await expect(response.json()).resolves.toEqual({ error: { code: "not_found" } });
  });

  it("fails closed when account configuration is incomplete", async () => {
    vi.stubEnv("PONTX_ACCOUNTS_ENABLED", "true");
    const response = await action({
      request: new Request("https://pontx.example.com/api/account/v1/favorites/endpoints/dida365/get-user-projects", {
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
      request: new Request("https://pontx.example.com/api/account/v1/favorites/endpoints/dida365/get-user-projects", {
        method: "PUT",
        headers: { Origin: "https://evil.example" }
      })
    } as never);
    expect(response.status).toBe(403);
    await expect(response.json()).resolves.toEqual({ error: { code: "invalid_origin" } });
  });

  it("rejects cross-origin history deletion before reading the session", async () => {
    readyEnvironment();
    const response = await action({
      request: new Request(
        "https://pontx.example.com/api/account/v1/playground/history/11111111-1111-4111-8111-111111111111",
        {
          method: "DELETE",
          headers: { Origin: "https://evil.example" }
        }
      )
    } as never);
    expect(response.status).toBe(403);
    await expect(response.json()).resolves.toEqual({ error: { code: "invalid_origin" } });
  });

  it("rejects unknown catalog Endpoints before reading the session", async () => {
    readyEnvironment();
    const response = await action({
      request: new Request("https://pontx.example.com/api/account/v1/favorites/endpoints/dida365/not-in-catalog", {
        method: "PUT",
        headers: { Origin: "https://pontx.example.com" }
      })
    } as never);
    expect(response.status).toBe(404);
    await expect(response.json()).resolves.toEqual({ error: { code: "unknown_endpoint" } });
  });

  it("does not expose the retired API-product favorite route", async () => {
    readyEnvironment();
    const response = await loader({
      request: new Request("https://pontx.example.com/api/account/v1/favorites/apis")
    } as never);
    expect(response.status).toBe(404);
    await expect(response.json()).resolves.toEqual({ error: { code: "not_found" } });
  });

  it("requires both Endpoint filters for an inline history query", async () => {
    readyEnvironment();
    const response = await loader({
      request: new Request(
        "https://pontx.example.com/api/account/v1/playground/history?apiSlug=dida365"
      )
    } as never);
    expect(response.status).toBe(422);
    await expect(response.json()).resolves.toEqual({
      error: { code: "invalid_history_filter" }
    });
  });

  it("rejects an unknown Endpoint history filter before reading the session", async () => {
    readyEnvironment();
    const response = await loader({
      request: new Request(
        "https://pontx.example.com/api/account/v1/playground/history" +
          "?apiSlug=dida365&operationSlug=not-in-catalog"
      )
    } as never);
    expect(response.status).toBe(404);
    await expect(response.json()).resolves.toEqual({
      error: { code: "unknown_endpoint" }
    });
  });

  it("disables shared response caching when personalized account data is enabled", () => {
    readyEnvironment();
    expect(apiDetailHeaders()).toEqual({ "Cache-Control": "private, no-store" });
    expect(catalogHeaders()).toEqual({ "Cache-Control": "private, no-store" });
  });
});
