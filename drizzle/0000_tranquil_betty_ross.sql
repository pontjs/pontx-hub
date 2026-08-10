CREATE TYPE "public"."release_status" AS ENUM('pending', 'published', 'failed');--> statement-breakpoint
CREATE TYPE "public"."spec_status" AS ENUM('candidate', 'approved', 'active', 'rejected');--> statement-breakpoint
CREATE TABLE "account" (
	"id" text PRIMARY KEY NOT NULL,
	"user_id" text NOT NULL,
	"account_id" text NOT NULL,
	"provider_id" text NOT NULL,
	"access_token" text,
	"refresh_token" text,
	"access_token_expires_at" timestamp with time zone,
	"refresh_token_expires_at" timestamp with time zone,
	"scope" text,
	"id_token" text,
	"password" text,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL,
	"updated_at" timestamp with time zone DEFAULT now() NOT NULL
);
--> statement-breakpoint
CREATE TABLE "session" (
	"id" text PRIMARY KEY NOT NULL,
	"user_id" text NOT NULL,
	"token" text NOT NULL,
	"expires_at" timestamp with time zone NOT NULL,
	"ip_address" text,
	"user_agent" text,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL,
	"updated_at" timestamp with time zone DEFAULT now() NOT NULL
);
--> statement-breakpoint
CREATE TABLE "user" (
	"id" text PRIMARY KEY NOT NULL,
	"name" text NOT NULL,
	"email" text NOT NULL,
	"email_verified" boolean DEFAULT false NOT NULL,
	"image" text,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL,
	"updated_at" timestamp with time zone DEFAULT now() NOT NULL
);
--> statement-breakpoint
CREATE TABLE "verification" (
	"id" text PRIMARY KEY NOT NULL,
	"identifier" text NOT NULL,
	"value" text NOT NULL,
	"expires_at" timestamp with time zone NOT NULL,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL,
	"updated_at" timestamp with time zone DEFAULT now() NOT NULL
);
--> statement-breakpoint
CREATE TABLE "catalog_apis" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"slug" text NOT NULL,
	"name" text NOT NULL,
	"provider" text NOT NULL,
	"category" text NOT NULL,
	"title" jsonb NOT NULL,
	"summary" jsonb NOT NULL,
	"package_name" text NOT NULL,
	"proxy_enabled" boolean DEFAULT false NOT NULL,
	"active_spec_version_id" uuid,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL,
	"updated_at" timestamp with time zone DEFAULT now() NOT NULL
);
--> statement-breakpoint
CREATE TABLE "operations" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"spec_version_id" uuid NOT NULL,
	"slug" text NOT NULL,
	"operation_id" text NOT NULL,
	"tag" text NOT NULL,
	"method" text NOT NULL,
	"path" text NOT NULL,
	"title" jsonb NOT NULL,
	"description" jsonb NOT NULL,
	"parameters" jsonb DEFAULT '[]'::jsonb NOT NULL,
	"deprecated" boolean DEFAULT false NOT NULL
);
--> statement-breakpoint
CREATE TABLE "sdk_releases" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"api_id" uuid NOT NULL,
	"spec_version_id" uuid NOT NULL,
	"package_name" text NOT NULL,
	"version" text NOT NULL,
	"status" "release_status" DEFAULT 'pending' NOT NULL,
	"npm_url" text,
	"provenance_url" text,
	"build_number" integer,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL,
	"published_at" timestamp with time zone
);
--> statement-breakpoint
CREATE TABLE "spec_candidates" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"api_id" uuid NOT NULL,
	"sha256" text NOT NULL,
	"etag" text,
	"source_last_modified" text,
	"raw_blob_url" text NOT NULL,
	"detected_at" timestamp with time zone DEFAULT now() NOT NULL,
	"accepted_at" timestamp with time zone,
	"rejected_at" timestamp with time zone
);
--> statement-breakpoint
CREATE TABLE "spec_versions" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"api_id" uuid NOT NULL,
	"sha256" text NOT NULL,
	"source_url" text NOT NULL,
	"raw_blob_url" text NOT NULL,
	"normalized_blob_url" text NOT NULL,
	"status" "spec_status" DEFAULT 'candidate' NOT NULL,
	"breaking_changes" jsonb DEFAULT '[]'::jsonb NOT NULL,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL,
	"activated_at" timestamp with time zone
);
--> statement-breakpoint
ALTER TABLE "account" ADD CONSTRAINT "account_user_id_user_id_fk" FOREIGN KEY ("user_id") REFERENCES "public"."user"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "session" ADD CONSTRAINT "session_user_id_user_id_fk" FOREIGN KEY ("user_id") REFERENCES "public"."user"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
CREATE UNIQUE INDEX "account_provider_account_unique" ON "account" USING btree ("provider_id","account_id");--> statement-breakpoint
CREATE INDEX "account_user_id_index" ON "account" USING btree ("user_id");--> statement-breakpoint
CREATE UNIQUE INDEX "session_token_unique" ON "session" USING btree ("token");--> statement-breakpoint
CREATE INDEX "session_user_id_index" ON "session" USING btree ("user_id");--> statement-breakpoint
CREATE UNIQUE INDEX "user_email_unique" ON "user" USING btree ("email");--> statement-breakpoint
CREATE INDEX "verification_identifier_index" ON "verification" USING btree ("identifier");--> statement-breakpoint
CREATE UNIQUE INDEX "catalog_apis_slug_unique" ON "catalog_apis" USING btree ("slug");--> statement-breakpoint
CREATE UNIQUE INDEX "catalog_apis_package_unique" ON "catalog_apis" USING btree ("package_name");--> statement-breakpoint
CREATE UNIQUE INDEX "operations_spec_slug_unique" ON "operations" USING btree ("spec_version_id","slug");--> statement-breakpoint
CREATE INDEX "operations_operation_id_index" ON "operations" USING btree ("operation_id");--> statement-breakpoint
CREATE UNIQUE INDEX "sdk_releases_package_version_unique" ON "sdk_releases" USING btree ("package_name","version");--> statement-breakpoint
CREATE UNIQUE INDEX "spec_candidates_api_sha_unique" ON "spec_candidates" USING btree ("api_id","sha256");--> statement-breakpoint
CREATE UNIQUE INDEX "spec_versions_api_sha_unique" ON "spec_versions" USING btree ("api_id","sha256");--> statement-breakpoint
CREATE INDEX "spec_versions_status_index" ON "spec_versions" USING btree ("status");