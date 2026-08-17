import { describe, expect, it } from "vitest";
import { loader } from "./api-catalog";

function load(method = "GET") {
  return loader({
    request: new Request("https://pontx.dev/.well-known/api-catalog", { method })
  } as never);
}

describe("RFC 9727 API Catalog", () => {
  it("links Hub API services to machine descriptions and human documentation", async () => {
    const response = load();
    const document = await response.json() as {
      linkset: Array<Record<string, Array<{ href: string }> | string>>;
    };

    expect(response.headers.get("Content-Type")).toBe(
      'application/linkset+json; profile="https://www.rfc-editor.org/info/rfc9727"'
    );
    expect(response.headers.get("Link")).toContain('rel="api-catalog"');
    expect(document.linkset.map((entry) => entry.anchor)).toEqual([
      "https://pontx.dev/api/v2/products",
      "https://pontx.dev/api/v2/search"
    ]);
    for (const entry of document.linkset) {
      expect(entry["service-desc"]).toEqual([expect.objectContaining({ href: "https://pontx.dev/openapi.json" })]);
      expect(entry["service-doc"]).toEqual([
        expect.objectContaining({ href: "https://pontx.dev/en/docs/agent-discovery", hreflang: ["en"] }),
        expect.objectContaining({ href: "https://pontx.dev/zh/docs/agent-discovery", hreflang: ["zh-CN"] })
      ]);
      expect(entry["service-meta"]).toEqual([expect.objectContaining({ href: "https://pontx.dev/.well-known/agent-skills/index.json" })]);
    }
  });

  it("supports HEAD with the same representation metadata", async () => {
    const response = load("HEAD");
    expect(response.status).toBe(200);
    expect(response.headers.get("Content-Length")).toMatch(/^\d+$/);
    expect((await response.arrayBuffer()).byteLength).toBe(0);
  });
});
