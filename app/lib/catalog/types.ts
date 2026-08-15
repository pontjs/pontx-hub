export type Locale = "zh" | "en";

export type LocalizedText = {
  zh: string;
  en: string;
};

export type DocumentationStatus = "official" | "observed" | "inferred";

export type HttpMethod =
  | "GET"
  | "POST"
  | "PUT"
  | "PATCH"
  | "DELETE"
  | "HEAD"
  | "OPTIONS";

export type ApiStyle = "RESTFul" | "RPC" | "GraphQL" | "AsyncAPI";

export type CatalogParameter = {
  name: string;
  in: "path" | "query" | "header" | "body";
  required?: boolean;
  type: "string" | "number" | "integer" | "boolean" | "object" | "array";
  format?: string;
  schemaName?: string;
  enum?: unknown[];
  default?: unknown;
  const?: unknown;
  multipleOf?: number;
  minimum?: number;
  maximum?: number;
  exclusiveMinimum?: number | boolean;
  exclusiveMaximum?: number | boolean;
  minLength?: number;
  maxLength?: number;
  pattern?: string;
  minItems?: number;
  maxItems?: number;
  uniqueItems?: boolean;
  minProperties?: number;
  maxProperties?: number;
  nullable?: boolean;
  readOnly?: boolean;
  writeOnly?: boolean;
  deprecated?: boolean;
  examples?: unknown[];
  description?: LocalizedText;
  example?: unknown;
};

export type CatalogPayloadMetadata = {
  description?: LocalizedText;
  contentTypes?: string[];
  schemaType?: "string" | "number" | "integer" | "boolean" | "object" | "array";
  schemaName?: string;
  properties?: string[];
};

export type CatalogResponseMetadata = CatalogPayloadMetadata & {
  status: string;
};

export type CatalogRequestScalar = string | number | boolean;

export type CatalogRequestExampleInput = {
  in: "path" | "query" | "header" | "body";
  name: string;
  source:
    | { kind: "operation"; operationId: string }
    | { kind: "runtime"; reason: string };
};

export type CatalogRequestExample = {
  id: string;
  title: LocalizedText;
  request: {
    serverId?: string;
    path: Record<string, CatalogRequestScalar>;
    query: Record<string, CatalogRequestScalar>;
    headers: Record<string, string>;
    body?: unknown;
  };
  expectedStatus: string;
  verifiedAt?: string;
  completeness: "ready" | "requires-input";
  unresolved: CatalogRequestExampleInput[];
};

export type CatalogOperation = {
  slug: string;
  operationId: string;
  style: ApiStyle;
  tag: string;
  /** HTTP coordinates exist only for RESTFul PontxSpec Endpoints. */
  method?: HttpMethod;
  path?: string;
  title: LocalizedText;
  description: LocalizedText;
  contentType?: "application/json" | "application/x-www-form-urlencoded";
  parameters: CatalogParameter[];
  requestBody?: CatalogPayloadMetadata;
  responses: CatalogResponseMetadata[];
  serverIds: string[];
  proxyHeaders: Record<string, string>;
  proxyEnabled?: boolean;
  proxyDisabledReason?: LocalizedText;
  documentationStatus: DocumentationStatus;
  evidenceUrls: string[];
  verifiedAt?: string;
  stabilityNote?: LocalizedText;
  security?: Array<{ schemeId: string; scopes: string[] }>;
  requestExamples: CatalogRequestExample[];
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
  localizedSchema?: {
    zh?: Record<string, unknown>;
    en?: Record<string, unknown>;
  };
};

export type CatalogServer = {
  id: string;
  url: string;
  description: LocalizedText;
};

export type CatalogPricing = {
  status: "free" | "freemium" | "paid" | "contact" | "unknown";
  summary: LocalizedText;
  officialUrl: string;
  verifiedAt: string;
  currency?: string;
  freeTier?: LocalizedText;
  billingUnit?: LocalizedText;
  startingPrice?: {
    amount: number;
    currency: string;
    unit: LocalizedText;
  };
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
      type: "bearer";
      envVar: string;
      description: LocalizedText;
    }
  | {
      id: string;
      type: "oauth2";
      envVar: string;
      description: LocalizedText;
      tokenEndpointAuthMethod?:
        | "client_secret_basic"
        | "client_secret_post"
        | "none";
      pkce?: "required" | "preferred" | "unsupported";
      credentialGuide?: {
        url: string;
        title: LocalizedText;
        steps: LocalizedText[];
      };
      flows?: {
        authorizationCode?: OAuthFlow;
        clientCredentials?: OAuthFlow;
      };
    }
  | {
      id: string;
      type: "basic";
      usernameEnvVar: string;
      passwordEnvVar: string;
      description: LocalizedText;
    };

export type OAuthFlow = {
  authorizationUrl?: string;
  tokenUrl: string;
  scopes: Record<string, string>;
};

export type SdkQualityEvidence = {
  testedVersion: string;
  unitTests: {
    passed: number;
    total: number;
    skipped: number;
  };
  e2eStatus: "passed" | "failed";
  nodeVersions: string[];
  sourceCommit: string;
  testedAt: string;
  repositoryUrl: string;
  workflowRunUrl: string;
};

export type SdkContract = {
  client:
    | {
        kind: "default";
        identifier: string;
      }
    | {
        kind: "named";
        identifier: string;
      }
    | {
        kind: "factory";
        factory: string;
        identifier: string;
        options: Record<string, string>;
      };
  auth?: {
    kind: "bearer-request-init";
    envVar: string;
  };
  /** PontxSpec 显式 tag 到 SDK Controller 的映射。无 tag Endpoint 始终位于 client 根级。 */
  controllers: Record<string, string | null>;
  /** 旧分组访问仅作为兼容别名，不能参与稳定 Endpoint/CLI/Hub ID。 */
  compatibilityAliases?: Record<string, string[]>;
  operations: string[];
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
  sdkQuality?: SdkQualityEvidence;
  sdkContract?: SdkContract;
  contentUpdatedAt?: string;
  cliName?: string;
  sdkExamples?: {
    typescript: string;
    cli: string;
  };
  proxyEnabled: boolean;
  documentationStatus: DocumentationStatus;
  evidenceUrls: string[];
  verifiedAt?: string;
  stabilityNote?: LocalizedText;
  quickStart?: {
    operationSlug: string;
    requestExampleId: string;
  };
  servers: CatalogServer[];
  auth: CatalogAuthScheme[];
  pricing?: CatalogPricing;
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

export type GlobalSearchMatchField =
  | "product"
  | "title"
  | "description"
  | "path"
  | "parameter"
  | "request"
  | "response"
  | "schema"
  | "property"
  | "pricing";

export type GlobalSearchMatch = {
  mode: "lexical" | "semantic" | "hybrid";
  fields: GlobalSearchMatchField[];
};

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
  match: GlobalSearchMatch;
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
  style?: ApiStyle;
  method?: HttpMethod;
  path?: string;
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
  strategy: "hybrid-semantic";
  semanticVersion: "pontx-multilingual-v1";
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
