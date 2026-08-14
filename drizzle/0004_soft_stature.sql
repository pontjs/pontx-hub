CREATE TABLE "ai_daily_usage" (
	"scope_key" text NOT NULL,
	"usage_date" text NOT NULL,
	"message_count" integer DEFAULT 0 NOT NULL,
	"reserved_cost_micros" bigint DEFAULT 0 NOT NULL,
	"actual_cost_micros" bigint DEFAULT 0 NOT NULL,
	"input_tokens" bigint DEFAULT 0 NOT NULL,
	"output_tokens" bigint DEFAULT 0 NOT NULL,
	"updated_at" timestamp with time zone DEFAULT now() NOT NULL,
	CONSTRAINT "ai_daily_usage_scope_key_usage_date_pk" PRIMARY KEY("scope_key","usage_date")
);
