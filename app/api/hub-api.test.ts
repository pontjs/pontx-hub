import { describe, expect, it } from "vitest";
import { hubApi } from "./hub-api.server";

describe("Hub API", () => {
  it("returns a versioned catalog with an ETag", async () => {
    const response = await hubApi.request("/api/v1/catalog");
    const payload = await response.json();
    expect(response.status).toBe(200);
    expect(response.headers.get("etag")).toBeTruthy();
    expect(payload.version).toBe("v1");
    expect(payload.data.map((api: { slug: string }) => api.slug).sort()).toEqual([
      "cnbc-market-data",
      "dida365",
      "eastmoney-funds",
      "frankfurter",
      "i3investor-sgx",
      "massive",
      "sina-finance",
      "stooq",
      "tencent-finance",
      "yahoo-finance"
    ]);
  });

  it("returns a machine-readable 404", async () => {
    const response = await hubApi.request("/api/v1/specs/missing");
    const payload = await response.json();
    expect(response.status).toBe(404);
    expect(payload.error.code).toBe("not_found");
    expect(payload.error.requestId).toBeTruthy();
  });

  it("globally searches APIs, endpoints, and schemas through v2", async () => {
    const response = await hubApi.request(
      "/api/v2/search?q=%E4%BB%BB%E5%8A%A1&locale=zh&limit=50"
    );
    const payload = await response.json();
    expect(response.status).toBe(200);
    expect(payload.version).toBe("v2");
    expect(payload.data.counts.api).toBeGreaterThan(0);
    expect(payload.data.counts.endpoint).toBeGreaterThan(0);
    expect(payload.data.counts.schema).toBeGreaterThan(0);
    expect(payload.data.items.some((item: { id: string }) => item.id === "schema:dida365/Task")).toBe(true);
  });

  it("exposes hybrid semantic matches from request and response metadata", async () => {
    const response = await hubApi.request(
      "/api/v2/search?q=%E6%96%B0%E5%A2%9E%E5%BE%85%E5%8A%9E&locale=zh&types=endpoint"
    );
    const payload = await response.json();
    expect(response.status).toBe(200);
    expect(payload.data.strategy).toBe("hybrid-semantic");
    expect(payload.data.semanticVersion).toBe("pontx-multilingual-v1");
    expect(payload.data.items[0].id).toBe("endpoint:dida365/create-task");
    expect(payload.data.items[0].match.mode).toBe("semantic");
  });

  it("filters global search resource types and validates query options", async () => {
    const filtered = await hubApi.request(
      "/api/v2/search?q=projectId&types=schema&locale=en"
    );
    const filteredPayload = await filtered.json();
    expect(filtered.status).toBe(200);
    expect(filteredPayload.data.items.every((item: { kind: string }) => item.kind === "schema")).toBe(true);

    const invalid = await hubApi.request(
      "/api/v2/search?q=task&types=unknown"
    );
    expect(invalid.status).toBe(422);
    expect((await invalid.json()).error.code).toBe("invalid_types");
  });

  it("returns a versioned schema detail", async () => {
    const response = await hubApi.request(
      "/api/v2/specs/dida365/schemas/TaskCreate"
    );
    const payload = await response.json();
    expect(response.status).toBe(200);
    expect(payload.version).toBe("v2");
    expect(payload.data.schema.name).toBe("TaskCreate");
  });

  it("serves the validated universal Agent Skill bundle", async () => {
    const response = await hubApi.request("/api/v1/skill");
    const payload = await response.json();
    expect(response.status).toBe(200);
    expect(payload.data.name).toBe("pontx-hub");
    expect(payload.data.files["SKILL.md"]).toContain("pontx-hub preview");
    expect(payload.data.files["SKILL.md"]).toContain("--type schema");
    expect(payload.data.files["references/auth-and-safety.md"]).toBeTruthy();
  });

  it("previews a request without exposing its bearer token", async () => {
    const response = await hubApi.request("/api/v1/playground/preview", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        apiSlug: "dida365",
        operationSlug: "get-task-by-project-id-and-task-id",
        serverId: "default",
        path: { projectId: "project-1", taskId: "task-1" },
        auth: {
          type: "oauth2",
          schemeId: "OAuth2",
          token: "secret-token"
        }
      })
    });
    const text = await response.text();
    expect(response.status).toBe(200);
    expect(text).not.toContain("secret-token");
    expect(text).toContain("Bearer ••••••••");
  });
});
