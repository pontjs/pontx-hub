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
  api: CatalogApi,
  operation: CatalogOperation
): boolean {
  return Boolean(
    api.sdkContract?.operations.includes(operation.operationId) &&
    api.sdkContract.controllers[operation.tag]
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

function placeholder(name: string, type: string): unknown {
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
  return placeholder(parameter.name, parameter.type);
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
    hydrated[name] = placeholder(name, property?.type ?? "string");
  }
  return hydrated;
}

function requestArguments(
  api: CatalogApi,
  operation: CatalogOperation,
  request: SdkSnippetRequest,
  bodyIdentifier?: string
): string[] {
  const args = operation.parameters
    .filter((parameter) => parameter.in === "path")
    .map((parameter) => typescriptValue(parameterValue(parameter, request.path)));

  if (
    operation.requestBody ||
    operation.parameters.some((parameter) => parameter.in === "body")
  ) {
    args.push(
      bodyIdentifier ?? typescriptValue(requestBody(api, operation, request.body))
    );
  }

  const namedParameters = operation.parameters.filter(
    (parameter) => parameter.in === "query" || parameter.in === "header"
  );
  if (namedParameters.length) {
    const values = Object.fromEntries(
      namedParameters.flatMap((parameter) => {
        const value = parameter.in === "query"
          ? request.query[parameter.name]
          : request.headers[parameter.name];
        return (value === undefined || value === "") && !parameter.required
          ? []
          : [
              [
                parameter.name,
                value === undefined || value === ""
                  ? placeholder(parameter.name, parameter.type)
                  : value
              ]
            ];
      })
    );
    args.push(typescriptValue(values));
  }

  if (api.sdkContract?.auth?.kind === "bearer-request-init") {
    args.push(`{
  headers: {
    Authorization: \`Bearer \${process.env.${api.sdkContract.auth.envVar}!}\`
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

  const controller = contract.controllers[operation.tag]!;
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

  const hasBody = Boolean(
    operation.requestBody ||
    operation.parameters.some((parameter) => parameter.in === "body")
  );
  if (hasBody) {
    lines.push(
      "",
      `const sdkRequestBody = ${typescriptValue(
        requestBody(api, operation, request.body)
      )} as const;`
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
    `const result = await ${contract.client.identifier}.${controller}.${operation.operationId}${call};`
  );
  return lines.join("\n");
}
