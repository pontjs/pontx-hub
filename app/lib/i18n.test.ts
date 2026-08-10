import { describe, expect, it } from "vitest";
import { alternateLocaleUrl, preferredLocale } from "./i18n";

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
});
