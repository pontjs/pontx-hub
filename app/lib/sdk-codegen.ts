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

function referencedSchema(
  api: CatalogApi,
  property: CatalogApi["schemas"][number]["properties"][number] | undefined,
  evidence: Record<string, unknown> | undefined
): CatalogApi["schemas"][number] | undefined {
  const reference = property?.ref ?? (
    typeof evidence?.$ref === "string"
      ? evidence.$ref.replace("#/components/schemas/", "")
      : undefined
  );
  return reference
    ? api.schemas.find((candidate) => candidate.name === reference)
    : undefined;
}

function requiredSchemaValue(
  api: CatalogApi,
  property: CatalogApi["schemas"][number]["properties"][number] | undefined,
  evidence: Record<string, unknown> | undefined,
  references: Set<string>,
  depth: number
): unknown {
  const declaredType = property?.type ??
    (typeof evidence?.type === "string" ? evidence.type : undefined);
  // Array schemas commonly reference an item Schema. Check the property shape
  // before following that reference, otherwise an item object would be emitted
  // where the generated SDK correctly expects an array.
  if (declaredType === "array") return [];
  const target = referencedSchema(api, property, evidence);
  if (target?.type === "array") return [];
  if (target?.type === "object") {
    return requiredSchemaObject(api, target, references, depth + 1);
  }
  const inlineProperties = evidence?.properties;
  const inlineRequired = evidence?.required;
  if (
    declaredType === "object" &&
    inlineProperties && typeof inlineProperties === "object" && !Array.isArray(inlineProperties)
  ) {
    const required = Array.isArray(inlineRequired)
      ? inlineRequired.filter((name): name is string => typeof name === "string")
      : [];
    return Object.fromEntries(required.map((name) => {
      const child = (inlineProperties as Record<string, unknown>)[name];
      return [
        name,
        requiredSchemaValue(
          api,
          undefined,
          child && typeof child === "object" && !Array.isArray(child)
            ? child as Record<string, unknown>
            : undefined,
          references,
          depth + 1
        )
      ];
    }));
  }
  return placeholder(
    property?.name ?? "value",
    property?.type ?? (typeof evidence?.type === "string" ? evidence.type : "string"),
    evidence
  );
}

function requiredSchemaObject(
  api: CatalogApi,
  schema: CatalogApi["schemas"][number],
  references: Set<string>,
  depth: number
): Record<string, unknown> {
  if (depth >= 4 || references.has(schema.name)) return {};
  const nestedReferences = new Set(references).add(schema.name);
  return Object.fromEntries(schema.required.map((name) => {
    const property = schema.properties.find((candidate) => candidate.name === name);
    return [
      name,
      requiredSchemaValue(
        api,
        property,
        schemaPropertyEvidence(schema, name),
        nestedReferences,
        depth
      )
    ];
  }));
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
  const declaredType = operation.requestBody?.schemaType ??
    operation.parameters.find((parameter) => parameter.in === "body")?.type;
  if (declaredType === "array") {
    return Array.isArray(body) ? body : [];
  }
  const schema = api.schemas.find((candidate) => candidate.name === schemaName);
  if (!schema) return body;
  if (schema.type === "array") return Array.isArray(body) ? body : [];
  if (
    body !== undefined &&
    (!body || typeof body !== "object" || Array.isArray(body))
  ) {
    return body;
  }

  // Static snippets must remain valid against the published package even when
  // an upstream request example includes optional vendor fields that its SDK
  // intentionally does not model. Keep the required body skeleton only; the
  // caller supplies optional, account-specific values using the exposed type.
  return requiredSchemaObject(api, schema, new Set(), 0);
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

  const method = sdkMethodExpression(api, operation);
  const lines = sdkClientSetup(api);

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
    `const result = await ${method}${call};`,
    "console.log(result);"
  );
  return lines.join("\n");
}

function sdkMethodExpression(
  api: CatalogApi,
  operation: CatalogOperation
): string {
  const contract = api.sdkContract!;
  const controller = operation.tag ? contract.controllers[operation.tag] : null;
  const sdkMethod = operation.sdkMethod ?? operation.operationId;
  return `${contract.client.identifier}.${
    controller ? `${controller}.` : ""
  }${sdkMethod}`;
}

function sdkClientSetup(api: CatalogApi): string[] {
  const contract = api.sdkContract!;
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
      .map(([name, value]) => {
        const expression = /^[A-Z][A-Z0-9_]*$/.test(value)
          ? `process.env.${value}!`
          : JSON.stringify(value);
        return `  ${name}: ${expression}`;
      })
      .join(",\n");
    lines.push(
      "",
      options
        ? `const ${contract.client.identifier} = ${contract.client.factory}({\n${options}\n});`
        : `const ${contract.client.identifier} = ${contract.client.factory}();`
    );
  }
  return lines;
}

/**
 * Compile-time probe for the installed SDK's public initialization and method
 * surface. Request argument generation is verified separately because complex
 * body examples can be incomplete even when the npm client contract is exact.
 */
export function generateSdkSurfaceProbe(
  api: CatalogApi,
  operation: CatalogOperation
): string {
  if (!api.sdkContract || !supportsSdkOperation(api, operation)) {
    throw new SdkCodegenUnavailableError(
      `${api.packageName}@${api.sdkVersion} does not include ${operation.operationId}`
    );
  }
  const lines = sdkClientSetup(api);
  lines.push(
    "",
    `const sdkMethod = ${sdkMethodExpression(api, operation)};`,
    "void sdkMethod;"
  );
  return lines.join("\n");
}
