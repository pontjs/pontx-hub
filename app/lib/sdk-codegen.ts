import type { CatalogApi, CatalogOperation } from "~/lib/catalog/types";

export type SdkSnippetRequest = {
  path: Record<string, unknown>;
  query: Record<string, unknown>;
  headers: Record<string, string>;
  body?: unknown;
};

export class SdkCodegenUnavailableError extends Error {
  constructor(message: string) {
    super(message);
    this.name = "SdkCodegenUnavailableError";
  }
}

export function supportsSdkOperation(
  api: Pick<CatalogApi, "sdkContract">,
  operation: CatalogOperation
): boolean {
  const contract = api.sdkContract;
  return Boolean(
    contract?.operations.includes(operation.operationId) &&
    (!operation.tag || Object.prototype.hasOwnProperty.call(contract.controllers, operation.tag))
  );
}

function typescriptValue(value: unknown): string {
  return value === undefined ? "undefined" : JSON.stringify(value, null, 2);
}

function indent(value: string, spaces: number): string {
  const prefix = " ".repeat(spaces);
  return value
    .split("\n")
    .map((line) => `${prefix}${line}`)
    .join("\n");
}

function placeholder(
  name: string,
  type: string,
  evidence?: Record<string, unknown>
): unknown {
  if (evidence?.const !== undefined) return evidence.const;
  if (evidence?.default !== undefined) return evidence.default;
  if (Array.isArray(evidence?.enum) && evidence.enum.length) {
    return evidence.enum[0];
  }
  if (type === "number" || type === "integer") return 0;
  if (type === "boolean") return false;
  if (type === "array") return [];
  if (type === "object") return {};
  const identifier = name
    .replace(/([a-z0-9])([A-Z])/g, "$1_$2")
    .replace(/[^A-Za-z0-9]+/g, "_")
    .toUpperCase();
  return `REPLACE_WITH_${identifier}`;
}

function parameterValue(
  parameter: CatalogOperation["parameters"][number],
  values: Record<string, unknown>
): unknown {
  const value = values[parameter.name];
  if (value !== undefined && value !== "") return value;
  return placeholder(parameter.name, parameter.type, parameter);
}

function schemaPropertyEvidence(
  schema: CatalogApi["schemas"][number],
  name: string
): Record<string, unknown> | undefined {
  const properties = schema.schema?.properties;
  if (!properties || typeof properties !== "object" || Array.isArray(properties)) {
    return undefined;
  }
  const property = (properties as Record<string, unknown>)[name];
  return property && typeof property === "object" && !Array.isArray(property)
    ? property as Record<string, unknown>
    : undefined;
}

function requestBody(
  api: CatalogApi,
  operation: CatalogOperation,
  body: unknown
): unknown {
  const schemaName =
    operation.requestBody?.schemaName ??
    operation.parameters.find((parameter) => parameter.in === "body")
      ?.schemaName;
  const schema = api.schemas.find((candidate) => candidate.name === schemaName);
  if (!schema) return body;
  if (schema.type === "array") {
    return Array.isArray(body) ? body : [];
  }
  if (
    body !== undefined &&
    (!body || typeof body !== "object" || Array.isArray(body))
  ) {
    return body;
  }

  const hydrated = { ...(body ?? {}) } as Record<string, unknown>;
  for (const name of schema.required) {
    if (hydrated[name] !== undefined && hydrated[name] !== "") continue;
    const property = schema.properties.find(
      (candidate) => candidate.name === name
    );
    hydrated[name] = placeholder(
      name,
      property?.type ?? "string",
      schemaPropertyEvidence(schema, name)
    );
  }
  return hydrated;
}

type SdkArgumentKind = "path" | "body" | "query";

function sdkArgumentOrder(api: CatalogApi): SdkArgumentKind[] {
  return api.sdkContract?.argumentOrder ?? ["path", "body", "query"];
}

function pathParameters(operation: CatalogOperation): CatalogOperation["parameters"] {
  const parameters = operation.parameters.filter(
    (parameter) => parameter.in === "path"
  );
  if (!operation.path) return parameters;
  const byName = new Map(parameters.map((parameter) => [parameter.name, parameter]));
  const ordered = Array.from(operation.path.matchAll(/\{([^}]+)\}/g))
    .map((match) => byName.get(match[1]))
    .filter((parameter): parameter is CatalogOperation["parameters"][number] => Boolean(parameter));
  const usedNames = new Set(ordered.map((parameter) => parameter.name));
  return [...ordered, ...parameters.filter((parameter) => !usedNames.has(parameter.name))];
}

function hasRequestBody(operation: CatalogOperation): boolean {
  return Boolean(
    operation.requestBody ||
    operation.parameters.some((parameter) => parameter.in === "body")
  );
}

function requestArguments(
  api: CatalogApi,
  operation: CatalogOperation,
  request: SdkSnippetRequest,
  bodyIdentifier?: string
): string[] {
  const args: string[] = [];
  const pathArguments = pathParameters(operation).map((parameter) =>
    typescriptValue(parameterValue(parameter, request.path))
  );
  const queryParameters = operation.parameters.filter(
    (parameter) => parameter.in === "query"
  );
  const queryArgument = queryParameters.length
    ? typescriptValue(Object.fromEntries(
        queryParameters.flatMap((parameter) => {
          const value = request.query[parameter.name];
          return (value === undefined || value === "") && !parameter.required
            ? []
            : [
                [
                  parameter.name,
                  value === undefined || value === ""
                    ? placeholder(parameter.name, parameter.type, parameter)
                    : value
                ]
              ];
        })
      ))
    : undefined;
  const bodyArgument = hasRequestBody(operation)
    ? bodyIdentifier ?? typescriptValue(requestBody(api, operation, request.body))
    : undefined;
  for (const kind of sdkArgumentOrder(api)) {
    if (kind === "path") args.push(...pathArguments);
    if (kind === "body" && bodyArgument !== undefined) args.push(bodyArgument);
    if (kind === "query" && queryArgument !== undefined) args.push(queryArgument);
  }

  const headerParameters = operation.parameters.filter(
    (parameter) => parameter.in === "header"
  );
  const headers = headerParameters.flatMap((parameter) => {
    const value = request.headers[parameter.name];
    return (value === undefined || value === "") && !parameter.required
      ? []
      : [
          `${JSON.stringify(parameter.name)}: ${typescriptValue(
            value === undefined || value === ""
              ? placeholder(parameter.name, parameter.type, parameter)
              : value
          )}`
        ];
  });
  if (api.sdkContract?.auth?.kind === "bearer-request-init") {
    headers.push(
      `Authorization: \`Bearer \${process.env.${api.sdkContract.auth.envVar}!}\``
    );
  }
  if (headers.length) {
    args.push(`{
  headers: {
${headers.map((header) => `    ${header}`).join(",\n")}
  }
}`);
  }
  return args;
}

export function generateSdkSnippet(
  api: CatalogApi,
  operation: CatalogOperation,
  request: SdkSnippetRequest
): string {
  const contract = api.sdkContract;
  if (!contract || !supportsSdkOperation(api, operation)) {
    throw new SdkCodegenUnavailableError(
      `${api.packageName}@${api.sdkVersion} does not include ${operation.operationId}`
    );
  }

  const controller = operation.tag ? contract.controllers[operation.tag] : null;
  const sdkMethod = operation.sdkMethod ?? operation.operationId;
  const method = `${contract.client.identifier}.${
    controller ? `${controller}.` : ""
  }${sdkMethod}`;
  const lines: string[] = [];
  if (contract.client.kind === "default") {
    lines.push(
      `import ${contract.client.identifier} from "${api.packageName}";`
    );
  } else if (contract.client.kind === "named") {
    lines.push(
      `import { ${contract.client.identifier} } from "${api.packageName}";`
    );
  } else {
    lines.push(
      `import { ${contract.client.factory} } from "${api.packageName}";`
    );
    const options = Object.entries(contract.client.options)
      .map(([name, envVar]) => `  ${name}: process.env.${envVar}!`)
      .join(",\n");
    lines.push(
      "",
      `const ${contract.client.identifier} = ${contract.client.factory}({\n${options}\n});`
    );
  }

  const hasBody = hasRequestBody(operation);
  if (hasBody) {
    const bodyParameterIndex = sdkArgumentOrder(api)
      .slice(0, sdkArgumentOrder(api).indexOf("body"))
      .reduce((index, kind) => index + (kind === "path"
        ? pathParameters(operation).length
        : operation.parameters.some((parameter) => parameter.in === "query") ? 1 : 0), 0);
    lines.push(
      "",
      `const sdkRequestBody = ${typescriptValue(
        requestBody(api, operation, request.body)
      )} satisfies Parameters<typeof ${method}>[${bodyParameterIndex}];`
    );
  }
  const args = requestArguments(
    api,
    operation,
    request,
    hasBody ? "sdkRequestBody" : undefined
  );
  const call = args.length
    ? `(\n${args.map((argument) => indent(argument, 2)).join(",\n")}\n)`
    : "()";
  lines.push(
    "",
    `const result = await ${method}${call};`
  );
  return lines.join("\n");
}
