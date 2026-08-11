CREATE TABLE "user_api_favorites" (
	"user_id" text NOT NULL,
	"api_slug" text NOT NULL,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL,
	CONSTRAINT "user_api_favorites_user_id_api_slug_pk" PRIMARY KEY("user_id","api_slug")
);
--> statement-breakpoint
ALTER TABLE "user_api_favorites" ADD CONSTRAINT "user_api_favorites_user_id_user_id_fk" FOREIGN KEY ("user_id") REFERENCES "public"."user"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
CREATE INDEX "user_api_favorites_user_created_index" ON "user_api_favorites" USING btree ("user_id","created_at");