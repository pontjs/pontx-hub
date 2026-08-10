import { afterEach, describe, expect, it, vi } from "vitest";
import { exchangeOAuthToken } from "./token.server";

vi.mock("~/lib/playground/network.server", () => ({ assertPublicHost: vi.fn() }));

afterEach(() => vi.unstubAllGlobals());

describe("OAuth token exchange", () => {
  it("uses the catalog token URL and client_secret_post without exposing the secret", async () => {
    const fetchMock = vi.fn().mockResolvedValue(new Response(JSON.stringify({
      access_token: "access-value",
      refresh_token: "refresh-value",
      expires_in: 3600,
      scope: "tasks:read"
    }), { status: 200, headers: { "content-type": "application/json" } }));
    vi.stubGlobal("fetch", fetchMock);
    const result = await exchangeOAuthToken({
      apiSlug: "dida365",
      schemeId: "OAuth2",
      grantType: "authorization_code",
      clientId: "client-id",
      clientSecret: "client-secret",
      code: "code",
      redirectUri: "https://pontx-hub.vercel.app/oauth/callback",
      scopes: ["tasks:read"]
    });
    expect(result).toMatchObject({ accessToken: "access-value", refreshToken: "refresh-value" });
    expect(fetchMock.mock.calls[0][0].toString()).toBe("https://dida365.com/oauth/token");
    const request = fetchMock.mock.calls[0][1];
    expect(request.headers.get("Authorization")).toBeNull();
    expect(request.body.toString()).toContain("client_secret=client-secret");
  });

  it("rejects scopes that are not declared by the approved flow", async () => {
    await expect(exchangeOAuthToken({
      apiSlug: "dida365", schemeId: "OAuth2", grantType: "authorization_code",
      clientId: "id", clientSecret: "secret", code: "code",
      redirectUri: "https://pontx-hub.vercel.app/oauth/callback", scopes: ["admin"]
    })).rejects.toThrow("not approved");
  });

  it("rejects grants absent from catalog metadata", async () => {
    await expect(exchangeOAuthToken({
      apiSlug: "dida365", schemeId: "OAuth2", grantType: "client_credentials",
      clientId: "id", clientSecret: "secret", scopes: []
    })).rejects.toThrow("not configured");
  });
});
