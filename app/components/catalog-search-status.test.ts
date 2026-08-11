import { createElement } from "react";
import { renderToStaticMarkup } from "react-dom/server";
import { describe, expect, it } from "vitest";

import {
  CatalogSearchStatus,
  isCatalogSearchPending,
} from "./catalog-search-status";

describe("catalog search feedback", () => {
  it("starts immediately when the normalized draft differs from the results", () => {
    expect(isCatalogSearchPending("forex", "stock")).toBe(true);
    expect(isCatalogSearchPending(" stock ", "stock")).toBe(false);
  });

  it("announces localized search progress and completion in one live region", () => {
    const pendingMarkup = renderToStaticMarkup(
      createElement(CatalogSearchStatus, {
        locale: "zh",
        pending: true,
        summary: "88 个结果",
      }),
    );
    const completeMarkup = renderToStaticMarkup(
      createElement(CatalogSearchStatus, {
        locale: "en",
        pending: false,
        summary: "52 results",
      }),
    );

    expect(pendingMarkup).toContain('role="status"');
    expect(pendingMarkup).toContain('aria-live="polite"');
    expect(pendingMarkup).toContain('aria-atomic="true"');
    expect(pendingMarkup).toContain("正在搜索…");
    expect(pendingMarkup).toContain("catalog-search-spinner");
    expect(completeMarkup).toContain("52 results");
    expect(completeMarkup).not.toContain("catalog-search-spinner");
  });
});
