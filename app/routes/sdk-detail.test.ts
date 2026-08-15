import { describe, expect, it } from "vitest";
import { getCatalogApi } from "~/lib/catalog/catalog.server";
import { meta, sdkOperationCoverage, sdkUsageExamples } from "./sdk-detail";

describe("SDK usage examples", () => {
  it("exposes TypeScript only on the current SDK detail page", () => {
    const api = getCatalogApi("frankfurter");
    expect(api).toBeDefined();

    const descriptors = meta({ data: { locale: "en", api } } as never);
    expect(descriptors).toContainEqual({
      title: `${api!.packageName} — TypeScript SDK`
    });
    expect(descriptors).toContainEqual({
      name: "description",
      content: expect.stringContaining("TypeScript SDK")
    });
    expect(JSON.stringify(descriptors)).not.toContain("TypeScript and Node.js SDK");
  });

  it("renders the published Frankfurter v2 client and dedicated CLI contract", () => {
    const api = getCatalogApi("frankfurter-v2");
    expect(api).toBeDefined();
    const examples = sdkUsageExamples(api!);

    expect(examples.typescript).toContain("frankfurterV2Client.getRates");
    expect(examples.typescript).not.toContain("client.default");
    expect(examples.typescript).not.toContain("frankfurterV2Client.common");
    expect(examples.cli).toContain("pontx-frankfurter-v2 call getRates");
    expect(examples.cli).not.toContain("common.getRates");
  });

  it("renders Massive's credential-aware factory and dedicated CLI contract", () => {
    const api = getCatalogApi("massive");
    expect(api).toBeDefined();
    const examples = sdkUsageExamples(api!);

    expect(examples.typescript).toContain("createMassiveClient");
    expect(examples.typescript).toContain("process.env.MASSIVE_API_KEY");
    expect(examples.typescript).toContain("client.getPreviousClose");
    expect(examples.typescript).not.toContain(".common.");
    expect(examples.cli).toContain("pontx-massive call getPreviousClose");
    expect(examples.cli).not.toContain("common.getPreviousClose");
  });

  it("reports exact published Endpoint coverage", () => {
    const dida365 = getCatalogApi("dida365");
    const massive = getCatalogApi("massive");
    expect(dida365).toBeDefined();
    expect(massive).toBeDefined();

    expect(sdkOperationCoverage(dida365!)).toEqual({
      supported: 11,
      total: 37,
      complete: false,
      verified: true
    });
    expect(sdkOperationCoverage(massive!)).toEqual({
      supported: 6,
      total: 6,
      complete: true,
      verified: true
    });
  });
});
