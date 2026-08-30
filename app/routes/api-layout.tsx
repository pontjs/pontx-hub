import { useCallback, useEffect, useMemo, useState } from "react";
import { Outlet, useLocation, type ShouldRevalidateFunctionArgs } from "react-router";
import type { Route } from "./+types/api-layout";
import {
  catalogApiPageContext,
  getProductMetadata
} from "~/lib/catalog/metadata.server";
import { cacheHeaders, requireLocale } from "~/lib/http";
import { listSkillSummaries } from "~/lib/product-skills.server";
import type { CatalogProductNavigation } from "~/lib/catalog/types";

export function loader({ params }: Route.LoaderArgs) {
  const locale = requireLocale(params.locale);
  const product = getProductMetadata(params.apiSlug ?? "");
  if (!product) throw new Response("API not found", { status: 404 });
  const api = catalogApiPageContext(product);
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

export type ApiLayoutContext = Awaited<ReturnType<typeof loader>> & {
  requestNavigation: () => void;
};

export default function ApiLayout({ loaderData }: Route.ComponentProps) {
  const location = useLocation();
  const [navigationState, setNavigationState] = useState<{
    apiSlug: string;
    navigation: CatalogProductNavigation;
  }>();
  const [navigationRequestedFor, setNavigationRequestedFor] = useState<string>();
  const navigation = navigationState?.apiSlug === loaderData.api.slug
    ? navigationState.navigation
    : undefined;
  const navigationRequested = navigationRequestedFor === loaderData.api.slug;
  const requestNavigation = useCallback(
    () => setNavigationRequestedFor(loaderData.api.slug),
    [loaderData.api.slug]
  );
  const overviewPath = `/${loaderData.locale}/apis/${loaderData.api.slug}`;

  useEffect(() => {
    if (navigation) return;
    if (location.pathname !== overviewPath && !navigationRequested) return;
    const controller = new AbortController();
    fetch(`/api/ui/v1/products/${encodeURIComponent(loaderData.api.slug)}/navigation`, {
      signal: controller.signal
    })
      .then((response) => {
        if (!response.ok) throw new Error(`Directory request failed: ${response.status}`);
        return response.json() as Promise<CatalogProductNavigation>;
      })
      .then((nextNavigation) => setNavigationState({
        apiSlug: loaderData.api.slug,
        navigation: nextNavigation
      }))
      .catch((error: unknown) => {
        if (!(error instanceof DOMException && error.name === "AbortError")) {
          console.error(error);
        }
      });
    return () => controller.abort();
  }, [loaderData.api.slug, location.pathname, navigation, navigationRequested, overviewPath]);

  const context = useMemo<ApiLayoutContext>(() => ({
    ...loaderData,
    api: navigation ? { ...loaderData.api, ...navigation } : loaderData.api,
    requestNavigation
  }), [loaderData, navigation, requestNavigation]);

  return <Outlet context={context} />;
}
