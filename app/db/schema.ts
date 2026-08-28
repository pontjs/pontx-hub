import { sql } from "drizzle-orm";
import {
  bigint,
  boolean,
  foreignKey,
  index,
  integer,
  jsonb,
  pgEnum,
  primaryKey,
  pgTable,
  text,
  timestamp,
  uniqueIndex,
  uuid
} from "drizzle-orm/pg-core";

export const authUsers = pgTable(
  "user",
  {
    id: text("id").primaryKey(),
    name: text("name").notNull(),
    email: text("email").notNull(),
    emailVerified: boolean("email_verified").notNull().default(false),
    image: text("image"),
    createdAt: timestamp("created_at", { withTimezone: true }).notNull().defaultNow(),
    updatedAt: timestamp("updated_at", { withTimezone: true }).notNull().defaultNow()
  },
  (table) => [uniqueIndex("user_email_unique").on(table.email)]
);

export const authSessions = pgTable(
  "session",
  {
    id: text("id").primaryKey(),
    userId: text("user_id").notNull(),
    token: text("token").notNull(),
    expiresAt: timestamp("expires_at", { withTimezone: true }).notNull(),
    ipAddress: text("ip_address"),
    userAgent: text("user_agent"),
    createdAt: timestamp("created_at", { withTimezone: true }).notNull().defaultNow(),
    updatedAt: timestamp("updated_at", { withTimezone: true }).notNull().defaultNow()
  },
  (table) => [
    uniqueIndex("session_token_unique").on(table.token),
    index("session_user_id_index").on(table.userId),
    foreignKey({ columns: [table.userId], foreignColumns: [authUsers.id] })
      .onDelete("cascade")
  ]
);

export const authAccounts = pgTable(
  "account",
  {
    id: text("id").primaryKey(),
    userId: text("user_id").notNull(),
    accountId: text("account_id").notNull(),
    providerId: text("provider_id").notNull(),
    accessToken: text("access_token"),
    refreshToken: text("refresh_token"),
    accessTokenExpiresAt: timestamp("access_token_expires_at", { withTimezone: true }),
    refreshTokenExpiresAt: timestamp("refresh_token_expires_at", { withTimezone: true }),
    scope: text("scope"),
    idToken: text("id_token"),
    password: text("password"),
    createdAt: timestamp("created_at", { withTimezone: true }).notNull().defaultNow(),
    updatedAt: timestamp("updated_at", { withTimezone: true }).notNull().defaultNow()
  },
  (table) => [
    uniqueIndex("account_provider_account_unique").on(table.providerId, table.accountId),
    index("account_user_id_index").on(table.userId),
    foreignKey({ columns: [table.userId], foreignColumns: [authUsers.id] })
      .onDelete("cascade")
  ]
);

export const authVerifications = pgTable(
  "verification",
  {
    id: text("id").primaryKey(),
    identifier: text("identifier").notNull(),
    value: text("value").notNull(),
    expiresAt: timestamp("expires_at", { withTimezone: true }).notNull(),
    createdAt: timestamp("created_at", { withTimezone: true }).notNull().defaultNow(),
    updatedAt: timestamp("updated_at", { withTimezone: true }).notNull().defaultNow()
  },
  (table) => [index("verification_identifier_index").on(table.identifier)]
);

export const authRateLimits = pgTable(
  "rateLimit",
  {
    id: text("id").primaryKey(),
    key: text("key").notNull(),
    count: integer("count").notNull(),
    lastRequest: bigint("last_request", { mode: "number" }).notNull()
  },
  (table) => [uniqueIndex("rate_limit_key_unique").on(table.key)]
);

export const userApiFavorites = pgTable(
  "user_api_favorites",
  {
    userId: text("user_id").notNull(),
    apiSlug: text("api_slug").notNull(),
    createdAt: timestamp("created_at", { withTimezone: true }).notNull().defaultNow()
  },
  (table) => [
    primaryKey({ columns: [table.userId, table.apiSlug] }),
    index("user_api_favorites_user_created_index").on(table.userId, table.createdAt),
    foreignKey({ columns: [table.userId], foreignColumns: [authUsers.id] })
      .onDelete("cascade")
  ]
);

export const userPlaygroundHistory = pgTable(
  "user_playground_history",
  {
    id: uuid("id").primaryKey().defaultRandom(),
    userId: text("user_id").notNull(),
    apiSlug: text("api_slug").notNull(),
    operationSlug: text("operation_slug").notNull(),
    serverId: text("server_id").notNull(),
    path: jsonb("path")
      .$type<Record<string, string | number | boolean>>()
      .notNull()
      .default({}),
    query: jsonb("query")
      .$type<Record<string, string | number | boolean>>()
      .notNull()
      .default({}),
    headers: jsonb("headers")
      .$type<Record<string, string>>()
      .notNull()
      .default({}),
    requestBody: jsonb("request_body"),
    hasRequestBody: boolean("has_request_body").notNull().default(false),
    omittedFields: jsonb("omitted_fields")
      .$type<string[]>()
      .notNull()
      .default([]),
    responseStatus: integer("response_status").notNull(),
    durationMs: integer("duration_ms").notNull(),
    createdAt: timestamp("created_at", { withTimezone: true })
      .notNull()
      .defaultNow()
  },
  (table) => [
    index("user_playground_history_user_created_index").on(
      table.userId,
      table.createdAt
    ),
    index("user_playground_history_user_api_created_index").on(
      table.userId,
      table.apiSlug,
      table.createdAt
    ),
    foreignKey({ columns: [table.userId], foreignColumns: [authUsers.id] })
      .onDelete("cascade")
  ]
);

export const userProjects = pgTable(
  "user_projects",
  {
    id: uuid("id").primaryKey().defaultRandom(),
    userId: text("user_id").notNull(),
    name: text("name").notNull(),
    description: text("description").notNull().default(""),
    isPersonal: boolean("is_personal").notNull().default(false),
    automationEnabled: boolean("automation_enabled").notNull().default(false),
    readOnlyMode: text("read_only_mode")
      .$type<"preview" | "execute_after_preview">()
      .notNull()
      .default("preview"),
    createdAt: timestamp("created_at", { withTimezone: true }).notNull().defaultNow(),
    updatedAt: timestamp("updated_at", { withTimezone: true }).notNull().defaultNow()
  },
  (table) => [
    index("user_projects_user_updated_index").on(table.userId, table.updatedAt),
    uniqueIndex("user_projects_personal_user_unique")
      .on(table.userId)
      .where(sql`${table.isPersonal} = true`),
    foreignKey({ columns: [table.userId], foreignColumns: [authUsers.id] })
      .onDelete("cascade")
  ]
);

export const userProjectApis = pgTable(
  "user_project_apis",
  {
    projectId: uuid("project_id").notNull(),
    apiSlug: text("api_slug").notNull(),
    position: integer("position").notNull().default(0),
    createdAt: timestamp("created_at", { withTimezone: true }).notNull().defaultNow()
  },
  (table) => [
    primaryKey({ columns: [table.projectId, table.apiSlug] }),
    index("user_project_apis_project_position_index").on(table.projectId, table.position),
    foreignKey({ columns: [table.projectId], foreignColumns: [userProjects.id] })
      .onDelete("cascade")
  ]
);

export const aiDailyUsage = pgTable(
  "ai_daily_usage",
  {
    scopeKey: text("scope_key").notNull(),
    usageDate: text("usage_date").notNull(),
    messageCount: integer("message_count").notNull().default(0),
    reservedCostMicros: bigint("reserved_cost_micros", { mode: "number" })
      .notNull()
      .default(0),
    actualCostMicros: bigint("actual_cost_micros", { mode: "number" })
      .notNull()
      .default(0),
    inputTokens: bigint("input_tokens", { mode: "number" }).notNull().default(0),
    outputTokens: bigint("output_tokens", { mode: "number" }).notNull().default(0),
    updatedAt: timestamp("updated_at", { withTimezone: true }).notNull().defaultNow()
  },
  (table) => [primaryKey({ columns: [table.scopeKey, table.usageDate] })]
);

export const specStatus = pgEnum("spec_status", [
  "candidate",
  "approved",
  "active",
  "rejected"
]);

export const releaseStatus = pgEnum("release_status", [
  "pending",
  "published",
  "failed"
]);

export const catalogApis = pgTable(
  "catalog_apis",
  {
    id: uuid("id").primaryKey().defaultRandom(),
    slug: text("slug").notNull(),
    name: text("name").notNull(),
    provider: text("provider").notNull(),
    category: text("category").notNull(),
    title: jsonb("title").notNull(),
    summary: jsonb("summary").notNull(),
    packageName: text("package_name").notNull(),
    proxyEnabled: boolean("proxy_enabled").notNull().default(false),
    activeSpecVersionId: uuid("active_spec_version_id"),
    createdAt: timestamp("created_at", { withTimezone: true }).notNull().defaultNow(),
    updatedAt: timestamp("updated_at", { withTimezone: true }).notNull().defaultNow()
  },
  (table) => [
    uniqueIndex("catalog_apis_slug_unique").on(table.slug),
    uniqueIndex("catalog_apis_package_unique").on(table.packageName)
  ]
);

export const specVersions = pgTable(
  "spec_versions",
  {
    id: uuid("id").primaryKey().defaultRandom(),
    apiId: uuid("api_id").notNull(),
    sha256: text("sha256").notNull(),
    sourceUrl: text("source_url").notNull(),
    rawBlobUrl: text("raw_blob_url").notNull(),
    normalizedBlobUrl: text("normalized_blob_url").notNull(),
    status: specStatus("status").notNull().default("candidate"),
    breakingChanges: jsonb("breaking_changes").notNull().default([]),
    createdAt: timestamp("created_at", { withTimezone: true }).notNull().defaultNow(),
    activatedAt: timestamp("activated_at", { withTimezone: true })
  },
  (table) => [
    uniqueIndex("spec_versions_api_sha_unique").on(table.apiId, table.sha256),
    index("spec_versions_status_index").on(table.status)
  ]
);

export const operations = pgTable(
  "operations",
  {
    id: uuid("id").primaryKey().defaultRandom(),
    specVersionId: uuid("spec_version_id").notNull(),
    slug: text("slug").notNull(),
    operationId: text("operation_id").notNull(),
    tag: text("tag").notNull(),
    method: text("method").notNull(),
    path: text("path").notNull(),
    title: jsonb("title").notNull(),
    description: jsonb("description").notNull(),
    parameters: jsonb("parameters").notNull().default([]),
    deprecated: boolean("deprecated").notNull().default(false)
  },
  (table) => [
    uniqueIndex("operations_spec_slug_unique").on(
      table.specVersionId,
      table.slug
    ),
    index("operations_operation_id_index").on(table.operationId)
  ]
);

export const specCandidates = pgTable(
  "spec_candidates",
  {
    id: uuid("id").primaryKey().defaultRandom(),
    apiId: uuid("api_id").notNull(),
    sha256: text("sha256").notNull(),
    etag: text("etag"),
    sourceLastModified: text("source_last_modified"),
    rawBlobUrl: text("raw_blob_url").notNull(),
    detectedAt: timestamp("detected_at", { withTimezone: true }).notNull().defaultNow(),
    acceptedAt: timestamp("accepted_at", { withTimezone: true }),
    rejectedAt: timestamp("rejected_at", { withTimezone: true })
  },
  (table) => [
    uniqueIndex("spec_candidates_api_sha_unique").on(table.apiId, table.sha256)
  ]
);

export const sdkReleases = pgTable(
  "sdk_releases",
  {
    id: uuid("id").primaryKey().defaultRandom(),
    apiId: uuid("api_id").notNull(),
    specVersionId: uuid("spec_version_id").notNull(),
    packageName: text("package_name").notNull(),
    version: text("version").notNull(),
    status: releaseStatus("status").notNull().default("pending"),
    npmUrl: text("npm_url"),
    provenanceUrl: text("provenance_url"),
    buildNumber: integer("build_number"),
    createdAt: timestamp("created_at", { withTimezone: true }).notNull().defaultNow(),
    publishedAt: timestamp("published_at", { withTimezone: true })
  },
  (table) => [
    uniqueIndex("sdk_releases_package_version_unique").on(
      table.packageName,
      table.version
    )
  ]
);
