import type { Route } from "./+types/sdk-quality-badge";
import { getCatalogApi } from "~/lib/catalog/catalog.server";
import type { SdkQualityEvidence } from "~/lib/catalog/types";

type BadgeState = {
  color: string;
  label: string;
  message: string;
};

export function sdkQualityPassRate(evidence: SdkQualityEvidence): number {
  return Math.round((evidence.unitTests.passed / evidence.unitTests.total) * 100);
}

export function sdkQualityBadgeState(
  evidence: SdkQualityEvidence | undefined,
): BadgeState {
  if (!evidence) {
    return { color: "#6b7280", label: "SDK quality", message: "not verified" };
  }

  const passRate = sdkQualityPassRate(evidence);
  const passing =
    passRate === 100 &&
    evidence.unitTests.passed === evidence.unitTests.total &&
    evidence.unitTests.skipped === 0 &&
    evidence.e2eStatus === "passed";
  return {
    color: passing ? "#16813d" : "#c2413b",
    label: "SDK quality",
    message: `UT ${passRate}% | E2E ${evidence.e2eStatus === "passed" ? "passing" : "failed"}`,
  };
}

function escapeXml(value: string): string {
  return value
    .replaceAll("&", "&amp;")
    .replaceAll("<", "&lt;")
    .replaceAll(">", "&gt;")
    .replaceAll('"', "&quot;")
    .replaceAll("'", "&apos;");
}

export function renderSdkQualityBadge(
  evidence: SdkQualityEvidence | undefined,
): string {
  const state = sdkQualityBadgeState(evidence);
  const labelWidth = 78;
  const messageWidth = Math.max(108, state.message.length * 6 + 16);
  const width = labelWidth + messageWidth;
  const accessible = `${state.label}: ${state.message}`;

  return `<svg xmlns="http://www.w3.org/2000/svg" width="${width}" height="20" role="img" aria-label="${escapeXml(accessible)}">
  <title>${escapeXml(accessible)}</title>
  <linearGradient id="s" x2="0" y2="100%">
    <stop offset="0" stop-color="#fff" stop-opacity=".16"/>
    <stop offset="1" stop-opacity=".1"/>
  </linearGradient>
  <clipPath id="r"><rect width="${width}" height="20" rx="3"/></clipPath>
  <g clip-path="url(#r)">
    <rect width="${labelWidth}" height="20" fill="#303846"/>
    <rect x="${labelWidth}" width="${messageWidth}" height="20" fill="${state.color}"/>
    <rect width="${width}" height="20" fill="url(#s)"/>
  </g>
  <g fill="#fff" text-anchor="middle" font-family="Verdana,Geneva,sans-serif" font-size="11">
    <text x="${labelWidth / 2}" y="15" fill="#010101" fill-opacity=".3">${escapeXml(state.label)}</text>
    <text x="${labelWidth / 2}" y="14">${escapeXml(state.label)}</text>
    <text x="${labelWidth + messageWidth / 2}" y="15" fill="#010101" fill-opacity=".3">${escapeXml(state.message)}</text>
    <text x="${labelWidth + messageWidth / 2}" y="14">${escapeXml(state.message)}</text>
  </g>
</svg>`;
}

export function loader({ params }: Route.LoaderArgs) {
  const match = (params["*"] ?? "").match(/^([a-z0-9]+(?:-[a-z0-9]+)*)\.svg$/);
  const api = match ? getCatalogApi(match[1]) : undefined;
  if (!api) throw new Response("SDK quality badge not found", { status: 404 });

  return new Response(renderSdkQualityBadge(api.sdkQuality), {
    headers: {
      "Content-Type": "image/svg+xml; charset=utf-8",
      "Cache-Control": "public, max-age=300, s-maxage=300, stale-while-revalidate=3600",
      "Access-Control-Allow-Origin": "*",
      "X-Content-Type-Options": "nosniff",
      "X-Robots-Tag": "noindex, nofollow",
    },
  });
}
