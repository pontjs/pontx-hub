import { Outlet, type ShouldRevalidateFunctionArgs } from "react-router";
import type { Route } from "./+types/api-layout";
import {
  catalogApiContext,
  getProductMetadata
} from "~/lib/catalog/metadata.server";
import { cacheHeaders, requireLocale } from "~/lib/http";
import { listSkillSummaries } from "~/lib/product-skills.server";

export function loader({ params }: Route.LoaderArgs) {
  const locale = requireLocale(params.locale);
  const product = getProductMetadata(params.apiSlug ?? "");
  if (!product) throw new Response("API not found", { status: 404 });
  const api = catalogApiContext(product);
  const skillName = listSkillSummaries().find(
    (skill) => skill.apiSlug === api.slug
  )?.name;
  return { locale, api, skillName };
}

export function shouldRevalidate({
  currentParams,
  nextParams,
  defaultShouldRevalidate
}: ShouldRevalidateFunctionArgs) {
  if (
    currentParams.locale === nextParams.locale &&
    currentParams.apiSlug === nextParams.apiSlug
  ) {
    return false;
  }
  return defaultShouldRevalidate;
}

export function headers() {
  return cacheHeaders();
}

export type ApiLayoutContext = Awaited<ReturnType<typeof loader>>;

export default function ApiLayout({ loaderData }: Route.ComponentProps) {
  return <Outlet context={loaderData} />;
}
