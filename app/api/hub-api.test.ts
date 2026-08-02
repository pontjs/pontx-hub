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
      "dida365",
      "frankfurter"
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
          type: "bearer",
          schemeId: "BearerAuth",
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
