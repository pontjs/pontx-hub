import { z } from "zod";

const httpsUrlSchema = z.string().url().refine((value) => value.startsWith("https://"), {
  message: "OAuth endpoints must use HTTPS"
});

const localizedTextSchema = z.object({
  zh: z.string().min(1),
  en: z.string().min(1)
});

const documentationStatusSchema = z
  .enum(["official", "observed", "inferred"])
  .default("official");

const parameterSchema = z.object({
  name: z.string().min(1),
  in: z.enum(["path", "query", "header", "body"]),
  required: z.boolean().optional(),
  type: z.enum(["string", "number", "integer", "boolean", "object", "array"]),
  format: z.string().min(1).optional(),
  schemaName: z.string().min(1).optional(),
  enum: z.array(z.unknown()).optional(),
  default: z.unknown().optional(),
  const: z.unknown().optional(),
  multipleOf: z.number().optional(),
  minimum: z.number().optional(),
  maximum: z.number().optional(),
  exclusiveMinimum: z.union([z.number(), z.boolean()]).optional(),
  exclusiveMaximum: z.union([z.number(), z.boolean()]).optional(),
  minLength: z.number().int().nonnegative().optional(),
  maxLength: z.number().int().nonnegative().optional(),
  pattern: z.string().optional(),
  minItems: z.number().int().nonnegative().optional(),
  maxItems: z.number().int().nonnegative().optional(),
  uniqueItems: z.boolean().optional(),
  minProperties: z.number().int().nonnegative().optional(),
  maxProperties: z.number().int().nonnegative().optional(),
  nullable: z.boolean().optional(),
  readOnly: z.boolean().optional(),
  writeOnly: z.boolean().optional(),
  deprecated: z.boolean().optional(),
  examples: z.array(z.unknown()).optional(),
  description: localizedTextSchema.optional(),
  example: z.unknown().optional()
});

const payloadMetadataSchema = z.object({
  description: localizedTextSchema.optional(),
  contentTypes: z.array(z.string().min(1)).optional(),
  schemaType: z
    .enum(["string", "number", "integer", "boolean", "object", "array"])
    .optional(),
  schemaName: z.string().min(1).optional(),
  properties: z.array(z.string().min(1)).optional()
});

const responseMetadataSchema = payloadMetadataSchema.extend({
  status: z.string().min(1)
});

const requestScalarSchema = z.union([z.string(), z.number(), z.boolean()]);

const requestExampleInputSchema = z.object({
  in: z.enum(["path", "query", "header", "body"]),
  name: z.string().min(1),
  source: z.discriminatedUnion("kind", [
    z.object({
      kind: z.literal("operation"),
      operationId: z.string().min(1)
    }),
    z.object({
      kind: z.literal("runtime"),
      reason: z.string().min(1)
    })
  ])
});

const requestExampleSchema = z.object({
  id: z.string().regex(/^[a-z0-9]+(?:-[a-z0-9]+)*$/),
  title: localizedTextSchema,
  request: z.object({
    serverId: z.string().min(1).optional(),
    path: z.record(z.string(), requestScalarSchema).default({}),
    query: z.record(z.string(), requestScalarSchema).default({}),
    headers: z.record(z.string(), z.string()).default({}),
    body: z.unknown().optional()
  }),
  expectedStatus: z.string().regex(/^(?:2\d\d|2[xX]{2})$/),
  verifiedAt: z.string().date().optional(),
  completeness: z.enum(["ready", "requires-input"]),
  unresolved: z.array(requestExampleInputSchema).default([])
});

const operationSchema = z.object({
  slug: z.string().regex(/^[a-z0-9]+(?:-[a-z0-9]+)*$/),
  operationId: z.string().min(1),
  tag: z.string().min(1),
  method: z.enum(["GET", "POST", "PUT", "PATCH", "DELETE", "HEAD", "OPTIONS"]),
  path: z.string().startsWith("/"),
  title: localizedTextSchema,
  description: localizedTextSchema,
  contentType: z
    .enum(["application/json", "application/x-www-form-urlencoded"])
    .optional(),
  parameters: z.array(parameterSchema).default([]),
  requestBody: payloadMetadataSchema.optional(),
  responses: z.array(responseMetadataSchema).default([]),
  serverIds: z.array(z.string().min(1)).default([]),
  proxyHeaders: z
    .record(
      z.string().regex(/^[!#$%&'*+\-.^_`|~0-9A-Za-z]+$/),
      z.string().max(8192).refine((value) => !/[\r\n]/.test(value))
    )
    .default({}),
  proxyEnabled: z.boolean().default(true),
  proxyDisabledReason: localizedTextSchema.optional(),
  documentationStatus: documentationStatusSchema,
  evidenceUrls: z.array(z.string().url()).default([]),
  verifiedAt: z.string().date().optional(),
  stabilityNote: localizedTextSchema.optional(),
  security: z
    .array(
      z.object({
        schemeId: z.string().min(1),
        scopes: z.array(z.string()).default([])
      })
    )
    .optional(),
  requestExamples: z.array(requestExampleSchema).default([]),
  responseExample: z.unknown().optional(),
  deprecated: z.boolean().optional()
}).superRefine((operation, context) => {
  const exampleIds = new Set<string>();
  for (const [index, example] of operation.requestExamples.entries()) {
    if (exampleIds.has(example.id)) {
      context.addIssue({
        code: "custom",
        path: ["requestExamples", index, "id"],
        message: `Duplicate request example id: ${example.id}`
      });
    }
    exampleIds.add(example.id);
    if (example.completeness === "ready" && example.unresolved.length) {
      context.addIssue({
        code: "custom",
        path: ["requestExamples", index, "completeness"],
        message: "Ready request examples cannot contain unresolved inputs"
      });
    }
    if (example.completeness === "requires-input" && !example.unresolved.length) {
      context.addIssue({
        code: "custom",
        path: ["requestExamples", index, "completeness"],
        message: "Request examples marked requires-input need an unresolved input"
      });
    }
  }
});

const schemaPropertySchema = z.object({
  name: z.string().min(1),
  type: z.enum(["string", "number", "integer", "boolean", "object", "array"]),
  format: z.string().min(1).optional(),
  description: localizedTextSchema.optional(),
  required: z.boolean().optional(),
  ref: z.string().min(1).optional()
});

const catalogSchemaSchema = z.object({
  name: z.string().min(1),
  title: localizedTextSchema,
  description: localizedTextSchema,
  type: z.enum(["string", "number", "integer", "boolean", "object", "array"]),
  required: z.array(z.string()).default([]),
  properties: z.array(schemaPropertySchema).default([]),
  schema: z.record(z.string(), z.unknown()),
  localizedSchema: z.object({
    zh: z.record(z.string(), z.unknown()).optional(),
    en: z.record(z.string(), z.unknown()).optional()
  }).optional()
});

const serverSchema = z.object({
  id: z.string().regex(/^[a-z0-9-]+$/),
  url: z.string().url().refine((value) => value.startsWith("https://"), {
    message: "Catalog servers must use HTTPS"
  }),
  description: localizedTextSchema
});

const authSchema = z.discriminatedUnion("type", [
  z.object({
    id: z.string().min(1),
    type: z.literal("apiKey"),
    name: z.string().min(1),
    in: z.enum(["header", "query"]),
    envVar: z.string().regex(/^[A-Z][A-Z0-9_]*$/),
    description: localizedTextSchema
  }),
  z.object({
    id: z.string().min(1),
    type: z.literal("bearer"),
    envVar: z.string().regex(/^[A-Z][A-Z0-9_]*$/),
    description: localizedTextSchema
  }),
  z.object({
    id: z.string().min(1),
    type: z.literal("oauth2"),
    envVar: z.string().regex(/^[A-Z][A-Z0-9_]*$/),
    description: localizedTextSchema,
    tokenEndpointAuthMethod: z
      .enum(["client_secret_basic", "client_secret_post", "none"])
      .default("client_secret_basic"),
    pkce: z.enum(["required", "preferred", "unsupported"]).default("preferred"),
    credentialGuide: z
      .object({
        url: httpsUrlSchema,
        title: localizedTextSchema,
        steps: z.array(localizedTextSchema).min(1).max(8)
      })
      .optional(),
    flows: z
      .object({
        authorizationCode: z
          .object({
            authorizationUrl: httpsUrlSchema,
            tokenUrl: httpsUrlSchema,
            scopes: z.record(z.string(), z.string()).default({})
          })
          .optional(),
        clientCredentials: z
          .object({
            tokenUrl: httpsUrlSchema,
            scopes: z.record(z.string(), z.string()).default({})
          })
          .optional()
      })
      .optional()
  }),
  z.object({
    id: z.string().min(1),
    type: z.literal("basic"),
    usernameEnvVar: z.string().regex(/^[A-Z][A-Z0-9_]*$/),
    passwordEnvVar: z.string().regex(/^[A-Z][A-Z0-9_]*$/),
    description: localizedTextSchema
  })
]);

const javascriptIdentifierSchema = z
  .string()
  .regex(/^[A-Za-z_$][A-Za-z0-9_$]*$/);

const sdkContractSchema = z.object({
  client: z.discriminatedUnion("kind", [
    z.object({
      kind: z.literal("default"),
      identifier: javascriptIdentifierSchema
    }),
    z.object({
      kind: z.literal("named"),
      identifier: javascriptIdentifierSchema
    }),
    z.object({
      kind: z.literal("factory"),
      factory: javascriptIdentifierSchema,
      identifier: javascriptIdentifierSchema,
      options: z.record(
        javascriptIdentifierSchema,
        z.string().regex(/^[A-Z][A-Z0-9_]*$/)
      ).default({})
    })
  ]),
  auth: z.object({
    kind: z.literal("bearer-request-init"),
    envVar: z.string().regex(/^[A-Z][A-Z0-9_]*$/)
  }).optional(),
  controllers: z.record(z.string().min(1), javascriptIdentifierSchema),
  operations: z.array(z.string().min(1)).min(1)
});

export const catalogApiSchema = z
  .object({
    slug: z.string().regex(/^[a-z0-9]+(?:-[a-z0-9]+)*$/),
    name: z.string().min(1),
    provider: z.string().min(1),
    category: z.string().min(1),
    featured: z.boolean().default(false),
    sourceUrl: z.string().url(),
    license: z.string().min(1),
    attributionUrl: z.string().url(),
    approvedSha256: z.string().regex(/^(pending|[a-f0-9]{64})$/),
    title: localizedTextSchema,
    summary: localizedTextSchema,
    accent: z.string().regex(/^#[a-fA-F0-9]{6}$/),
    packageName: z
      .string()
      .regex(/^@pontx\/[a-z0-9]+(?:-[a-z0-9]+)*$/),
    sdkVersion: z.string().regex(/^\d+\.\d+\.\d+$/),
    sdkStatus: z.enum(["planned", "published"]).default("published"),
    sdkQuality: z
      .object({
        testedVersion: z.string().regex(/^\d+\.\d+\.\d+$/),
        unitTests: z.object({
          passed: z.number().int().nonnegative(),
          total: z.number().int().positive(),
          skipped: z.number().int().nonnegative()
        }),
        e2eStatus: z.enum(["passed", "failed"]),
        nodeVersions: z.array(z.string().regex(/^\d+$/)).min(1),
        sourceCommit: z.string().regex(/^[a-f0-9]{40}$/),
        testedAt: z.string().date(),
        repositoryUrl: httpsUrlSchema,
        workflowRunUrl: httpsUrlSchema
      })
      .optional(),
    sdkContract: sdkContractSchema.optional(),
    contentUpdatedAt: z.string().date().optional(),
    cliName: z.string().regex(/^[a-z0-9][a-z0-9-]*$/).optional(),
    sdkExamples: z
      .object({
        typescript: z.string().min(1),
        cli: z.string().min(1)
      })
      .optional(),
    proxyEnabled: z.boolean().default(false),
    documentationStatus: documentationStatusSchema,
    evidenceUrls: z.array(z.string().url()).default([]),
    verifiedAt: z.string().date().optional(),
    stabilityNote: localizedTextSchema.optional(),
    quickStart: z
      .object({
        operationSlug: z.string().regex(/^[a-z0-9]+(?:-[a-z0-9]+)*$/),
        requestExampleId: z.string().regex(/^[a-z0-9]+(?:-[a-z0-9]+)*$/)
      })
      .optional(),
    servers: z.array(serverSchema).min(1),
    auth: z.array(authSchema),
    operations: z.array(operationSchema).min(1),
    schemas: z.array(catalogSchemaSchema).default([])
  })
  .superRefine((api, context) => {
    if (api.sdkQuality) {
      if (api.sdkQuality.testedVersion !== api.sdkVersion) {
        context.addIssue({
          code: "custom",
          path: ["sdkQuality", "testedVersion"],
          message: "SDK quality evidence must match sdkVersion"
        });
      }
      if (
        api.sdkQuality.unitTests.passed + api.sdkQuality.unitTests.skipped >
        api.sdkQuality.unitTests.total
      ) {
        context.addIssue({
          code: "custom",
          path: ["sdkQuality", "unitTests"],
          message: "Passed and skipped unit tests cannot exceed the total"
        });
      }
      const repositoryUrl = new URL(api.sdkQuality.repositoryUrl);
      const workflowRunUrl = new URL(api.sdkQuality.workflowRunUrl);
      if (
        repositoryUrl.hostname !== "github.com" ||
        workflowRunUrl.origin !== repositoryUrl.origin ||
        !workflowRunUrl.pathname.startsWith(
          `${repositoryUrl.pathname}/actions/runs/`
        )
      ) {
        context.addIssue({
          code: "custom",
          path: ["sdkQuality", "workflowRunUrl"],
          message: "SDK quality workflow must belong to its GitHub repository"
        });
      }
    }

    if (api.sdkContract) {
      const contractOperations = new Set<string>();
      const authEnvVars = new Set(
        api.auth.flatMap((auth) =>
          auth.type === "basic"
            ? [auth.usernameEnvVar, auth.passwordEnvVar]
            : [auth.envVar]
        )
      );
      if (
        api.sdkContract.client.kind === "factory" &&
        Object.values(api.sdkContract.client.options).some(
          (envVar) => !authEnvVars.has(envVar)
        )
      ) {
        context.addIssue({
          code: "custom",
          path: ["sdkContract", "client", "options"],
          message: "SDK factory environment variables must be declared by API auth"
        });
      }
      if (
        api.sdkContract.auth &&
        !authEnvVars.has(api.sdkContract.auth.envVar)
      ) {
        context.addIssue({
          code: "custom",
          path: ["sdkContract", "auth", "envVar"],
          message: "SDK request auth environment variable must be declared by API auth"
        });
      }
      for (const [index, operationId] of api.sdkContract.operations.entries()) {
        if (contractOperations.has(operationId)) {
          context.addIssue({
            code: "custom",
            path: ["sdkContract", "operations", index],
            message: `Duplicate SDK contract operation: ${operationId}`
          });
        }
        contractOperations.add(operationId);
        const operation = api.operations.find(
          (candidate) => candidate.operationId === operationId
        );
        if (!operation) {
          context.addIssue({
            code: "custom",
            path: ["sdkContract", "operations", index],
            message: `Unknown SDK contract operation: ${operationId}`
          });
        } else if (!api.sdkContract.controllers[operation.tag]) {
          context.addIssue({
            code: "custom",
            path: ["sdkContract", "controllers"],
            message: `Missing SDK controller for tag: ${operation.tag}`
          });
        }
      }
    }

    const operationSlugs = new Set<string>();
    const operationIds = new Set<string>();
    for (const operation of api.operations) {
      if (operationSlugs.has(operation.slug)) {
        context.addIssue({
          code: "custom",
          path: ["operations"],
          message: `Duplicate operation slug: ${operation.slug}`
        });
      }
      operationSlugs.add(operation.slug);
      if (operationIds.has(operation.operationId)) {
        context.addIssue({
          code: "custom",
          path: ["operations"],
          message: `Duplicate operation id: ${operation.operationId}`
        });
      }
      operationIds.add(operation.operationId);
    }

    if (api.quickStart) {
      const operation = api.operations.find(
        (item) => item.slug === api.quickStart?.operationSlug
      );
      if (!operation) {
        context.addIssue({
          code: "custom",
          path: ["quickStart", "operationSlug"],
          message: `Quick Start operation not found: ${api.quickStart.operationSlug}`
        });
      } else if (
        !operation.requestExamples.some(
          (example) => example.id === api.quickStart?.requestExampleId
        )
      ) {
        context.addIssue({
          code: "custom",
          path: ["quickStart", "requestExampleId"],
          message: `Quick Start request example not found: ${api.quickStart.requestExampleId}`
        });
      } else if (
        operation.requestExamples.find(
          (example) => example.id === api.quickStart?.requestExampleId
        )?.completeness !== "ready"
      ) {
        context.addIssue({
          code: "custom",
          path: ["quickStart", "requestExampleId"],
          message: "Quick Start request example must be ready to send"
        });
      }
    }

    const serverIds = new Set<string>();
    for (const server of api.servers) {
      if (serverIds.has(server.id)) {
        context.addIssue({
          code: "custom",
          path: ["servers"],
          message: `Duplicate server id: ${server.id}`
        });
      }
      serverIds.add(server.id);
    }

    for (const [operationIndex, operation] of api.operations.entries()) {
      for (const serverId of operation.serverIds) {
        if (!serverIds.has(serverId)) {
          context.addIssue({
            code: "custom",
            path: ["operations", operationIndex, "serverIds"],
            message: `Unknown operation server id: ${serverId}`
          });
        }
      }
      for (const [exampleIndex, example] of operation.requestExamples.entries()) {
        if (example.request.serverId && !serverIds.has(example.request.serverId)) {
          context.addIssue({
            code: "custom",
            path: ["operations", operationIndex, "requestExamples", exampleIndex, "request", "serverId"],
            message: `Unknown request example server id: ${example.request.serverId}`
          });
        }
        for (const [inputIndex, input] of example.unresolved.entries()) {
          if (input.source.kind === "operation" && !operationIds.has(input.source.operationId)) {
            context.addIssue({
              code: "custom",
              path: ["operations", operationIndex, "requestExamples", exampleIndex, "unresolved", inputIndex],
              message: `Unknown source operation id: ${input.source.operationId}`
            });
          }
        }
      }
    }
  });
