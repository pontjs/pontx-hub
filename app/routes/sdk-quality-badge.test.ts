import { describe, expect, it } from "vitest";
import type { SdkQualityEvidence } from "~/lib/catalog/types";
import {
  loader,
  renderSdkQualityBadge,
  sdkQualityBadgeState,
} from "./sdk-quality-badge";

const passingEvidence: SdkQualityEvidence = {
  testedVersion: "0.1.0",
  unitTests: { passed: 4, total: 4, skipped: 0 },
  e2eStatus: "passed",
  nodeVersions: ["18", "20", "22"],
  sourceCommit: "a".repeat(40),
  testedAt: "2026-08-14",
  repositoryUrl: "https://github.com/pontjs/example",
  workflowRunUrl: "https://github.com/pontjs/example/actions/runs/1",
};

describe("SDK quality badge", () => {
  it("renders green only for a complete 100% unit and passing E2E gate", () => {
    expect(sdkQualityBadgeState(passingEvidence)).toEqual({
      color: "#16813d",
      label: "SDK quality",
      message: "UT 100% | E2E passing",
    });
    expect(
      sdkQualityBadgeState({
        ...passingEvidence,
        unitTests: { passed: 3, total: 4, skipped: 1 },
      }).color,
    ).toBe("#c2413b");
  });

  it("returns accessible standalone SVG", () => {
    const svg = renderSdkQualityBadge(passingEvidence);
    expect(svg).toContain('xmlns="http://www.w3.org/2000/svg"');
    expect(svg).toContain("SDK quality: UT 100% | E2E passing");
    expect(svg).not.toContain("<!DOCTYPE html>");
  });

  it("serves the public badge as a noindex, cross-origin SVG resource", async () => {
    const response = loader({ params: { "*": "frankfurter.svg" } } as never);
    const svg = await response.text();

    expect(response.headers.get("Content-Type")).toBe("image/svg+xml; charset=utf-8");
    expect(response.headers.get("Access-Control-Allow-Origin")).toBe("*");
    expect(response.headers.get("X-Robots-Tag")).toBe("noindex, nofollow");
    expect(svg).toContain("SDK quality");
    expect(svg).not.toContain("<!DOCTYPE html>");
  });

  it("rejects unknown or malformed badge paths", () => {
    expect(() => loader({ params: { "*": "missing.svg" } } as never)).toThrow();
    expect(() => loader({ params: { "*": "../dida365.svg" } } as never)).toThrow();
  });
});
