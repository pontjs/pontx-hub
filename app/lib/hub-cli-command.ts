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

const reservedCliOptions = new Set([
  "body",
  "header",
  "help",
  "param",
  "url",
  "version",
  "yes"
]);

export function shellArgument(value: string): string {
  if (/^[A-Za-z0-9_@%+=:,./-]+$/.test(value)) return value;
  return `'${value.replaceAll("'", `'"'"'`)}'`;
}

function parameterValue(value: unknown): string {
  return typeof value === "string" ? value : JSON.stringify(value);
}

export function hubCliParameterArguments(
  name: string,
  value: unknown
): string[] {
  const serialized = parameterValue(value);
  if (/^[A-Za-z0-9][A-Za-z0-9._-]*$/.test(name) && !reservedCliOptions.has(name)) {
    return [`--${name}`, shellArgument(serialized)];
  }
  return ["-p", shellArgument(`${name}=${serialized}`)];
}

export function hubCliCommand(
  apiSlug: string,
  operation: HubCliOperation,
  action: HubCliAction = "call"
): string {
  const parts = ["pontx-hub", shellArgument(apiSlug), action];
  if (operation.tag.trim().toLocaleLowerCase() !== "default") {
    parts.push(shellArgument(operation.tag));
  }
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
