CREATE TYPE "platform_role" AS ENUM (
  'SUPER_ADMIN',
  'OPERATIONS_ADMIN',
  'FINANCE_ADMIN',
  'SUPPORT_ADMIN',
  'ANALYST',
  'AUDITOR'
);

CREATE TYPE "platform_admin_status" AS ENUM ('ACTIVE', 'SUSPENDED', 'REVOKED');
CREATE TYPE "admin_case_type" AS ENUM (
  'PROPERTY_VERIFICATION',
  'PAYOUT_KYC',
  'PAYMENT_REVIEW',
  'SUPPORT_ESCALATION',
  'FRAUD_REVIEW',
  'DATA_CORRECTION',
  'OTHER'
);
CREATE TYPE "admin_case_status" AS ENUM ('OPEN', 'IN_REVIEW', 'BLOCKED', 'RESOLVED', 'REJECTED');
CREATE TYPE "admin_case_priority" AS ENUM ('LOW', 'MEDIUM', 'HIGH', 'CRITICAL');

CREATE TABLE "platform_admins" (
  "id" UUID NOT NULL DEFAULT gen_random_uuid(),
  "user_id" UUID NOT NULL,
  "role" "platform_role" NOT NULL,
  "status" "platform_admin_status" NOT NULL DEFAULT 'ACTIVE',
  "permission_overrides" TEXT[] NOT NULL DEFAULT ARRAY[]::TEXT[],
  "created_by_user_id" UUID,
  "created_at" TIMESTAMPTZ NOT NULL DEFAULT CURRENT_TIMESTAMP,
  "updated_at" TIMESTAMPTZ NOT NULL,
  CONSTRAINT "platform_admins_pkey" PRIMARY KEY ("id"),
  CONSTRAINT "platform_admins_user_id_fkey" FOREIGN KEY ("user_id") REFERENCES "users"("id") ON DELETE CASCADE ON UPDATE CASCADE,
  CONSTRAINT "platform_admins_created_by_user_id_fkey" FOREIGN KEY ("created_by_user_id") REFERENCES "users"("id") ON DELETE SET NULL ON UPDATE CASCADE
);

CREATE TABLE "admin_cases" (
  "id" UUID NOT NULL DEFAULT gen_random_uuid(),
  "type" "admin_case_type" NOT NULL,
  "status" "admin_case_status" NOT NULL DEFAULT 'OPEN',
  "priority" "admin_case_priority" NOT NULL DEFAULT 'MEDIUM',
  "title" TEXT NOT NULL,
  "description" TEXT,
  "organization_id" UUID,
  "target_type" TEXT,
  "target_id" TEXT,
  "assigned_to_user_id" UUID,
  "created_by_user_id" UUID NOT NULL,
  "resolution" TEXT,
  "evidence" JSONB,
  "idempotency_key" TEXT,
  "due_at" TIMESTAMPTZ,
  "closed_at" TIMESTAMPTZ,
  "created_at" TIMESTAMPTZ NOT NULL DEFAULT CURRENT_TIMESTAMP,
  "updated_at" TIMESTAMPTZ NOT NULL,
  CONSTRAINT "admin_cases_pkey" PRIMARY KEY ("id"),
  CONSTRAINT "admin_cases_assigned_to_user_id_fkey" FOREIGN KEY ("assigned_to_user_id") REFERENCES "users"("id") ON DELETE SET NULL ON UPDATE CASCADE,
  CONSTRAINT "admin_cases_created_by_user_id_fkey" FOREIGN KEY ("created_by_user_id") REFERENCES "users"("id") ON DELETE RESTRICT ON UPDATE CASCADE
);

CREATE TABLE "platform_settings" (
  "id" UUID NOT NULL DEFAULT gen_random_uuid(),
  "key" TEXT NOT NULL,
  "value" JSONB NOT NULL,
  "description" TEXT,
  "is_public" BOOLEAN NOT NULL DEFAULT false,
  "version" INTEGER NOT NULL DEFAULT 1,
  "updated_by_user_id" UUID NOT NULL,
  "created_at" TIMESTAMPTZ NOT NULL DEFAULT CURRENT_TIMESTAMP,
  "updated_at" TIMESTAMPTZ NOT NULL,
  CONSTRAINT "platform_settings_pkey" PRIMARY KEY ("id"),
  CONSTRAINT "platform_settings_updated_by_user_id_fkey" FOREIGN KEY ("updated_by_user_id") REFERENCES "users"("id") ON DELETE RESTRICT ON UPDATE CASCADE
);

CREATE UNIQUE INDEX "platform_admins_user_id_key" ON "platform_admins"("user_id");
CREATE INDEX "platform_admins_role_status_idx" ON "platform_admins"("role", "status");
CREATE UNIQUE INDEX "admin_cases_idempotency_key_key" ON "admin_cases"("idempotency_key");
CREATE INDEX "admin_cases_status_priority_created_at_idx" ON "admin_cases"("status", "priority", "created_at");
CREATE INDEX "admin_cases_organization_id_idx" ON "admin_cases"("organization_id");
CREATE INDEX "admin_cases_target_type_target_id_idx" ON "admin_cases"("target_type", "target_id");
CREATE INDEX "admin_cases_assigned_to_user_id_idx" ON "admin_cases"("assigned_to_user_id");
CREATE UNIQUE INDEX "platform_settings_key_key" ON "platform_settings"("key");
