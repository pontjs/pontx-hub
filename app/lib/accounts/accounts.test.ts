import { describe, expect, it } from "vitest";
import { readAccountsConfiguration } from "./config.server";
import { safeAccountReturnTo } from "./return-to";
import { removeIdentityProviderTokens } from "./security";

function readyEnvironment(overrides: NodeJS.ProcessEnv = {}): NodeJS.ProcessEnv {
  return {
    PONTX_ACCOUNTS_ENABLED: "true",
    DATABASE_URL: "postgresql://example.invalid/pontx",
    BETTER_AUTH_SECRET: "a-secret-with-at-least-thirty-two-characters",
    BETTER_AUTH_URL: "https://pontx.example.com/auth/path",
    GITHUB_CLIENT_ID: "github-client",
    GITHUB_CLIENT_SECRET: "github-secret",
    ...overrides
  };
}

describe("account configuration", () => {
  it("is disabled unless explicitly enabled", () => {
    expect(readAccountsConfiguration({})).toEqual({ status: "disabled" });
    expect(readAccountsConfiguration({ PONTX_ACCOUNTS_ENABLED: "TRUE" })).toEqual({
      status: "disabled"
    });
  });

  it("fails closed when required values are absent or malformed", () => {
    const missing = readAccountsConfiguration({ PONTX_ACCOUNTS_ENABLED: "true" });
    expect(missing.status).toBe("invalid");
    if (missing.status === "invalid") {
      expect(missing.missing).toContain("DATABASE_URL");
      expect(missing.missing).toContain("BETTER_AUTH_SECRET");
    }

    const malformed = readAccountsConfiguration(readyEnvironment({
      BETTER_AUTH_SECRET: "short",
      BETTER_AUTH_URL: "not-a-url"
    }));
    expect(malformed.status).toBe("invalid");
    if (malformed.status === "invalid") {
      expect(malformed.missing).toContain("BETTER_AUTH_SECRET>=32_chars");
      expect(malformed.missing).toContain("BETTER_AUTH_URL(valid_url)");
    }
  });

  it("normalizes and deduplicates trusted origins", () => {
    const configuration = readAccountsConfiguration(readyEnvironment({
      PONTX_AUTH_TRUSTED_ORIGINS:
        "https://preview.example.com/path,invalid,https://pontx.example.com"
    }));
    expect(configuration.status).toBe("ready");
    if (configuration.status === "ready") {
      expect(configuration.trustedOrigins).toEqual([
        "https://pontx.example.com",
        "https://preview.example.com"
      ]);
    }
  });
});

describe("account navigation safety", () => {
  it("keeps safe same-origin paths including query and fragment", () => {
    expect(safeAccountReturnTo("/zh/apis/dida365?q=task#response", "zh")).toBe(
      "/zh/apis/dida365?q=task#response"
    );
  });

  it("rejects external and protocol-relative return URLs", () => {
    expect(safeAccountReturnTo("https://evil.example/path", "en")).toBe("/en");
    expect(safeAccountReturnTo("//evil.example/path", "zh")).toBe("/zh");
    expect(safeAccountReturnTo("javascript:alert(1)", "en")).toBe("/en");
  });
});

describe("identity provider token persistence", () => {
  it("removes provider tokens while retaining the identity mapping", () => {
    const sanitized = removeIdentityProviderTokens({
      id: "account-id",
      providerId: "github",
      accountId: "github-user-id",
      accessToken: "access-secret",
      refreshToken: "refresh-secret",
      idToken: "identity-secret",
      accessTokenExpiresAt: new Date(),
      refreshTokenExpiresAt: new Date()
    });

    expect(sanitized).toMatchObject({
      id: "account-id",
      providerId: "github",
      accountId: "github-user-id",
      accessToken: null,
      refreshToken: null,
      idToken: null,
      accessTokenExpiresAt: null,
      refreshTokenExpiresAt: null
    });
    expect(JSON.stringify(sanitized)).not.toContain("secret");
  });
});
