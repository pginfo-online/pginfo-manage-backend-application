-- ====================================================================
-- Migration: 20261031010000_autopay_rent_collection
-- Description: Autopay Rent Collection Module with Razorpay & Route
-- Tables: landlord_payout_accounts, tenant_mandates, rent_invoices, webhook_events
-- ====================================================================

-- CreateEnum
CREATE TYPE "payout_account_status" AS ENUM ('PENDING', 'ACTIVE', 'SUSPENDED', 'REJECTED');

-- CreateEnum
CREATE TYPE "kyc_status" AS ENUM ('PENDING', 'SUBMITTED', 'VERIFIED', 'REJECTED');

-- CreateEnum
CREATE TYPE "mandate_status" AS ENUM ('CREATED', 'AUTHENTICATED', 'ACTIVE', 'PENDING', 'PAUSED', 'REVOKED', 'COMPLETED', 'EXPIRED');

-- CreateEnum
CREATE TYPE "mandate_channel" AS ENUM ('UPI', 'EMANDATE', 'CARD');

-- CreateEnum
CREATE TYPE "mandate_collection_mode" AS ENUM ('AUTOPAY', 'MANUAL_COLLECTION');

-- CreateEnum
CREATE TYPE "rent_invoice_status" AS ENUM ('PENDING', 'PAID', 'FAILED', 'CANCELLED');

-- CreateEnum
CREATE TYPE "rent_collection_type" AS ENUM ('AUTOPAY', 'MANUAL_COLLECTION', 'FALLBACK_LINK');

-- CreateTable
CREATE TABLE "landlord_payout_accounts" (
    "id" UUID NOT NULL,
    "organization_id" UUID NOT NULL,
    "user_id" UUID NOT NULL,
    "property_id" UUID,
    "razorpay_account_id" TEXT NOT NULL,
    "business_name" TEXT NOT NULL,
    "business_type" TEXT NOT NULL DEFAULT 'individual',
    "account_number_masked" TEXT NOT NULL,
    "ifsc_code" TEXT NOT NULL,
    "beneficiary_name" TEXT NOT NULL,
    "email" TEXT NOT NULL,
    "phone" TEXT NOT NULL,
    "status" "payout_account_status" NOT NULL DEFAULT 'ACTIVE',
    "kyc_status" "kyc_status" NOT NULL DEFAULT 'VERIFIED',
    "metadata" JSONB,
    "created_at" TIMESTAMPTZ NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updated_at" TIMESTAMPTZ NOT NULL,

    CONSTRAINT "landlord_payout_accounts_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "tenant_mandates" (
    "id" UUID NOT NULL,
    "organization_id" UUID NOT NULL,
    "tenant_id" UUID NOT NULL,
    "property_id" UUID NOT NULL,
    "unit_id" UUID,
    "bed_id" UUID,
    "landlord_payout_account_id" UUID,
    "razorpay_plan_id" TEXT,
    "razorpay_subscription_id" TEXT NOT NULL,
    "razorpay_customer_id" TEXT,
    "razorpay_token_id" TEXT,
    "mandate_channel" "mandate_channel" NOT NULL DEFAULT 'UPI',
    "bank_reference" TEXT,
    "status" "mandate_status" NOT NULL DEFAULT 'CREATED',
    "collection_mode" "mandate_collection_mode" NOT NULL DEFAULT 'AUTOPAY',
    "rent_amount" INTEGER NOT NULL,
    "billing_day" INTEGER NOT NULL DEFAULT 5,
    "tenure_months" INTEGER NOT NULL DEFAULT 11,
    "total_count" INTEGER NOT NULL DEFAULT 11,
    "paid_count" INTEGER NOT NULL DEFAULT 0,
    "short_url" TEXT,
    "failure_reason" TEXT,
    "retry_count" INTEGER NOT NULL DEFAULT 0,
    "started_at" TIMESTAMPTZ,
    "next_charge_date" TIMESTAMPTZ,
    "cancelled_at" TIMESTAMPTZ,
    "metadata" JSONB,
    "created_at" TIMESTAMPTZ NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updated_at" TIMESTAMPTZ NOT NULL,

    CONSTRAINT "tenant_mandates_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "rent_invoices" (
    "id" UUID NOT NULL,
    "organization_id" UUID NOT NULL,
    "tenant_id" UUID NOT NULL,
    "property_id" UUID NOT NULL,
    "unit_id" UUID,
    "mandate_id" UUID,
    "billing_record_id" UUID,
    "invoice_number" TEXT NOT NULL,
    "billing_month" INTEGER NOT NULL,
    "billing_year" INTEGER NOT NULL,
    "amount" INTEGER NOT NULL,
    "platform_fee" INTEGER NOT NULL DEFAULT 3000,
    "transfer_amount" INTEGER NOT NULL,
    "status" "rent_invoice_status" NOT NULL DEFAULT 'PENDING',
    "collection_type" "rent_collection_type" NOT NULL DEFAULT 'AUTOPAY',
    "due_date" DATE NOT NULL,
    "paid_at" TIMESTAMPTZ,
    "razorpay_payment_id" TEXT,
    "razorpay_transfer_id" TEXT,
    "razorpay_order_id" TEXT,
    "fallback_payment_url" TEXT,
    "retry_count" INTEGER NOT NULL DEFAULT 0,
    "failure_reason" TEXT,
    "metadata" JSONB,
    "created_at" TIMESTAMPTZ NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updated_at" TIMESTAMPTZ NOT NULL,

    CONSTRAINT "rent_invoices_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "webhook_events" (
    "id" UUID NOT NULL,
    "event_id" TEXT NOT NULL,
    "event_type" TEXT NOT NULL,
    "payload" JSONB NOT NULL,
    "processed_at" TIMESTAMPTZ NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "status" TEXT NOT NULL DEFAULT 'SUCCESS',
    "error" TEXT,
    "created_at" TIMESTAMPTZ NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "webhook_events_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE UNIQUE INDEX "landlord_payout_accounts_razorpay_account_id_key" ON "landlord_payout_accounts"("razorpay_account_id");
CREATE INDEX "landlord_payout_accounts_organization_id_idx" ON "landlord_payout_accounts"("organization_id");
CREATE INDEX "landlord_payout_accounts_user_id_idx" ON "landlord_payout_accounts"("user_id");
CREATE INDEX "landlord_payout_accounts_property_id_idx" ON "landlord_payout_accounts"("property_id");
CREATE INDEX "landlord_payout_accounts_status_idx" ON "landlord_payout_accounts"("status");

-- CreateIndex
CREATE UNIQUE INDEX "tenant_mandates_razorpay_subscription_id_key" ON "tenant_mandates"("razorpay_subscription_id");
CREATE INDEX "tenant_mandates_organization_id_idx" ON "tenant_mandates"("organization_id");
CREATE INDEX "tenant_mandates_tenant_id_idx" ON "tenant_mandates"("tenant_id");
CREATE INDEX "tenant_mandates_property_id_idx" ON "tenant_mandates"("property_id");
CREATE INDEX "tenant_mandates_unit_id_idx" ON "tenant_mandates"("unit_id");
CREATE INDEX "tenant_mandates_status_idx" ON "tenant_mandates"("status");
CREATE INDEX "tenant_mandates_razorpay_subscription_id_idx" ON "tenant_mandates"("razorpay_subscription_id");

-- CreateIndex
CREATE UNIQUE INDEX "rent_invoices_invoice_number_key" ON "rent_invoices"("invoice_number");
CREATE UNIQUE INDEX "rent_invoices_tenant_id_billing_month_billing_year_key" ON "rent_invoices"("tenant_id", "billing_month", "billing_year");
CREATE INDEX "rent_invoices_organization_id_idx" ON "rent_invoices"("organization_id");
CREATE INDEX "rent_invoices_tenant_id_idx" ON "rent_invoices"("tenant_id");
CREATE INDEX "rent_invoices_property_id_idx" ON "rent_invoices"("property_id");
CREATE INDEX "rent_invoices_mandate_id_idx" ON "rent_invoices"("mandate_id");
CREATE INDEX "rent_invoices_status_idx" ON "rent_invoices"("status");
CREATE INDEX "rent_invoices_razorpay_payment_id_idx" ON "rent_invoices"("razorpay_payment_id");

-- CreateIndex
CREATE UNIQUE INDEX "webhook_events_event_id_key" ON "webhook_events"("event_id");
CREATE INDEX "webhook_events_event_type_idx" ON "webhook_events"("event_type");
CREATE INDEX "webhook_events_processed_at_idx" ON "webhook_events"("processed_at");

-- AddForeignKey
ALTER TABLE "landlord_payout_accounts" ADD CONSTRAINT "landlord_payout_accounts_organization_id_fkey" FOREIGN KEY ("organization_id") REFERENCES "organizations"("id") ON DELETE CASCADE ON UPDATE CASCADE;
ALTER TABLE "landlord_payout_accounts" ADD CONSTRAINT "landlord_payout_accounts_user_id_fkey" FOREIGN KEY ("user_id") REFERENCES "users"("id") ON DELETE CASCADE ON UPDATE CASCADE;
ALTER TABLE "landlord_payout_accounts" ADD CONSTRAINT "landlord_payout_accounts_property_id_fkey" FOREIGN KEY ("property_id") REFERENCES "properties"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "tenant_mandates" ADD CONSTRAINT "tenant_mandates_organization_id_fkey" FOREIGN KEY ("organization_id") REFERENCES "organizations"("id") ON DELETE CASCADE ON UPDATE CASCADE;
ALTER TABLE "tenant_mandates" ADD CONSTRAINT "tenant_mandates_tenant_id_fkey" FOREIGN KEY ("tenant_id") REFERENCES "residents"("id") ON DELETE CASCADE ON UPDATE CASCADE;
ALTER TABLE "tenant_mandates" ADD CONSTRAINT "tenant_mandates_property_id_fkey" FOREIGN KEY ("property_id") REFERENCES "properties"("id") ON DELETE CASCADE ON UPDATE CASCADE;
ALTER TABLE "tenant_mandates" ADD CONSTRAINT "tenant_mandates_unit_id_fkey" FOREIGN KEY ("unit_id") REFERENCES "rooms"("id") ON DELETE SET NULL ON UPDATE CASCADE;
ALTER TABLE "tenant_mandates" ADD CONSTRAINT "tenant_mandates_bed_id_fkey" FOREIGN KEY ("bed_id") REFERENCES "beds"("id") ON DELETE SET NULL ON UPDATE CASCADE;
ALTER TABLE "tenant_mandates" ADD CONSTRAINT "tenant_mandates_landlord_payout_account_id_fkey" FOREIGN KEY ("landlord_payout_account_id") REFERENCES "landlord_payout_accounts"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "rent_invoices" ADD CONSTRAINT "rent_invoices_organization_id_fkey" FOREIGN KEY ("organization_id") REFERENCES "organizations"("id") ON DELETE CASCADE ON UPDATE CASCADE;
ALTER TABLE "rent_invoices" ADD CONSTRAINT "rent_invoices_tenant_id_fkey" FOREIGN KEY ("tenant_id") REFERENCES "residents"("id") ON DELETE CASCADE ON UPDATE CASCADE;
ALTER TABLE "rent_invoices" ADD CONSTRAINT "rent_invoices_property_id_fkey" FOREIGN KEY ("property_id") REFERENCES "properties"("id") ON DELETE CASCADE ON UPDATE CASCADE;
ALTER TABLE "rent_invoices" ADD CONSTRAINT "rent_invoices_unit_id_fkey" FOREIGN KEY ("unit_id") REFERENCES "rooms"("id") ON DELETE SET NULL ON UPDATE CASCADE;
ALTER TABLE "rent_invoices" ADD CONSTRAINT "rent_invoices_mandate_id_fkey" FOREIGN KEY ("mandate_id") REFERENCES "tenant_mandates"("id") ON DELETE SET NULL ON UPDATE CASCADE;
ALTER TABLE "rent_invoices" ADD CONSTRAINT "rent_invoices_billing_record_id_fkey" FOREIGN KEY ("billing_record_id") REFERENCES "billing_records"("id") ON DELETE SET NULL ON UPDATE CASCADE;
