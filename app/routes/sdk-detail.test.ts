import { describe, expect, it } from "vitest";
import { getCatalogApi } from "~/lib/catalog/catalog.server";
import { sdkRuntime } from "~/lib/catalog/sdk-runtime";
import { generateSdkSnippet } from "~/lib/sdk-codegen";
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

  it("renders the exact published Frankfurter v2 client and dedicated CLI contract", () => {
    const api = getCatalogApi("frankfurter-v2");
    expect(api).toBeDefined();
    const examples = sdkUsageExamples(api!);

    expect(examples.typescript).toContain("getRates");
    expect(examples.typescript).not.toContain("client.default");
    expect(examples.typescript).not.toContain(".common");
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

  it("uses the exact Endpoint generator for the SDK homepage example", () => {
    const api = getCatalogApi("massive");
    const operation = api?.operations.find(
      (candidate) => candidate.slug === api.quickStart?.operationSlug
    );
    const request = operation?.requestExamples.find(
      (example) => example.id === api?.quickStart?.requestExampleId
    )?.request;

    expect(api).toBeDefined();
    expect(operation).toBeDefined();
    expect(request).toBeDefined();
    expect(sdkUsageExamples(api!).typescript).toBe(
      generateSdkSnippet(api!, operation!, request!)
    );
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

  it("derives runtime guidance from the SDK's tested Node.js matrix", () => {
    const sqs = getCatalogApi("amazon-sqs");
    if (!sqs) return;
    expect(sdkRuntime(sqs)).toBe("node>=20");
  });
});
