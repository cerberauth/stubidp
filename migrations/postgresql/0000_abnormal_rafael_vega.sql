CREATE TABLE "access_tokens" (
	"id" text PRIMARY KEY NOT NULL,
	"grant_id" text,
	"expires_at" integer,
	"payload" jsonb
);
--> statement-breakpoint
CREATE TABLE "authorization_codes" (
	"id" text PRIMARY KEY NOT NULL,
	"grant_id" text,
	"expires_at" integer,
	"payload" jsonb
);
--> statement-breakpoint
CREATE TABLE "backchannel_authentication_requests" (
	"id" text PRIMARY KEY NOT NULL,
	"grant_id" text,
	"expires_at" integer,
	"payload" jsonb
);
--> statement-breakpoint
CREATE TABLE "clients" (
	"client_id" text PRIMARY KEY NOT NULL,
	"client_secret" text,
	"redirect_uris" jsonb DEFAULT '[]'::jsonb,
	"response_types" jsonb DEFAULT '[]'::jsonb,
	"grant_types" jsonb DEFAULT '[]'::jsonb,
	"token_endpoint_auth_method" text,
	"client_name" text,
	"logo_uri" text,
	"policy_uri" text,
	"tos_uri" text,
	"initiate_login_uri" text,
	"post_logout_redirect_uris" jsonb DEFAULT '[]'::jsonb,
	"id_token_signed_response_alg" text,
	"userinfo_signed_response_alg" text,
	"payload" jsonb
);
--> statement-breakpoint
CREATE TABLE "device_codes" (
	"id" text PRIMARY KEY NOT NULL,
	"grant_id" text,
	"expires_at" integer,
	"payload" jsonb
);
--> statement-breakpoint
CREATE TABLE "grants" (
	"id" text PRIMARY KEY NOT NULL,
	"client_id" text,
	"account_id" text,
	"scopes" jsonb DEFAULT '[]'::jsonb,
	"expires_at" integer,
	"payload" jsonb
);
--> statement-breakpoint
CREATE TABLE "refresh_tokens" (
	"id" text PRIMARY KEY NOT NULL,
	"grant_id" text,
	"expires_at" integer,
	"payload" jsonb
);
--> statement-breakpoint
CREATE TABLE "sessions" (
	"id" text PRIMARY KEY NOT NULL,
	"uid" text,
	"expires_at" integer,
	"payload" jsonb
);
--> statement-breakpoint
CREATE INDEX "access_tokens_grant_id_idx" ON "access_tokens" USING btree ("grant_id");--> statement-breakpoint
CREATE INDEX "access_tokens_expires_at_idx" ON "access_tokens" USING btree ("expires_at");--> statement-breakpoint
CREATE INDEX "authorization_codes_grant_id_idx" ON "authorization_codes" USING btree ("grant_id");--> statement-breakpoint
CREATE INDEX "authorization_codes_expires_at_idx" ON "authorization_codes" USING btree ("expires_at");--> statement-breakpoint
CREATE INDEX "backchannel_auth_grant_id_idx" ON "backchannel_authentication_requests" USING btree ("grant_id");--> statement-breakpoint
CREATE INDEX "backchannel_auth_expires_at_idx" ON "backchannel_authentication_requests" USING btree ("expires_at");--> statement-breakpoint
CREATE INDEX "device_codes_grant_id_idx" ON "device_codes" USING btree ("grant_id");--> statement-breakpoint
CREATE INDEX "device_codes_expires_at_idx" ON "device_codes" USING btree ("expires_at");--> statement-breakpoint
CREATE INDEX "grants_client_id_idx" ON "grants" USING btree ("client_id");--> statement-breakpoint
CREATE INDEX "grants_account_id_idx" ON "grants" USING btree ("account_id");--> statement-breakpoint
CREATE INDEX "grants_expires_at_idx" ON "grants" USING btree ("expires_at");--> statement-breakpoint
CREATE INDEX "refresh_tokens_grant_id_idx" ON "refresh_tokens" USING btree ("grant_id");--> statement-breakpoint
CREATE INDEX "refresh_tokens_expires_at_idx" ON "refresh_tokens" USING btree ("expires_at");--> statement-breakpoint
CREATE INDEX "sessions_uid_idx" ON "sessions" USING btree ("uid");--> statement-breakpoint
CREATE INDEX "sessions_expires_at_idx" ON "sessions" USING btree ("expires_at");