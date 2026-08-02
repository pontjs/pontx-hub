import type {
  CatalogApi,
  GlobalSearchKind,
  GlobalSearchResponse,
  GlobalSearchResult,
  Locale
} from "./types";
import { localize } from "./types";

type WeightedField = {
  value: string | undefined;
  weight: number;
};

const kindOrder: Record<GlobalSearchKind, number> = {
  api: 0,
  endpoint: 1,
  schema: 2
};

function normalize(value: string): string {
  return value
    .normalize("NFKC")
    .toLocaleLowerCase()
    .replace(/[_-]+/g, " ")
    .replace(/\s+/g, " ")
    .trim();
}

function relevance(query: string, fields: WeightedField[]): number {
  const normalizedQuery = normalize(query);
  if (!normalizedQuery) return 0;
  const tokens = normalizedQuery.split(" ").filter(Boolean);
  const normalizedFields = fields
    .map(({ value, weight }) => ({ value: normalize(value ?? ""), weight }))
    .filter((field) => field.value);
  const combined = normalizedFields.map((field) => field.value).join(" ");

  if (!tokens.every((token) => combined.includes(token))) return 0;

  let score = 10;
  for (const field of normalizedFields) {
    if (field.value === normalizedQuery) score += field.weight * 12;
    else if (field.value.startsWith(normalizedQuery)) score += field.weight * 8;
    else if (field.value.includes(normalizedQuery)) score += field.weight * 5;
    else {
      score += tokens.filter((token) => field.value.includes(token)).length * field.weight;
    }
  }
  return score;
}

function localizedFields(
  zh: string | undefined,
  en: string | undefined,
  weight: number
): WeightedField[] {
  return [
    { value: zh, weight },
    { value: en, weight }
  ];
}

export function buildSearchResponse(
  catalog: CatalogApi[],
  query: string,
  locale: Locale,
  options: {
    kinds?: GlobalSearchKind[];
    limit?: number;
    offset?: number;
  } = {}
): GlobalSearchResponse {
  const normalizedQuery = query.trim();
  const kinds = new Set<GlobalSearchKind>(
    options.kinds?.length ? options.kinds : ["api", "endpoint", "schema"]
  );
  const limit = Math.min(Math.max(options.limit ?? 30, 1), 100);
  const offset = Math.max(options.offset ?? 0, 0);
  const results: GlobalSearchResult[] = [];

  if (normalizedQuery) {
    for (const api of catalog) {
      const apiTitle = localize(api.title, locale);
      const apiScore = relevance(normalizedQuery, [
        { value: api.slug, weight: 12 },
        { value: api.name, weight: 12 },
        { value: api.provider, weight: 10 },
        { value: api.category, weight: 5 },
        ...localizedFields(api.title.zh, api.title.en, 12),
        ...localizedFields(api.summary.zh, api.summary.en, 4)
      ]);
      if (kinds.has("api") && apiScore > 0) {
        results.push({
          id: `api:${api.slug}`,
          kind: "api",
          score: apiScore,
          apiSlug: api.slug,
          apiTitle,
          provider: api.provider,
          title: apiTitle,
          description: localize(api.summary, locale),
          href: `/${locale}/apis/${api.slug}/${api.operations[0].slug}`,
          category: api.category,
          endpointCount: api.operations.length,
          schemaCount: api.schemas.length
        });
      }

      if (kinds.has("endpoint")) {
        for (const operation of api.operations) {
          const score = relevance(normalizedQuery, [
            { value: operation.operationId, weight: 14 },
            { value: operation.slug, weight: 12 },
            { value: operation.path, weight: 12 },
            { value: operation.method, weight: 8 },
            { value: operation.tag, weight: 6 },
            ...localizedFields(operation.title.zh, operation.title.en, 14),
            ...localizedFields(
              operation.description.zh,
              operation.description.en,
              4
            ),
            ...operation.parameters.flatMap((parameter) => [
              { value: parameter.name, weight: 7 },
              ...localizedFields(
                parameter.description?.zh,
                parameter.description?.en,
                2
              )
            ])
          ]);
          if (score === 0) continue;
          results.push({
            id: `endpoint:${api.slug}/${operation.slug}`,
            kind: "endpoint",
            score,
            apiSlug: api.slug,
            apiTitle,
            provider: api.provider,
            title: localize(operation.title, locale),
            description: localize(operation.description, locale),
            href: `/${locale}/apis/${api.slug}/${operation.slug}`,
            operationSlug: operation.slug,
            operationId: operation.operationId,
            method: operation.method,
            path: operation.path,
            tag: operation.tag
          });
        }
      }

      if (kinds.has("schema")) {
        for (const schema of api.schemas) {
          const score = relevance(normalizedQuery, [
            { value: schema.name, weight: 15 },
            ...localizedFields(schema.title.zh, schema.title.en, 14),
            ...localizedFields(schema.description.zh, schema.description.en, 4),
            ...schema.properties.flatMap((property) => [
              { value: property.name, weight: 8 },
              { value: property.ref, weight: 5 },
              ...localizedFields(
                property.description?.zh,
                property.description?.en,
                2
              )
            ])
          ]);
          if (score === 0) continue;
          results.push({
            id: `schema:${api.slug}/${schema.name}`,
            kind: "schema",
            score,
            apiSlug: api.slug,
            apiTitle,
            provider: api.provider,
            title: localize(schema.title, locale),
            description: localize(schema.description, locale),
            href: `/${locale}/apis/${api.slug}/schemas/${encodeURIComponent(schema.name)}`,
            schemaName: schema.name,
            schemaType: schema.type,
            propertyCount: schema.properties.length,
            properties: schema.properties.map((property) => property.name)
          });
        }
      }
    }
  }

  results.sort((left, right) => {
    if (left.score !== right.score) return right.score - left.score;
    if (left.kind !== right.kind) return kindOrder[left.kind] - kindOrder[right.kind];
    return left.id.localeCompare(right.id);
  });

  const counts: Record<GlobalSearchKind, number> = {
    api: results.filter((result) => result.kind === "api").length,
    endpoint: results.filter((result) => result.kind === "endpoint").length,
    schema: results.filter((result) => result.kind === "schema").length
  };

  return {
    query: normalizedQuery,
    locale,
    total: results.length,
    offset,
    limit,
    counts,
    items: results.slice(offset, offset + limit)
  };
}
