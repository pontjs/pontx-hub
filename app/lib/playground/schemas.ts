import { z } from "zod";

const scalarSchema = z.union([z.string(), z.number(), z.boolean()]);

export const playgroundAuthSchema = z.discriminatedUnion("type", [
  z.object({
    type: z.literal("apiKey"),
    schemeId: z.string().min(1),
    value: z.string().min(1).max(8192)
  }),
  z.object({
    type: z.enum(["bearer", "oauth2"]),
    schemeId: z.string().min(1),
    token: z.string().min(1).max(8192)
  }),
  z.object({
    type: z.literal("basic"),
    schemeId: z.string().min(1),
    username: z.string().max(2048),
    password: z.string().max(8192)
  })
]);

export const playgroundRequestSchema = z.object({
  apiSlug: z.string().regex(/^[a-z0-9-]+$/),
  operationSlug: z.string().regex(/^[a-z0-9-]+$/),
  serverId: z.string().regex(/^[a-z0-9-]+$/),
  path: z.record(z.string(), scalarSchema).default({}),
  query: z.record(z.string(), scalarSchema).default({}),
  headers: z
    .record(
      z.string().regex(/^[!#$%&'*+\-.^_`|~0-9A-Za-z]+$/),
      z.string().max(8192).refine((value) => !/[\r\n]/.test(value), {
        message: "Header values cannot contain line breaks"
      })
    )
    .default({}),
  body: z.unknown().optional(),
  auth: playgroundAuthSchema.optional()
});

export const playgroundExecuteSchema = playgroundRequestSchema.extend({
  confirmationToken: z.string().optional()
});

export type PlaygroundRequestInput = z.infer<typeof playgroundRequestSchema>;
export type PlaygroundExecuteInput = z.infer<typeof playgroundExecuteSchema>;

export type PreparedRequest = {
  apiSlug: string;
  operationSlug: string;
  method: string;
  url: string;
  headers: Record<string, string>;
  body?: string;
  proxyEnabled: boolean;
};

export type PlaygroundPreview = {
  method: string;
  url: string;
  headers: Record<string, string>;
  body?: unknown;
  curl: string;
  requiresConfirmation: boolean;
  confirmationToken?: string;
  proxyEnabled: boolean;
  warnings: string[];
};
