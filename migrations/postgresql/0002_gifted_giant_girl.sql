CREATE TABLE "initial_access_tokens" (
	"id" text PRIMARY KEY NOT NULL,
	"expires_at" integer,
	"payload" jsonb
);
--> statement-breakpoint
CREATE TABLE "interactions" (
	"id" text PRIMARY KEY NOT NULL,
	"expires_at" integer,
	"payload" jsonb
);
--> statement-breakpoint
CREATE TABLE "registration_access_tokens" (
	"id" text PRIMARY KEY NOT NULL,
	"grant_id" text,
	"expires_at" integer,
	"payload" jsonb
);
--> statement-breakpoint
CREATE INDEX "initial_access_tokens_expires_at_idx" ON "initial_access_tokens" USING btree ("expires_at");--> statement-breakpoint
CREATE INDEX "interactions_expires_at_idx" ON "interactions" USING btree ("expires_at");--> statement-breakpoint
CREATE INDEX "registration_access_tokens_grant_id_idx" ON "registration_access_tokens" USING btree ("grant_id");--> statement-breakpoint
CREATE INDEX "registration_access_tokens_expires_at_idx" ON "registration_access_tokens" USING btree ("expires_at");