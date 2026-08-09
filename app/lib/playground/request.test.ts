import { describe, expect, it } from "vitest";
import { createPreview, prepareRequest } from "./request.server";
import {
  createConfirmationToken,
  verifyConfirmationToken
} from "./token.server";

describe("Playground request preparation", () => {
  it("resolves declared path parameters and redacts credentials", () => {
    const input = {
      apiSlug: "dida365",
      operationSlug: "get-task-by-project-id-and-task-id",
      serverId: "default",
      path: { projectId: "project-1", taskId: "task-1" },
      query: {},
      headers: {},
      auth: {
        type: "oauth2" as const,
        schemeId: "OAuth2",
        token: "dida_secret"
      }
    };
    const prepared = prepareRequest(input);
    const preview = createPreview(input);

    expect(prepared.url).toBe(
      "https://api.dida365.com/open/v1/project/project-1/task/task-1"
    );
    expect(prepared.headers.Authorization).toBe("Bearer dida_secret");
    expect(preview.headers.Authorization).toBe("Bearer ••••••••");
    expect(preview.curl).not.toContain("dida_secret");
    expect(preview.requiresConfirmation).toBe(false);
  });

  it("rejects undeclared parameters", () => {
    expect(() =>
      prepareRequest({
        apiSlug: "dida365",
        operationSlug: "get-task-by-project-id-and-task-id",
        serverId: "default",
        path: { projectId: "project-1", taskId: "task-1" },
        query: { admin: true },
        headers: {}
      })
    ).toThrow("Undeclared query parameter");
  });

  it("preserves a path prefix from the approved server URL", () => {
    const prepared = prepareRequest({
      apiSlug: "frankfurter",
      operationSlug: "get-latest-rates",
      serverId: "default",
      path: {},
      query: { amount: 100, base: "USD", symbols: "GBP,JPY" },
      headers: {}
    });

    expect(prepared.url).toBe(
      "https://api.frankfurter.dev/v1/latest?amount=100&base=USD&symbols=GBP%2CJPY"
    );
  });

  it("binds confirmation to the exact write request", () => {
    const original = prepareRequest({
      apiSlug: "dida365",
      operationSlug: "update-task",
      serverId: "default",
      path: { taskId: "task-1" },
      query: {},
      headers: {},
      body: { dueDate: "2026-07-26T00:00:00+0000" }
    });
    const changed = prepareRequest({
      apiSlug: "dida365",
      operationSlug: "update-task",
      serverId: "default",
      path: { taskId: "task-1" },
      query: {},
      headers: {},
      body: { dueDate: "2026-07-27T00:00:00+0000" }
    });
    const token = createConfirmationToken(original);

    expect(verifyConfirmationToken(token, original)).toBe(true);
    expect(verifyConfirmationToken(token, changed)).toBe(false);
  });
});
