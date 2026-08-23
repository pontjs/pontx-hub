type HubCliOperation = {
  operationId: string;
  tag: string;
};

type HubCliSnippetOperation = HubCliOperation & {
  parameters: Array<{
    name: string;
    in: "path" | "query" | "header" | "body";
  }>;
};

type HubCliSnippetRequest = {
  path: Record<string, unknown>;
  query: Record<string, unknown>;
  headers: Record<string, string>;
  body?: unknown;
};

export type HubCliAction = "preview" | "call";

const controllerlessTags = new Set(["", "common", "default"]);

const reservedCliOptions = new Set([
  "body",
  "header",
  "help",
  "url",
  "version",
  "yes"
]);

export function shellArgument(value: string): string {
  if (/^[A-Za-z0-9_@%+=:,./-]+$/.test(value)) return value;
  return `'${value.replaceAll("'", `'"'"'`)}'`;
}

export function hubCliControllerName(tag: string): string | undefined {
  const trimmed = tag.trim();
  if (controllerlessTags.has(trimmed.toLocaleLowerCase())) return undefined;

  const words = trimmed.split(/[^\p{L}\p{N}]+/gu).filter(Boolean);
  if (!words.length) return undefined;
  const [first, ...rest] = words;
  const lowerFirst = /^[A-Z0-9]+$/.test(first) || /^[A-Z]{2}/.test(first)
    ? first.toLocaleLowerCase()
    : `${first.slice(0, 1).toLocaleLowerCase()}${first.slice(1)}`;
  return [
    lowerFirst,
    ...rest.map((word) => {
      const normalized = /^[A-Z0-9]+$/.test(word)
        ? word.toLocaleLowerCase()
        : word;
      return `${normalized.slice(0, 1).toLocaleUpperCase()}${normalized.slice(1)}`;
    })
  ].join("");
}

function parameterValue(value: unknown): string {
  return typeof value === "string" ? value : JSON.stringify(value);
}

export function hubCliParameterArguments(
  name: string,
  value: unknown
): string[] {
  if (name === "version") {
    return ["--path-version", shellArgument(parameterValue(value))];
  }
  if (reservedCliOptions.has(name)) {
    throw new Error(
      `API parameter --${name} conflicts with a Pontx Hub CLI option`
    );
  }
  const serialized = parameterValue(value);
  return [shellArgument(`--${name}`), shellArgument(serialized)];
}

export function hubCliCommand(
  apiSlug: string,
  operation: HubCliOperation,
  action: HubCliAction = "call"
): string {
  const parts = ["pontx-hub", shellArgument(apiSlug), action];
  const controller = hubCliControllerName(operation.tag);
  if (controller) parts.push(shellArgument(controller));
  parts.push(shellArgument(operation.operationId));
  return parts.join(" ");
}

export function hubCliSnippet(
  apiSlug: string,
  operation: HubCliSnippetOperation,
  request: HubCliSnippetRequest
): string {
  const parts = [hubCliCommand(apiSlug, operation)];
  const declaredHeaders = new Set<string>();

  for (const parameter of operation.parameters) {
    if (parameter.in === "body") continue;
    const values = parameter.in === "path"
      ? request.path
      : parameter.in === "query"
        ? request.query
        : request.headers;
    if (parameter.in === "header") declaredHeaders.add(parameter.name);
    const value = values[parameter.name];
    if (value !== undefined && value !== "") {
      parts.push(...hubCliParameterArguments(parameter.name, value));
    }
  }

  for (const [name, value] of Object.entries(request.headers)) {
    if (!declaredHeaders.has(name) && value !== "") {
      parts.push("-H", shellArgument(`${name}: ${value}`));
    }
  }
  if (request.body !== undefined) {
    parts.push("--body", shellArgument(JSON.stringify(request.body)));
  }
  return parts.join(" ");
}
