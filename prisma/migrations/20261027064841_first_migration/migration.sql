-- CreateEnum
CREATE TYPE "org_role" AS ENUM ('OWNER', 'ADMIN', 'MANAGER', 'STAFF', 'VIEWER');

-- CreateEnum
CREATE TYPE "property_type" AS ENUM ('PG', 'HOSTEL', 'CO_LIVING', 'FLAT', 'APARTMENT', 'RK', 'OTHER');

-- CreateEnum
CREATE TYPE "property_status" AS ENUM ('ACTIVE', 'INACTIVE', 'ARCHIVED', 'UNDER_MAINTENANCE');

-- CreateEnum
CREATE TYPE "room_status" AS ENUM ('AVAILABLE', 'OCCUPIED', 'PARTIALLY_OCCUPIED', 'UNDER_MAINTENANCE', 'ARCHIVED');

-- CreateEnum
CREATE TYPE "sharing_type" AS ENUM ('SINGLE', 'DOUBLE', 'TRIPLE', 'FOUR_SHARING', 'FIVE_SHARING', 'SIX_SHARING', 'SEVEN_SHARING', 'EIGHT_SHARING', 'NINE_SHARING');

-- CreateEnum
CREATE TYPE "bed_status" AS ENUM ('AVAILABLE', 'OCCUPIED', 'RESERVED', 'UNDER_MAINTENANCE', 'ARCHIVED');

-- CreateEnum
CREATE TYPE "resident_status" AS ENUM ('PENDING_MOVE_IN', 'ACTIVE', 'NOTICE_PERIOD', 'MOVED_OUT', 'ARCHIVED');

-- CreateEnum
CREATE TYPE "profession" AS ENUM ('STUDENT', 'WORKING_PROFESSIONAL', 'SELF_EMPLOYED', 'OTHER');

-- CreateEnum
CREATE TYPE "billing_status" AS ENUM ('ISSUED', 'DUE', 'PARTIALLY_PAID', 'PAID', 'OVERDUE', 'CANCELLED', 'WAIVED');

-- CreateEnum
CREATE TYPE "billing_type" AS ENUM ('RENT', 'SECURITY_DEPOSIT', 'ELECTRICITY', 'WATER', 'MAINTENANCE', 'LATE_FEE', 'OTHER');

-- CreateEnum
CREATE TYPE "payment_status" AS ENUM ('PENDING', 'CONFIRMED', 'FAILED', 'REFUNDED', 'DISPUTED');

-- CreateEnum
CREATE TYPE "payment_mode" AS ENUM ('CASH', 'UPI', 'BANK_TRANSFER', 'CHEQUE', 'RAZORPAY', 'OTHER');

-- CreateEnum
CREATE TYPE "complaint_status" AS ENUM ('RECEIVED', 'VERIFIED', 'NEED_MORE_TIME', 'TEAM_WORKING', 'PENDING', 'RESOLVED');

-- CreateEnum
CREATE TYPE "complaint_urgency" AS ENUM ('LOW', 'MEDIUM', 'HIGH', 'CRITICAL');

-- CreateEnum
CREATE TYPE "staff_status" AS ENUM ('ACTIVE', 'INACTIVE', 'TERMINATED');

-- CreateEnum
CREATE TYPE "announcement_status" AS ENUM ('DRAFT', 'SCHEDULED', 'SENDING', 'SENT', 'FAILED');

-- CreateEnum
CREATE TYPE "announcement_scope" AS ENUM ('ORGANIZATION', 'PROPERTY');

-- CreateTable
CREATE TABLE "users" (
    "id" UUID NOT NULL,
    "email" TEXT NOT NULL,
    "mobile" TEXT,
    "password_hash" TEXT NOT NULL,
    "first_name" TEXT NOT NULL,
    "last_name" TEXT,
    "email_verified" BOOLEAN NOT NULL DEFAULT false,
    "mobile_verified" BOOLEAN NOT NULL DEFAULT false,
    "is_active" BOOLEAN NOT NULL DEFAULT true,
    "last_login_at" TIMESTAMPTZ,
    "created_at" TIMESTAMPTZ NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updated_at" TIMESTAMPTZ NOT NULL,

    CONSTRAINT "users_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "refresh_tokens" (
    "id" UUID NOT NULL,
    "user_id" UUID NOT NULL,
    "token_hash" TEXT NOT NULL,
    "family" UUID NOT NULL,
    "expires_at" TIMESTAMPTZ NOT NULL,
    "revoked_at" TIMESTAMPTZ,
    "replaced_by" UUID,
    "user_agent" TEXT,
    "ip_address" INET,
    "created_at" TIMESTAMPTZ NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "refresh_tokens_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "organizations" (
    "id" UUID NOT NULL,
    "name" TEXT NOT NULL,
    "slug" TEXT NOT NULL,
    "is_active" BOOLEAN NOT NULL DEFAULT true,
    "created_at" TIMESTAMPTZ NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updated_at" TIMESTAMPTZ NOT NULL,

    CONSTRAINT "organizations_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "organization_members" (
    "id" UUID NOT NULL,
    "user_id" UUID NOT NULL,
    "organization_id" UUID NOT NULL,
    "role" "org_role" NOT NULL DEFAULT 'VIEWER',
    "is_active" BOOLEAN NOT NULL DEFAULT true,
    "joined_at" TIMESTAMPTZ NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updated_at" TIMESTAMPTZ NOT NULL,

    CONSTRAINT "organization_members_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "properties" (
    "id" UUID NOT NULL,
    "organization_id" UUID NOT NULL,
    "name" TEXT NOT NULL,
    "type" "property_type" NOT NULL,
    "status" "property_status" NOT NULL DEFAULT 'ACTIVE',
    "address_line1" TEXT NOT NULL,
    "address_line2" TEXT,
    "city" TEXT NOT NULL,
    "state" TEXT NOT NULL,
    "pincode" VARCHAR(6) NOT NULL,
    "country" VARCHAR(2) NOT NULL DEFAULT 'IN',
    "contact_phone" TEXT,
    "contact_email" TEXT,
    "timezone" TEXT NOT NULL DEFAULT 'Asia/Kolkata',
    "rent_due_day" INTEGER NOT NULL DEFAULT 1,
    "description" TEXT,
    "amenities" TEXT[] DEFAULT ARRAY[]::TEXT[],
    "total_floors" INTEGER,
    "created_at" TIMESTAMPTZ NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updated_at" TIMESTAMPTZ NOT NULL,

    CONSTRAINT "properties_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "rooms" (
    "id" UUID NOT NULL,
    "property_id" UUID NOT NULL,
    "organization_id" UUID NOT NULL,
    "room_number" TEXT NOT NULL,
    "floor" TEXT NOT NULL DEFAULT '0',
    "sharing_type" "sharing_type" NOT NULL,
    "rent_amount" INTEGER NOT NULL,
    "status" "room_status" NOT NULL DEFAULT 'AVAILABLE',
    "amenities" TEXT[] DEFAULT ARRAY[]::TEXT[],
    "description" TEXT,
    "available_from" TIMESTAMPTZ,
    "created_at" TIMESTAMPTZ NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updated_at" TIMESTAMPTZ NOT NULL,

    CONSTRAINT "rooms_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "beds" (
    "id" UUID NOT NULL,
    "room_id" UUID NOT NULL,
    "organization_id" UUID NOT NULL,
    "bed_number" TEXT NOT NULL,
    "status" "bed_status" NOT NULL DEFAULT 'AVAILABLE',
    "rent_amount" INTEGER,
    "created_at" TIMESTAMPTZ NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updated_at" TIMESTAMPTZ NOT NULL,

    CONSTRAINT "beds_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "residents" (
    "id" UUID NOT NULL,
    "organization_id" UUID NOT NULL,
    "property_id" UUID NOT NULL,
    "room_id" UUID,
    "bed_id" UUID,
    "first_name" TEXT NOT NULL,
    "last_name" TEXT,
    "email" TEXT,
    "mobile" TEXT NOT NULL,
    "whatsapp_number" TEXT,
    "emergency_contact" TEXT,
    "profession" "profession" NOT NULL DEFAULT 'OTHER',
    "status" "resident_status" NOT NULL DEFAULT 'PENDING_MOVE_IN',
    "monthly_rent" INTEGER NOT NULL,
    "security_deposit" INTEGER NOT NULL DEFAULT 0,
    "joining_date" DATE NOT NULL,
    "move_in_date" DATE,
    "move_out_date" DATE,
    "expected_vacating_date" DATE,
    "lock_in_end_date" DATE,
    "rent_due_day" INTEGER,
    "notes" TEXT,
    "version" INTEGER NOT NULL DEFAULT 1,
    "created_at" TIMESTAMPTZ NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updated_at" TIMESTAMPTZ NOT NULL,

    CONSTRAINT "residents_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "occupancy_records" (
    "id" UUID NOT NULL,
    "resident_id" UUID NOT NULL,
    "organization_id" UUID NOT NULL,
    "property_id" UUID NOT NULL,
    "room_id" UUID NOT NULL,
    "bed_id" UUID,
    "monthly_rent" INTEGER NOT NULL,
    "start_date" DATE NOT NULL,
    "end_date" DATE,
    "reason" TEXT,
    "created_at" TIMESTAMPTZ NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "occupancy_records_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "billing_records" (
    "id" UUID NOT NULL,
    "organization_id" UUID NOT NULL,
    "resident_id" UUID NOT NULL,
    "property_id" UUID NOT NULL,
    "type" "billing_type" NOT NULL,
    "status" "billing_status" NOT NULL DEFAULT 'ISSUED',
    "description" TEXT,
    "amount" INTEGER NOT NULL,
    "paid_amount" INTEGER NOT NULL DEFAULT 0,
    "late_fee_amount" INTEGER NOT NULL DEFAULT 0,
    "billing_month" INTEGER,
    "billing_year" INTEGER,
    "due_date" DATE NOT NULL,
    "period_start" DATE,
    "period_end" DATE,
    "idempotency_key" TEXT,
    "version" INTEGER NOT NULL DEFAULT 1,
    "created_at" TIMESTAMPTZ NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updated_at" TIMESTAMPTZ NOT NULL,

    CONSTRAINT "billing_records_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "payments" (
    "id" UUID NOT NULL,
    "organization_id" UUID NOT NULL,
    "resident_id" UUID NOT NULL,
    "billing_record_id" UUID,
    "amount" INTEGER NOT NULL,
    "status" "payment_status" NOT NULL DEFAULT 'PENDING',
    "mode" "payment_mode" NOT NULL,
    "collection_date" DATE NOT NULL,
    "reference" TEXT,
    "notes" TEXT,
    "proof_url" TEXT,
    "razorpay_order_id" TEXT,
    "razorpay_payment_id" TEXT,
    "razorpay_signature" TEXT,
    "recorded_by" UUID,
    "idempotency_key" TEXT,
    "version" INTEGER NOT NULL DEFAULT 1,
    "created_at" TIMESTAMPTZ NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updated_at" TIMESTAMPTZ NOT NULL,

    CONSTRAINT "payments_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "expense_categories" (
    "id" UUID NOT NULL,
    "organization_id" UUID NOT NULL,
    "name" TEXT NOT NULL,
    "is_system" BOOLEAN NOT NULL DEFAULT false,
    "is_active" BOOLEAN NOT NULL DEFAULT true,
    "created_at" TIMESTAMPTZ NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "expense_categories_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "expenses" (
    "id" UUID NOT NULL,
    "organization_id" UUID NOT NULL,
    "property_id" UUID NOT NULL,
    "category_id" UUID NOT NULL,
    "amount" INTEGER NOT NULL,
    "expense_date" DATE NOT NULL,
    "payment_mode" "payment_mode" NOT NULL,
    "paid_by" TEXT,
    "paid_to" TEXT,
    "description" TEXT,
    "receipt_url" TEXT,
    "notes" TEXT,
    "created_by" UUID NOT NULL,
    "created_at" TIMESTAMPTZ NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updated_at" TIMESTAMPTZ NOT NULL,

    CONSTRAINT "expenses_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "complaint_categories" (
    "id" UUID NOT NULL,
    "organization_id" UUID NOT NULL,
    "name" TEXT NOT NULL,
    "is_system" BOOLEAN NOT NULL DEFAULT false,
    "is_active" BOOLEAN NOT NULL DEFAULT true,
    "created_at" TIMESTAMPTZ NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "complaint_categories_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "complaints" (
    "id" UUID NOT NULL,
    "organization_id" UUID NOT NULL,
    "property_id" UUID NOT NULL,
    "category_id" UUID NOT NULL,
    "room_id" UUID,
    "description" TEXT NOT NULL,
    "location" TEXT,
    "urgency" "complaint_urgency" NOT NULL DEFAULT 'MEDIUM',
    "status" "complaint_status" NOT NULL DEFAULT 'RECEIVED',
    "assigned_to" UUID,
    "resolution" TEXT,
    "resolved_at" TIMESTAMPTZ,
    "created_by" UUID NOT NULL,
    "created_at" TIMESTAMPTZ NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updated_at" TIMESTAMPTZ NOT NULL,

    CONSTRAINT "complaints_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "complaint_comments" (
    "id" UUID NOT NULL,
    "complaint_id" UUID NOT NULL,
    "author_id" UUID NOT NULL,
    "content" TEXT NOT NULL,
    "created_at" TIMESTAMPTZ NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "complaint_comments_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "complaint_history" (
    "id" UUID NOT NULL,
    "complaint_id" UUID NOT NULL,
    "from_status" "complaint_status" NOT NULL,
    "to_status" "complaint_status" NOT NULL,
    "changed_by" UUID NOT NULL,
    "notes" TEXT,
    "created_at" TIMESTAMPTZ NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "complaint_history_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "staff_designations" (
    "id" UUID NOT NULL,
    "organization_id" UUID NOT NULL,
    "name" TEXT NOT NULL,
    "is_system" BOOLEAN NOT NULL DEFAULT false,
    "is_active" BOOLEAN NOT NULL DEFAULT true,
    "created_at" TIMESTAMPTZ NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "staff_designations_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "staff" (
    "id" UUID NOT NULL,
    "organization_id" UUID NOT NULL,
    "property_id" UUID NOT NULL,
    "designation_id" UUID NOT NULL,
    "first_name" TEXT NOT NULL,
    "last_name" TEXT,
    "mobile" TEXT NOT NULL,
    "email" TEXT,
    "status" "staff_status" NOT NULL DEFAULT 'ACTIVE',
    "salary" INTEGER,
    "joining_date" DATE,
    "exit_date" DATE,
    "notes" TEXT,
    "created_at" TIMESTAMPTZ NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updated_at" TIMESTAMPTZ NOT NULL,

    CONSTRAINT "staff_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "announcements" (
    "id" UUID NOT NULL,
    "organization_id" UUID NOT NULL,
    "property_id" UUID,
    "scope" "announcement_scope" NOT NULL,
    "title" TEXT NOT NULL,
    "body" TEXT NOT NULL,
    "status" "announcement_status" NOT NULL DEFAULT 'DRAFT',
    "scheduled_at" TIMESTAMPTZ,
    "sent_at" TIMESTAMPTZ,
    "created_by" UUID NOT NULL,
    "created_at" TIMESTAMPTZ NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updated_at" TIMESTAMPTZ NOT NULL,

    CONSTRAINT "announcements_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "audit_logs" (
    "id" UUID NOT NULL,
    "organization_id" UUID,
    "user_id" UUID,
    "action" TEXT NOT NULL,
    "entity_type" TEXT,
    "entity_id" TEXT,
    "metadata" JSONB,
    "ip_address" INET,
    "user_agent" TEXT,
    "created_at" TIMESTAMPTZ NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "audit_logs_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE UNIQUE INDEX "users_email_key" ON "users"("email");

-- CreateIndex
CREATE UNIQUE INDEX "users_mobile_key" ON "users"("mobile");

-- CreateIndex
CREATE UNIQUE INDEX "refresh_tokens_token_hash_key" ON "refresh_tokens"("token_hash");

-- CreateIndex
CREATE INDEX "refresh_tokens_user_id_idx" ON "refresh_tokens"("user_id");

-- CreateIndex
CREATE INDEX "refresh_tokens_family_idx" ON "refresh_tokens"("family");

-- CreateIndex
CREATE UNIQUE INDEX "organizations_slug_key" ON "organizations"("slug");

-- CreateIndex
CREATE INDEX "organization_members_organization_id_idx" ON "organization_members"("organization_id");

-- CreateIndex
CREATE UNIQUE INDEX "organization_members_user_id_organization_id_key" ON "organization_members"("user_id", "organization_id");

-- CreateIndex
CREATE INDEX "properties_organization_id_idx" ON "properties"("organization_id");

-- CreateIndex
CREATE UNIQUE INDEX "properties_organization_id_name_key" ON "properties"("organization_id", "name");

-- CreateIndex
CREATE INDEX "rooms_organization_id_idx" ON "rooms"("organization_id");

-- CreateIndex
CREATE INDEX "rooms_property_id_idx" ON "rooms"("property_id");

-- CreateIndex
CREATE INDEX "rooms_status_idx" ON "rooms"("status");

-- CreateIndex
CREATE UNIQUE INDEX "rooms_property_id_room_number_key" ON "rooms"("property_id", "room_number");

-- CreateIndex
CREATE INDEX "beds_organization_id_idx" ON "beds"("organization_id");

-- CreateIndex
CREATE UNIQUE INDEX "beds_room_id_bed_number_key" ON "beds"("room_id", "bed_number");

-- CreateIndex
CREATE INDEX "residents_organization_id_idx" ON "residents"("organization_id");

-- CreateIndex
CREATE INDEX "residents_property_id_idx" ON "residents"("property_id");

-- CreateIndex
CREATE INDEX "residents_status_idx" ON "residents"("status");

-- CreateIndex
CREATE INDEX "occupancy_records_organization_id_idx" ON "occupancy_records"("organization_id");

-- CreateIndex
CREATE INDEX "occupancy_records_resident_id_idx" ON "occupancy_records"("resident_id");

-- CreateIndex
CREATE UNIQUE INDEX "billing_records_idempotency_key_key" ON "billing_records"("idempotency_key");

-- CreateIndex
CREATE INDEX "billing_records_organization_id_idx" ON "billing_records"("organization_id");

-- CreateIndex
CREATE INDEX "billing_records_resident_id_idx" ON "billing_records"("resident_id");

-- CreateIndex
CREATE INDEX "billing_records_status_idx" ON "billing_records"("status");

-- CreateIndex
CREATE INDEX "billing_records_due_date_idx" ON "billing_records"("due_date");

-- CreateIndex
CREATE UNIQUE INDEX "billing_records_resident_id_type_billing_month_billing_year_key" ON "billing_records"("resident_id", "type", "billing_month", "billing_year");

-- CreateIndex
CREATE UNIQUE INDEX "payments_razorpay_order_id_key" ON "payments"("razorpay_order_id");

-- CreateIndex
CREATE UNIQUE INDEX "payments_razorpay_payment_id_key" ON "payments"("razorpay_payment_id");

-- CreateIndex
CREATE UNIQUE INDEX "payments_idempotency_key_key" ON "payments"("idempotency_key");

-- CreateIndex
CREATE INDEX "payments_organization_id_idx" ON "payments"("organization_id");

-- CreateIndex
CREATE INDEX "payments_resident_id_idx" ON "payments"("resident_id");

-- CreateIndex
CREATE INDEX "payments_status_idx" ON "payments"("status");

-- CreateIndex
CREATE UNIQUE INDEX "expense_categories_organization_id_name_key" ON "expense_categories"("organization_id", "name");

-- CreateIndex
CREATE INDEX "expenses_organization_id_idx" ON "expenses"("organization_id");

-- CreateIndex
CREATE INDEX "expenses_property_id_idx" ON "expenses"("property_id");

-- CreateIndex
CREATE INDEX "expenses_expense_date_idx" ON "expenses"("expense_date");

-- CreateIndex
CREATE UNIQUE INDEX "complaint_categories_organization_id_name_key" ON "complaint_categories"("organization_id", "name");

-- CreateIndex
CREATE INDEX "complaints_organization_id_idx" ON "complaints"("organization_id");

-- CreateIndex
CREATE INDEX "complaints_property_id_idx" ON "complaints"("property_id");

-- CreateIndex
CREATE INDEX "complaints_status_idx" ON "complaints"("status");

-- CreateIndex
CREATE INDEX "complaint_comments_complaint_id_idx" ON "complaint_comments"("complaint_id");

-- CreateIndex
CREATE INDEX "complaint_history_complaint_id_idx" ON "complaint_history"("complaint_id");

-- CreateIndex
CREATE UNIQUE INDEX "staff_designations_organization_id_name_key" ON "staff_designations"("organization_id", "name");

-- CreateIndex
CREATE INDEX "staff_organization_id_idx" ON "staff"("organization_id");

-- CreateIndex
CREATE INDEX "staff_property_id_idx" ON "staff"("property_id");

-- CreateIndex
CREATE INDEX "announcements_organization_id_idx" ON "announcements"("organization_id");

-- CreateIndex
CREATE INDEX "audit_logs_organization_id_idx" ON "audit_logs"("organization_id");

-- CreateIndex
CREATE INDEX "audit_logs_user_id_idx" ON "audit_logs"("user_id");

-- CreateIndex
CREATE INDEX "audit_logs_action_idx" ON "audit_logs"("action");

-- CreateIndex
CREATE INDEX "audit_logs_entity_type_entity_id_idx" ON "audit_logs"("entity_type", "entity_id");

-- CreateIndex
CREATE INDEX "audit_logs_created_at_idx" ON "audit_logs"("created_at");

-- AddForeignKey
ALTER TABLE "refresh_tokens" ADD CONSTRAINT "refresh_tokens_user_id_fkey" FOREIGN KEY ("user_id") REFERENCES "users"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "organization_members" ADD CONSTRAINT "organization_members_user_id_fkey" FOREIGN KEY ("user_id") REFERENCES "users"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "organization_members" ADD CONSTRAINT "organization_members_organization_id_fkey" FOREIGN KEY ("organization_id") REFERENCES "organizations"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "properties" ADD CONSTRAINT "properties_organization_id_fkey" FOREIGN KEY ("organization_id") REFERENCES "organizations"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "rooms" ADD CONSTRAINT "rooms_property_id_fkey" FOREIGN KEY ("property_id") REFERENCES "properties"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "beds" ADD CONSTRAINT "beds_room_id_fkey" FOREIGN KEY ("room_id") REFERENCES "rooms"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "residents" ADD CONSTRAINT "residents_property_id_fkey" FOREIGN KEY ("property_id") REFERENCES "properties"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "residents" ADD CONSTRAINT "residents_room_id_fkey" FOREIGN KEY ("room_id") REFERENCES "rooms"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "residents" ADD CONSTRAINT "residents_bed_id_fkey" FOREIGN KEY ("bed_id") REFERENCES "beds"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "occupancy_records" ADD CONSTRAINT "occupancy_records_resident_id_fkey" FOREIGN KEY ("resident_id") REFERENCES "residents"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "billing_records" ADD CONSTRAINT "billing_records_resident_id_fkey" FOREIGN KEY ("resident_id") REFERENCES "residents"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "payments" ADD CONSTRAINT "payments_resident_id_fkey" FOREIGN KEY ("resident_id") REFERENCES "residents"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "payments" ADD CONSTRAINT "payments_billing_record_id_fkey" FOREIGN KEY ("billing_record_id") REFERENCES "billing_records"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "expenses" ADD CONSTRAINT "expenses_property_id_fkey" FOREIGN KEY ("property_id") REFERENCES "properties"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "expenses" ADD CONSTRAINT "expenses_category_id_fkey" FOREIGN KEY ("category_id") REFERENCES "expense_categories"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "complaints" ADD CONSTRAINT "complaints_property_id_fkey" FOREIGN KEY ("property_id") REFERENCES "properties"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "complaints" ADD CONSTRAINT "complaints_category_id_fkey" FOREIGN KEY ("category_id") REFERENCES "complaint_categories"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "complaints" ADD CONSTRAINT "complaints_room_id_fkey" FOREIGN KEY ("room_id") REFERENCES "rooms"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "complaint_comments" ADD CONSTRAINT "complaint_comments_complaint_id_fkey" FOREIGN KEY ("complaint_id") REFERENCES "complaints"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "complaint_history" ADD CONSTRAINT "complaint_history_complaint_id_fkey" FOREIGN KEY ("complaint_id") REFERENCES "complaints"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "staff" ADD CONSTRAINT "staff_property_id_fkey" FOREIGN KEY ("property_id") REFERENCES "properties"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "staff" ADD CONSTRAINT "staff_designation_id_fkey" FOREIGN KEY ("designation_id") REFERENCES "staff_designations"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "announcements" ADD CONSTRAINT "announcements_property_id_fkey" FOREIGN KEY ("property_id") REFERENCES "properties"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "audit_logs" ADD CONSTRAINT "audit_logs_organization_id_fkey" FOREIGN KEY ("organization_id") REFERENCES "organizations"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "audit_logs" ADD CONSTRAINT "audit_logs_user_id_fkey" FOREIGN KEY ("user_id") REFERENCES "users"("id") ON DELETE SET NULL ON UPDATE CASCADE;
