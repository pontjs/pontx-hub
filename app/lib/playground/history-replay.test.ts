import { describe, expect, it } from "vitest";
import { storedConfigForPlaygroundHistory } from "./history-replay";

describe("Playground history replay", () => {
  it("restores saved inputs while retaining only session-local authorization", () => {
    expect(storedConfigForPlaygroundHistory({
      serverUrl: "https://api.example.com/v1",
      pathValues: { projectId: 42 },
      queryValues: { completed: false, limit: 0 },
      headerValues: { "X-Trace": "trace-id" },
      requestBody: { title: "Replay me" },
      hasRequestBody: true
    }, {
      auth: { type: "oauth2", token: "session-only-token" }
    }, 1234)).toEqual({
      url: "https://api.example.com/v1",
      auth: { type: "oauth2", token: "session-only-token" },
      pathParams: { projectId: "42" },
      queryParams: { completed: "false", limit: "0" },
      headerParams: { "X-Trace": "trace-id" },
      requestBody: JSON.stringify({ title: "Replay me" }, null, 2),
      timestamp: 1234
    });
  });

  it("does not carry a stale body or credential from account history", () => {
    expect(storedConfigForPlaygroundHistory({
      serverUrl: "https://api.example.com",
      pathValues: {},
      queryValues: {},
      headerValues: {},
      requestBody: undefined,
      hasRequestBody: false
    }, undefined, 1234)).toEqual({
      url: "https://api.example.com",
      pathParams: {},
      queryParams: {},
      headerParams: {},
      timestamp: 1234
    });
  });
});
