import { describe, expect, it } from "vitest";
import { getCatalogApi } from "~/lib/catalog/catalog.server";
import { sdkUsageExamples } from "./sdk-detail";

describe("SDK usage examples", () => {
  it("renders the published Frankfurter v2 client and dedicated CLI contract", () => {
    const api = getCatalogApi("frankfurter-v2");
    expect(api).toBeDefined();
    const examples = sdkUsageExamples(api!);

    expect(examples.typescript).toContain("frankfurterV2Client.common.getRates");
    expect(examples.typescript).not.toContain("client.default");
    expect(examples.cli).toContain("pontx-frankfurter-v2 call common.getRate");
  });

  it("renders Massive's credential-aware factory and dedicated CLI contract", () => {
    const api = getCatalogApi("massive");
    expect(api).toBeDefined();
    const examples = sdkUsageExamples(api!);

    expect(examples.typescript).toContain("createMassiveClient");
    expect(examples.typescript).toContain("process.env.MASSIVE_API_KEY");
    expect(examples.cli).toContain("pontx-massive call common.getPreviousClose");
  });
});
