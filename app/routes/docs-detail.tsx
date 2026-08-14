import { redirect } from "react-router";
import type { Route } from "./+types/docs-detail";
import { DocsContent } from "~/components/docs-content";
import { DocsLayout } from "~/components/docs-layout";
import { isDocSlug } from "~/lib/docs";
import { docsMeta } from "~/lib/docs-seo";
import { cacheHeaders, requireLocale } from "~/lib/http";
import "~/styles/docs.css";

export function loader({ params }: Route.LoaderArgs) {
  const locale = requireLocale(params.locale);
  if (params.docSlug === "overview") {
    throw redirect(`/${locale}/docs`, 301);
  }
  if (!isDocSlug(params.docSlug)) {
    throw new Response("Documentation page not found", { status: 404 });
  }
  return { locale, slug: params.docSlug };
}

export function meta({ data }: Route.MetaArgs) {
  if (!data) return [{ title: "Documentation not found — Pontx Hub" }];
  return docsMeta(data.locale, data.slug);
}

export function headers() {
  return cacheHeaders();
}

export default function DocsDetail({ loaderData }: Route.ComponentProps) {
  return (
    <DocsLayout locale={loaderData.locale} slug={loaderData.slug}>
      <DocsContent locale={loaderData.locale} slug={loaderData.slug} />
    </DocsLayout>
  );
}
