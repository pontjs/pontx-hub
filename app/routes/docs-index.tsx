import type { Route } from "./+types/docs-index";
import { DocsContent } from "~/components/docs-content";
import { DocsLayout } from "~/components/docs-layout";
import { docsMeta } from "~/lib/docs-seo";
import { cacheHeaders, requireLocale } from "~/lib/http";
import "~/styles/docs.css";

export function loader({ params }: Route.LoaderArgs) {
  return { locale: requireLocale(params.locale) };
}

export function meta({ data }: Route.MetaArgs) {
  return docsMeta(data?.locale ?? "zh", "overview");
}

export function headers() {
  return cacheHeaders();
}

export default function DocsIndex({ loaderData }: Route.ComponentProps) {
  return (
    <DocsLayout locale={loaderData.locale} slug="overview">
      <DocsContent locale={loaderData.locale} slug="overview" />
    </DocsLayout>
  );
}
