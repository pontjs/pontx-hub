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
  proxyEnabled: boolean;
  servers: CatalogServer[];
  auth: CatalogAuthScheme[];
  operations: CatalogOperation[];
};

export type CatalogSummary = Omit<
  CatalogApi,
  "operations" | "servers" | "auth"
> & {
  operationCount: number;
  authTypes: Array<CatalogAuthScheme["type"]>;
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
