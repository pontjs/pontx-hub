import { describe, expect, it } from "vitest";
import { createPreview, prepareRequest } from "./request.server";
import {
  createConfirmationToken,
  verifyConfirmationToken
} from "./token.server";

describe("Playground request preparation", () => {
  it("resolves declared path parameters and redacts credentials", () => {
    const input = {
      apiSlug: "github",
      operationSlug: "get-repository",
      serverId: "production",
      path: { owner: "octocat", repo: "Hello-World" },
      query: {},
      headers: {},
      auth: {
        type: "bearer" as const,
        schemeId: "bearer",
        token: "github_pat_secret"
      }
    };
    const prepared = prepareRequest(input);
    const preview = createPreview(input);

    expect(prepared.url).toBe(
      "https://api.github.com/repos/octocat/Hello-World"
    );
    expect(prepared.headers.Authorization).toBe("Bearer github_pat_secret");
    expect(preview.headers.Authorization).toBe("Bearer ••••••••");
    expect(preview.curl).not.toContain("github_pat_secret");
    expect(preview.requiresConfirmation).toBe(false);
  });

  it("rejects undeclared parameters", () => {
    expect(() =>
      prepareRequest({
        apiSlug: "github",
        operationSlug: "get-repository",
        serverId: "production",
        path: { owner: "octocat", repo: "Hello-World" },
        query: { admin: true },
        headers: {}
      })
    ).toThrow("Undeclared query parameter");
  });

  it("binds confirmation to the exact write request", () => {
    const original = prepareRequest({
      apiSlug: "github",
      operationSlug: "create-issue",
      serverId: "production",
      path: { owner: "octocat", repo: "Hello-World" },
      query: {},
      headers: {},
      body: { title: "A bug" }
    });
    const changed = prepareRequest({
      apiSlug: "github",
      operationSlug: "create-issue",
      serverId: "production",
      path: { owner: "octocat", repo: "Hello-World" },
      query: {},
      headers: {},
      body: { title: "A different bug" }
    });
    const token = createConfirmationToken(original);

    expect(verifyConfirmationToken(token, original)).toBe(true);
    expect(verifyConfirmationToken(token, changed)).toBe(false);
  });
});
