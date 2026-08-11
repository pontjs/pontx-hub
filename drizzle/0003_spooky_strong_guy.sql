CREATE TABLE "user_playground_history" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"user_id" text NOT NULL,
	"api_slug" text NOT NULL,
	"operation_slug" text NOT NULL,
	"server_id" text NOT NULL,
	"path" jsonb DEFAULT '{}'::jsonb NOT NULL,
	"query" jsonb DEFAULT '{}'::jsonb NOT NULL,
	"headers" jsonb DEFAULT '{}'::jsonb NOT NULL,
	"request_body" jsonb,
	"has_request_body" boolean DEFAULT false NOT NULL,
	"omitted_fields" jsonb DEFAULT '[]'::jsonb NOT NULL,
	"response_status" integer NOT NULL,
	"duration_ms" integer NOT NULL,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL
);
--> statement-breakpoint
ALTER TABLE "user_playground_history" ADD CONSTRAINT "user_playground_history_user_id_user_id_fk" FOREIGN KEY ("user_id") REFERENCES "public"."user"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
CREATE INDEX "user_playground_history_user_created_index" ON "user_playground_history" USING btree ("user_id","created_at");--> statement-breakpoint
CREATE INDEX "user_playground_history_user_api_created_index" ON "user_playground_history" USING btree ("user_id","api_slug","created_at");