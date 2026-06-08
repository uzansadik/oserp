CREATE TABLE "iam_api_credentials" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"company_id" uuid NOT NULL,
	"name" varchar(100) NOT NULL,
	"prefix" varchar(8) NOT NULL,
	"secret_hash" text NOT NULL,
	"status" varchar(20) NOT NULL,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL,
	"last_rotated_at" timestamp with time zone
);
--> statement-breakpoint
CREATE TABLE "iam_membership_roles" (
	"membership_id" uuid NOT NULL,
	"role_id" uuid NOT NULL,
	CONSTRAINT "iam_membership_roles_membership_id_role_id_pk" PRIMARY KEY("membership_id","role_id")
);
--> statement-breakpoint
CREATE TABLE "iam_memberships" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"user_id" uuid NOT NULL,
	"company_id" uuid NOT NULL,
	"status" varchar(20) NOT NULL,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL,
	"updated_at" timestamp with time zone DEFAULT now() NOT NULL
);
--> statement-breakpoint
CREATE TABLE "iam_outbox" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"event_name" varchar(100) NOT NULL,
	"aggregate_id" uuid NOT NULL,
	"payload" text NOT NULL,
	"occurred_on" timestamp with time zone NOT NULL,
	"published_at" timestamp with time zone,
	"published" boolean DEFAULT false NOT NULL,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL
);
--> statement-breakpoint
CREATE TABLE "iam_permissions" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"module" varchar(50) NOT NULL,
	"resource" varchar(80) NOT NULL,
	"action" varchar(50) NOT NULL,
	"code" varchar(200) NOT NULL,
	"description" text,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL
);
--> statement-breakpoint
CREATE TABLE "iam_role_permissions" (
	"role_id" uuid NOT NULL,
	"permission_code" varchar(200) NOT NULL,
	CONSTRAINT "iam_role_permissions_role_id_permission_code_pk" PRIMARY KEY("role_id","permission_code")
);
--> statement-breakpoint
CREATE TABLE "iam_roles" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"company_id" uuid,
	"name" varchar(50) NOT NULL,
	"display_name" varchar(100) NOT NULL,
	"description" text,
	"is_system_role" boolean DEFAULT false NOT NULL,
	"status" varchar(20) NOT NULL,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL,
	"updated_at" timestamp with time zone DEFAULT now() NOT NULL
);
--> statement-breakpoint
CREATE TABLE "iam_sessions" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"user_id" uuid NOT NULL,
	"refresh_token_hash" text NOT NULL,
	"status" varchar(20) NOT NULL,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL,
	"expires_at" timestamp with time zone NOT NULL,
	"last_refreshed_at" timestamp with time zone DEFAULT now() NOT NULL
);
--> statement-breakpoint
CREATE TABLE "iam_users" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"first_name" varchar(100) NOT NULL,
	"last_name" varchar(100) NOT NULL,
	"email" varchar(255) NOT NULL,
	"username" varchar(20) NOT NULL,
	"status" varchar(20) NOT NULL,
	"is_email_verified" boolean DEFAULT false NOT NULL,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL,
	"updated_at" timestamp with time zone DEFAULT now() NOT NULL
);
--> statement-breakpoint
CREATE TABLE "iam_user_credentials" (
	"user_id" uuid PRIMARY KEY NOT NULL,
	"password_hash" text NOT NULL,
	"password_updated_at" timestamp with time zone DEFAULT now() NOT NULL,
	"must_change_password" boolean DEFAULT false NOT NULL
);
--> statement-breakpoint
ALTER TABLE "iam_membership_roles" ADD CONSTRAINT "iam_membership_roles_membership_id_iam_memberships_id_fk" FOREIGN KEY ("membership_id") REFERENCES "public"."iam_memberships"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "iam_memberships" ADD CONSTRAINT "iam_memberships_user_id_iam_users_id_fk" FOREIGN KEY ("user_id") REFERENCES "public"."iam_users"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "iam_role_permissions" ADD CONSTRAINT "iam_role_permissions_role_id_iam_roles_id_fk" FOREIGN KEY ("role_id") REFERENCES "public"."iam_roles"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "iam_sessions" ADD CONSTRAINT "iam_sessions_user_id_iam_users_id_fk" FOREIGN KEY ("user_id") REFERENCES "public"."iam_users"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "iam_user_credentials" ADD CONSTRAINT "iam_user_credentials_user_id_iam_users_id_fk" FOREIGN KEY ("user_id") REFERENCES "public"."iam_users"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
CREATE UNIQUE INDEX "iam_api_credentials_prefix_unique" ON "iam_api_credentials" USING btree ("prefix");--> statement-breakpoint
CREATE INDEX "iam_api_credentials_company_idx" ON "iam_api_credentials" USING btree ("company_id");--> statement-breakpoint
CREATE INDEX "iam_membership_roles_membership_idx" ON "iam_membership_roles" USING btree ("membership_id");--> statement-breakpoint
CREATE UNIQUE INDEX "iam_memberships_user_company_unique" ON "iam_memberships" USING btree ("user_id","company_id");--> statement-breakpoint
CREATE INDEX "iam_memberships_user_idx" ON "iam_memberships" USING btree ("user_id");--> statement-breakpoint
CREATE INDEX "iam_memberships_company_idx" ON "iam_memberships" USING btree ("company_id");--> statement-breakpoint
CREATE INDEX "iam_outbox_unpublished_idx" ON "iam_outbox" USING btree ("published","occurred_on");--> statement-breakpoint
CREATE INDEX "iam_outbox_aggregate_idx" ON "iam_outbox" USING btree ("aggregate_id");--> statement-breakpoint
CREATE UNIQUE INDEX "iam_permissions_code_unique" ON "iam_permissions" USING btree ("code");--> statement-breakpoint
CREATE UNIQUE INDEX "iam_permissions_module_resource_action_unique" ON "iam_permissions" USING btree ("module","resource","action");--> statement-breakpoint
CREATE INDEX "iam_permissions_module_idx" ON "iam_permissions" USING btree ("module");--> statement-breakpoint
CREATE INDEX "iam_permissions_resource_idx" ON "iam_permissions" USING btree ("resource");--> statement-breakpoint
CREATE INDEX "iam_permissions_action_idx" ON "iam_permissions" USING btree ("action");--> statement-breakpoint
CREATE INDEX "iam_role_permissions_role_idx" ON "iam_role_permissions" USING btree ("role_id");--> statement-breakpoint
CREATE UNIQUE INDEX "iam_roles_company_name_unique" ON "iam_roles" USING btree ("company_id","name");--> statement-breakpoint
CREATE INDEX "iam_roles_company_idx" ON "iam_roles" USING btree ("company_id");--> statement-breakpoint
CREATE UNIQUE INDEX "iam_sessions_refresh_token_hash_unique" ON "iam_sessions" USING btree ("refresh_token_hash");--> statement-breakpoint
CREATE INDEX "iam_sessions_user_idx" ON "iam_sessions" USING btree ("user_id");--> statement-breakpoint
CREATE UNIQUE INDEX "iam_users_email_unique" ON "iam_users" USING btree ("email");--> statement-breakpoint
CREATE UNIQUE INDEX "iam_users_username_unique" ON "iam_users" USING btree ("username");--> statement-breakpoint
CREATE INDEX "iam_users_status_idx" ON "iam_users" USING btree ("status");