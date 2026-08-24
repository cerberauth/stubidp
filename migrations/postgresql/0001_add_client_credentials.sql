CREATE TABLE "client_credentials" (
	"id" text PRIMARY KEY NOT NULL,
	"grant_id" text,
	"expires_at" integer,
	"payload" jsonb
);
--> statement-breakpoint
CREATE INDEX "client_credentials_grant_id_idx" ON "client_credentials" USING btree ("grant_id");--> statement-breakpoint
CREATE INDEX "client_credentials_expires_at_idx" ON "client_credentials" USING btree ("expires_at");