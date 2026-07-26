import {
  boolean,
  index,
  integer,
  jsonb,
  pgEnum,
  pgTable,
  text,
  timestamp,
  uniqueIndex,
  uuid
} from "drizzle-orm/pg-core";

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
