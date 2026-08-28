CREATE TABLE "user_project_apis" (
	"project_id" uuid NOT NULL,
	"api_slug" text NOT NULL,
	"position" integer DEFAULT 0 NOT NULL,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL,
	CONSTRAINT "user_project_apis_project_id_api_slug_pk" PRIMARY KEY("project_id","api_slug")
);
--> statement-breakpoint
CREATE TABLE "user_projects" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"user_id" text NOT NULL,
	"name" text NOT NULL,
	"description" text DEFAULT '' NOT NULL,
	"automation_enabled" boolean DEFAULT false NOT NULL,
	"read_only_mode" text DEFAULT 'preview' NOT NULL,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL,
	"updated_at" timestamp with time zone DEFAULT now() NOT NULL
);
--> statement-breakpoint
ALTER TABLE "user_project_apis" ADD CONSTRAINT "user_project_apis_project_id_user_projects_id_fk" FOREIGN KEY ("project_id") REFERENCES "public"."user_projects"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "user_projects" ADD CONSTRAINT "user_projects_user_id_user_id_fk" FOREIGN KEY ("user_id") REFERENCES "public"."user"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
CREATE INDEX "user_project_apis_project_position_index" ON "user_project_apis" USING btree ("project_id","position");--> statement-breakpoint
CREATE INDEX "user_projects_user_updated_index" ON "user_projects" USING btree ("user_id","updated_at");