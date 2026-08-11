import { describe, expect, it } from "vitest";
import { getCatalogOperation } from "~/lib/catalog/catalog.server";
import type { PlaygroundExecuteInput } from "~/lib/playground/schemas";
import {
  isSensitivePlaygroundField,
  sanitizePlaygroundHistoryRequest
} from "./playground-history.server";

function createTaskInput(overrides: Partial<PlaygroundExecuteInput> = {}): PlaygroundExecuteInput {
  const match = getCatalogOperation("dida365", "create-task");
  if (!match) throw new Error("Dida365 create-task fixture is missing");
  return {
    apiSlug: "dida365",
    operationSlug: "create-task",
    serverId: match.api.servers[0].id,
    path: {},
    query: {},
    headers: {},
    body: { title: "Review the API history" },
    auth: {
      type: "oauth2",
      schemeId: "OAuth2",
      token: "oauth-access-secret"
    },
    ...overrides
  };
}

describe("Playground account history sanitization", () => {
  it.each([
    "Authorization",
    "apiKey",
    "access_token",
    "refreshToken",
    "clientSecret",
    "password",
    "private-key",
    "session_cookie"
  ])("recognizes the sensitive field name %s", (name) => {
    expect(isSensitivePlaygroundField(name)).toBe(true);
  });

  it("keeps replayable inputs while removing credentials and nested secrets", () => {
    const snapshot = sanitizePlaygroundHistoryRequest(createTaskInput({
      body: {
        title: "Review the API history",
        owner: {
          name: "Pontx",
          accessToken: "nested-access-secret"
        },
        password: "body-password",
        labels: [{ name: "safe" }, { api_key: "nested-api-key", name: "kept" }]
      }
    }));

    expect(snapshot).toMatchObject({
      apiSlug: "dida365",
      operationSlug: "create-task",
      requestBody: {
        title: "Review the API history",
        owner: { name: "Pontx" },
        labels: [{ name: "safe" }, { name: "kept" }]
      },
      hasRequestBody: true
    });
    expect(snapshot?.omittedFields).toEqual(expect.arrayContaining([
      "body.owner.accessToken",
      "body.password",
      "body.labels[1].api_key"
    ]));
    expect(JSON.stringify(snapshot)).not.toContain("oauth-access-secret");
    expect(JSON.stringify(snapshot)).not.toContain("nested-access-secret");
    expect(JSON.stringify(snapshot)).not.toContain("body-password");
    expect(JSON.stringify(snapshot)).not.toContain("nested-api-key");
  });

  it("drops undeclared and oversized values instead of persisting partial input", () => {
    const snapshot = sanitizePlaygroundHistoryRequest(createTaskInput({
      query: { undeclared: "should-not-be-saved" },
      headers: { Authorization: "Bearer secret" },
      body: { title: "x".repeat(5000), safe: "kept" }
    }));

    expect(snapshot?.query).toEqual({});
    expect(snapshot?.headers).toEqual({});
    expect(snapshot?.requestBody).toEqual({ safe: "kept" });
    expect(snapshot?.omittedFields).toEqual(expect.arrayContaining([
      "query.undeclared",
      "header.Authorization",
      "body.title"
    ]));
    expect(JSON.stringify(snapshot)).not.toContain("should-not-be-saved");
    expect(JSON.stringify(snapshot)).not.toContain("Bearer secret");
  });
});
