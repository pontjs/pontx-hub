import { createElement } from "react";
import { renderToStaticMarkup } from "react-dom/server";
import { describe, expect, it } from "vitest";
import {
  FeedbackDialogPanel,
  featureDiscussionUrl,
  feedbackAnalyticsParameters,
  sanitizeFeedbackPath,
  websiteIssueUrl
} from "./feedback-dialog";

describe("feedback destinations", () => {
  it("prefills the issue form with only the safe localized pathname", () => {
    const url = new URL(websiteIssueUrl(
      "zh",
      "/zh/apis/滴答清单?token=secret#playground"
    ));

    expect(url.origin).toBe("https://github.com");
    expect(url.pathname).toBe("/pontjs/pontx-hub/issues/new");
    expect(url.searchParams.get("template")).toBe("website-bug.yml");
    expect(url.searchParams.get("page_path")).toBe("/zh/apis/滴答清单");
    expect(url.searchParams.get("locale")).toBe("zh");
    expect(url.toString()).not.toContain("secret");
    expect(url.toString()).not.toContain("playground");
  });

  it("targets the feedback discussion category with an English pathname", () => {
    const url = new URL(featureDiscussionUrl("en", "/en/docs/getting-started"));

    expect(url.pathname).toBe("/pontjs/pontx-hub/discussions/new");
    expect(url.searchParams.get("category")).toBe("ideas");
    expect(url.searchParams.get("page_path")).toBe("/en/docs/getting-started");
    expect(url.searchParams.get("locale")).toBe("en");
  });

  it("rejects malformed or oversized paths", () => {
    expect(sanitizeFeedbackPath("https://example.com/zh")).toBe("/");
    expect(sanitizeFeedbackPath(`/${"a".repeat(1_025)}`)).toBe("/");
  });

  it("keeps analytics payloads allowlisted and context-free", () => {
    expect(feedbackAnalyticsParameters("zh")).toEqual({
      locale: "zh",
      surface: "site_header"
    });
    expect(feedbackAnalyticsParameters("en", "discussion")).toEqual({
      locale: "en",
      surface: "site_header",
      channel: "discussion"
    });
    expect(JSON.stringify(feedbackAnalyticsParameters("zh", "issue")))
      .not.toMatch(/path|query|hash|token|title|content/i);
  });
});

describe("feedback dialog content", () => {
  it("renders the complete Chinese public-feedback contract", () => {
    const html = renderToStaticMarkup(createElement(FeedbackDialogPanel, {
      locale: "zh",
      pathname: "/zh/docs",
      onClose: () => undefined
    }));

    expect(html).toContain("帮助我们改进 Pontx Hub");
    expect(html).toContain("报告网站问题");
    expect(html).toContain("提出改进建议");
    expect(html).toContain("反馈会公开发布到 GitHub");
    expect(html).toContain("API Key、Token、密码");
    expect(html.match(/target="_blank"/g)).toHaveLength(2);
    expect(html).toContain('aria-labelledby="site-feedback-title"');
  });

  it("renders the complete English public-feedback contract", () => {
    const html = renderToStaticMarkup(createElement(FeedbackDialogPanel, {
      locale: "en",
      pathname: "/en/docs",
      onClose: () => undefined
    }));

    expect(html).toContain("Help improve Pontx Hub");
    expect(html).toContain("Report a website problem");
    expect(html).toContain("Suggest an improvement");
    expect(html).toContain("Feedback is published publicly on GitHub");
  });
});
