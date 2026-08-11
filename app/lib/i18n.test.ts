import { describe, expect, it } from "vitest";
import {
  alternateLocaleUrl,
  alternateLocaleHref,
  apiWorkspaceNavigationCopy,
  preferredLocale,
  publicResourceTerminologyCopy
} from "./i18n";

describe("internationalized routing", () => {
  it("negotiates supported languages by quality and falls back to English", () => {
    expect(preferredLocale("zh-CN,zh;q=0.9,en;q=0.8")).toBe("zh");
    expect(preferredLocale("fr;q=1,en-US;q=0.9,zh;q=0.2")).toBe("en");
    expect(preferredLocale("zh;q=0,en;q=0.5")).toBe("en");
    expect(preferredLocale(null)).toBe("en");
  });

  it("preserves deep links, queries, and fragments when switching language", () => {
    expect(
      alternateLocaleUrl(
        "/zh/apis/dida365/get-project",
        "?q=projectId",
        "#response",
        "en"
      )
    ).toBe("/en/apis/dida365/get-project?q=projectId#response");
  });

  it("keeps the first language-link render hydration-safe, then restores the fragment", () => {
    expect(
      alternateLocaleHref(
        "/zh/apis/dida365",
        "",
        "#quick-call",
        "en",
        false
      )
    ).toBe("/en/apis/dida365");
    expect(
      alternateLocaleHref(
        "/zh/apis/dida365",
        "",
        "#quick-call",
        "en",
        true
      )
    ).toBe("/en/apis/dida365#quick-call");
  });

  it("names the full endpoint workspace without reducing it to documentation", () => {
    expect(apiWorkspaceNavigationCopy("zh")).toEqual({
      endpointTab: "接口",
      browseAllEndpoints: "浏览全部接口",
      openSelectedEndpoint: "打开所选接口",
      openRelatedEndpoint: "查看相关接口"
    });
    expect(apiWorkspaceNavigationCopy("en")).toEqual({
      endpointTab: "Endpoints",
      browseAllEndpoints: "Browse all endpoints",
      openSelectedEndpoint: "Open selected endpoint",
      openRelatedEndpoint: "Open related endpoint"
    });
  });

  it("keeps public API products distinct from their endpoints", () => {
    expect(publicResourceTerminologyCopy("zh")).toEqual({
      apiBadge: "API 产品",
      apiProduct: "API 产品",
      apiProducts: "API 产品",
      endpoint: "接口",
      endpoints: "接口",
      schema: "数据结构",
      schemas: "数据结构"
    });
    expect(publicResourceTerminologyCopy("en")).toEqual({
      apiBadge: "API",
      apiProduct: "API product",
      apiProducts: "API products",
      endpoint: "Endpoint",
      endpoints: "Endpoints",
      schema: "Schema",
      schemas: "Schemas"
    });
  });
});
