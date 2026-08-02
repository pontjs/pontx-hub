export type Locale = "zh" | "en";

export type LocalizedText = {
  zh: string;
  en: string;
};

export type HttpMethod =
  | "GET"
  | "POST"
  | "PUT"
  | "PATCH"
  | "DELETE"
  | "HEAD"
  | "OPTIONS";

export type CatalogParameter = {
  name: string;
  in: "path" | "query" | "header" | "body";
  required?: boolean;
  type: "string" | "number" | "integer" | "boolean" | "object" | "array";
  description?: LocalizedText;
  example?: unknown;
};

export type CatalogOperation = {
  slug: string;
  operationId: string;
  tag: string;
  method: HttpMethod;
  path: string;
  title: LocalizedText;
  description: LocalizedText;
  contentType?: "application/json" | "application/x-www-form-urlencoded";
  parameters: CatalogParameter[];
  responseExample?: unknown;
  deprecated?: boolean;
};

export type CatalogSchemaProperty = {
  name: string;
  type: "string" | "number" | "integer" | "boolean" | "object" | "array";
  format?: string;
  description?: LocalizedText;
  required?: boolean;
  ref?: string;
};

export type CatalogSchema = {
  name: string;
  title: LocalizedText;
  description: LocalizedText;
  type: "string" | "number" | "integer" | "boolean" | "object" | "array";
  required: string[];
  properties: CatalogSchemaProperty[];
  schema: Record<string, unknown>;
};

export type CatalogServer = {
  id: string;
  url: string;
  description: LocalizedText;
};

export type CatalogAuthScheme =
  | {
      id: string;
      type: "apiKey";
      name: string;
      in: "header" | "query";
      envVar: string;
      description: LocalizedText;
    }
  | {
      id: string;
      type: "bearer" | "oauth2";
      envVar: string;
      description: LocalizedText;
    }
  | {
      id: string;
      type: "basic";
      usernameEnvVar: string;
      passwordEnvVar: string;
      description: LocalizedText;
    };

export type CatalogApi = {
  slug: string;
  name: string;
  provider: string;
  category: string;
  featured: boolean;
  sourceUrl: string;
  license: string;
  attributionUrl: string;
  approvedSha256: string;
  title: LocalizedText;
  summary: LocalizedText;
  accent: string;
  packageName: string;
  sdkVersion: string;
  sdkStatus: "planned" | "published";
  proxyEnabled: boolean;
  servers: CatalogServer[];
  auth: CatalogAuthScheme[];
  operations: CatalogOperation[];
  schemas: CatalogSchema[];
};

export type CatalogSummary = Omit<
  CatalogApi,
  "operations" | "schemas" | "servers" | "auth"
> & {
  operationCount: number;
  schemaCount: number;
  defaultOperationSlug: string;
  authTypes: Array<CatalogAuthScheme["type"]>;
};

export type GlobalSearchKind = "api" | "endpoint" | "schema";

type GlobalSearchResultBase = {
  id: string;
  kind: GlobalSearchKind;
  score: number;
  apiSlug: string;
  apiTitle: string;
  provider: string;
  title: string;
  description: string;
  href: string;
};

export type ApiSearchResult = GlobalSearchResultBase & {
  kind: "api";
  category: string;
  endpointCount: number;
  schemaCount: number;
};

export type EndpointSearchResult = GlobalSearchResultBase & {
  kind: "endpoint";
  operationSlug: string;
  operationId: string;
  method: HttpMethod;
  path: string;
  tag: string;
};

export type SchemaSearchResult = GlobalSearchResultBase & {
  kind: "schema";
  schemaName: string;
  schemaType: CatalogSchema["type"];
  propertyCount: number;
  properties: string[];
};

export type GlobalSearchResult =
  | ApiSearchResult
  | EndpointSearchResult
  | SchemaSearchResult;

export type GlobalSearchResponse = {
  query: string;
  locale: Locale;
  total: number;
  offset: number;
  limit: number;
  counts: Record<GlobalSearchKind, number>;
  items: GlobalSearchResult[];
};

export function isLocale(value: string | undefined): value is Locale {
  return value === "zh" || value === "en";
}

export function localize(text: LocalizedText, locale: Locale): string {
  return text[locale] || text.en || text.zh;
}

export function credentialEnvVar(
  scheme: CatalogAuthScheme | undefined
): string {
  if (!scheme) return "API_TOKEN";
  if (scheme.type === "basic") return scheme.passwordEnvVar;
  return scheme.envVar;
}
