import { z } from "zod";

const localizedTextSchema = z.object({
  zh: z.string().min(1),
  en: z.string().min(1)
});

const parameterSchema = z.object({
  name: z.string().min(1),
  in: z.enum(["path", "query", "header", "body"]),
  required: z.boolean().optional(),
  type: z.enum(["string", "number", "integer", "boolean", "object", "array"]),
  description: localizedTextSchema.optional(),
  example: z.unknown().optional()
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
  responseExample: z.unknown().optional(),
  deprecated: z.boolean().optional()
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
  schema: z.record(z.string(), z.unknown())
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
    type: z.enum(["bearer", "oauth2"]),
    envVar: z.string().regex(/^[A-Z][A-Z0-9_]*$/),
    description: localizedTextSchema
  }),
  z.object({
    id: z.string().min(1),
    type: z.literal("basic"),
    usernameEnvVar: z.string().regex(/^[A-Z][A-Z0-9_]*$/),
    passwordEnvVar: z.string().regex(/^[A-Z][A-Z0-9_]*$/),
    description: localizedTextSchema
  })
]);

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
    packageName: z.string().regex(/^@pontx\/api-[a-z0-9-]+$/),
    sdkVersion: z.string().regex(/^\d+\.\d+\.\d+$/),
    sdkStatus: z.enum(["planned", "published"]).default("published"),
    proxyEnabled: z.boolean().default(false),
    servers: z.array(serverSchema).min(1),
    auth: z.array(authSchema),
    operations: z.array(operationSchema).min(1),
    schemas: z.array(catalogSchemaSchema).default([])
  })
  .superRefine((api, context) => {
    const operationSlugs = new Set<string>();
    for (const operation of api.operations) {
      if (operationSlugs.has(operation.slug)) {
        context.addIssue({
          code: "custom",
          path: ["operations"],
          message: `Duplicate operation slug: ${operation.slug}`
        });
      }
      operationSlugs.add(operation.slug);
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
  });
