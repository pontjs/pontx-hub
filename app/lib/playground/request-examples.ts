import type { PlaygroundRequest } from "@pontx/shadcn-ui";
import type {
  CatalogApi,
  CatalogOperation,
  CatalogRequestExample,
  CatalogRequestExampleInput
} from "~/lib/catalog/types";

type StoredPlaygroundConfig = {
  url?: string;
  auth?: unknown;
  pathParams?: Record<string, string>;
  queryParams?: Record<string, string>;
  headerParams?: Record<string, string>;
  requestBody?: string;
  timestamp?: number;
};

function stringifyValues(
  values: Record<string, string | number | boolean>
): Record<string, string> {
  return Object.fromEntries(
    Object.entries(values).map(([name, value]) => [name, String(value)])
  );
}

export function defaultRequestExample(
  api: Pick<CatalogApi, "quickStart">,
  operation: CatalogOperation
): CatalogRequestExample | undefined {
  const requestedId =
    api.quickStart?.operationSlug === operation.slug
      ? api.quickStart.requestExampleId
      : undefined;
  return (
    operation.requestExamples.find((example) => example.id === requestedId) ??
    operation.requestExamples[0]
  );
}

function bodyValue(body: unknown, name: string): unknown {
  if (name === "body" || name === "/") return body;
  const segments = name.startsWith("/")
    ? name
        .slice(1)
        .split("/")
        .map((segment) => segment.replaceAll("~1", "/").replaceAll("~0", "~"))
    : name.split(".");
  return segments.reduce<unknown>((value, segment) => {
    if (!value || typeof value !== "object") return undefined;
    return (value as Record<string, unknown>)[segment];
  }, body);
}

function inputValue(
  request: PlaygroundRequest,
  input: CatalogRequestExampleInput
): unknown {
  if (input.in === "path") return request.path[input.name];
  if (input.in === "query") return request.query[input.name];
  if (input.in === "header") {
    const entry = Object.entries(request.headers).find(
      ([name]) => name.toLowerCase() === input.name.toLowerCase()
    );
    return entry?.[1];
  }
  return bodyValue(request.body, input.name);
}

export function unresolvedRequestInputs(
  request: PlaygroundRequest,
  example: CatalogRequestExample | undefined
): CatalogRequestExampleInput[] {
  if (!example) return [];
  return example.unresolved.filter((input) => {
    const value = inputValue(request, input);
    return value === undefined || value === null || value === "";
  });
}

export function requestExampleInputLabel(
  input: CatalogRequestExampleInput
): string {
  if (input.in === "body") {
    return input.name === "body" || input.name === "/"
      ? "body"
      : input.name.startsWith("/")
        ? `body${input.name}`
        : `body.${input.name}`;
  }
  return `${input.in}.${input.name}`;
}

export function storedConfigForRequestExample(
  example: CatalogRequestExample,
  previous: StoredPlaygroundConfig | undefined,
  serverUrl: string
): StoredPlaygroundConfig {
  return {
    url: serverUrl || previous?.url || "",
    ...(previous?.auth ? { auth: previous.auth } : {}),
    pathParams: stringifyValues(example.request.path),
    queryParams: stringifyValues(example.request.query),
    headerParams: { ...example.request.headers },
    ...(Object.prototype.hasOwnProperty.call(example.request, "body")
      ? { requestBody: JSON.stringify(example.request.body, null, 2) }
      : {}),
    timestamp: Date.now()
  };
}
