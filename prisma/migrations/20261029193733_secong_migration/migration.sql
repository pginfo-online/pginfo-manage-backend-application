-- CreateEnum
CREATE TYPE "lead_status" AS ENUM ('NEW', 'CONTACTED', 'VISITED', 'TOKEN_PAID', 'CONVERTED', 'LOST');

-- CreateEnum
CREATE TYPE "booking_status" AS ENUM ('CONFIRMED', 'CHECKED_IN', 'CANCELLED', 'EXPIRED');

-- CreateTable
CREATE TABLE "leads" (
    "id" UUID NOT NULL,
    "organization_id" UUID NOT NULL,
    "property_id" UUID NOT NULL,
    "name" TEXT NOT NULL,
    "mobile" TEXT NOT NULL,
    "email" TEXT,
    "budget" INTEGER,
    "sharing_preference" TEXT,
    "status" "lead_status" NOT NULL DEFAULT 'NEW',
    "source" TEXT,
    "notes" TEXT,
    "visit_scheduled_at" TIMESTAMPTZ,
    "created_at" TIMESTAMPTZ NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updated_at" TIMESTAMPTZ NOT NULL,

    CONSTRAINT "leads_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "bookings" (
    "id" UUID NOT NULL,
    "organization_id" UUID NOT NULL,
    "property_id" UUID NOT NULL,
    "room_id" UUID,
    "bed_id" UUID,
    "guest_name" TEXT NOT NULL,
    "guest_mobile" TEXT NOT NULL,
    "guest_email" TEXT,
    "token_amount" INTEGER NOT NULL DEFAULT 0,
    "expected_move_in" DATE NOT NULL,
    "expiry_date" DATE,
    "status" "booking_status" NOT NULL DEFAULT 'CONFIRMED',
    "notes" TEXT,
    "payment_mode" "payment_mode" NOT NULL DEFAULT 'UPI',
    "payment_ref" TEXT,
    "created_at" TIMESTAMPTZ NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updated_at" TIMESTAMPTZ NOT NULL,

    CONSTRAINT "bookings_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "sub_meters" (
    "id" UUID NOT NULL,
    "organization_id" UUID NOT NULL,
    "property_id" UUID NOT NULL,
    "room_id" UUID,
    "meter_number" TEXT NOT NULL,
    "tariff_rate" INTEGER NOT NULL DEFAULT 1000,
    "initial_reading" DECIMAL(10,2) NOT NULL DEFAULT 0,
    "current_reading" DECIMAL(10,2) NOT NULL DEFAULT 0,
    "is_active" BOOLEAN NOT NULL DEFAULT true,
    "created_at" TIMESTAMPTZ NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updated_at" TIMESTAMPTZ NOT NULL,

    CONSTRAINT "sub_meters_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "meter_readings" (
    "id" UUID NOT NULL,
    "sub_meter_id" UUID NOT NULL,
    "reading_date" DATE NOT NULL,
    "reading" DECIMAL(10,2) NOT NULL,
    "units_consumed" DECIMAL(10,2) NOT NULL,
    "total_amount" INTEGER NOT NULL,
    "recorded_by" UUID,
    "photo_url" TEXT,
    "created_at" TIMESTAMPTZ NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "meter_readings_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "agreement_templates" (
    "id" UUID NOT NULL,
    "organization_id" UUID NOT NULL,
    "property_id" UUID,
    "name" TEXT NOT NULL,
    "content" TEXT NOT NULL,
    "is_default" BOOLEAN NOT NULL DEFAULT false,
    "is_active" BOOLEAN NOT NULL DEFAULT true,
    "created_at" TIMESTAMPTZ NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updated_at" TIMESTAMPTZ NOT NULL,

    CONSTRAINT "agreement_templates_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE INDEX "leads_organization_id_idx" ON "leads"("organization_id");

-- CreateIndex
CREATE INDEX "leads_property_id_idx" ON "leads"("property_id");

-- CreateIndex
CREATE INDEX "leads_status_idx" ON "leads"("status");

-- CreateIndex
CREATE INDEX "bookings_organization_id_idx" ON "bookings"("organization_id");

-- CreateIndex
CREATE INDEX "bookings_property_id_idx" ON "bookings"("property_id");

-- CreateIndex
CREATE INDEX "bookings_status_idx" ON "bookings"("status");

-- CreateIndex
CREATE INDEX "sub_meters_organization_id_idx" ON "sub_meters"("organization_id");

-- CreateIndex
CREATE UNIQUE INDEX "sub_meters_property_id_meter_number_key" ON "sub_meters"("property_id", "meter_number");

-- CreateIndex
CREATE INDEX "meter_readings_sub_meter_id_idx" ON "meter_readings"("sub_meter_id");

-- CreateIndex
CREATE INDEX "meter_readings_reading_date_idx" ON "meter_readings"("reading_date");

-- CreateIndex
CREATE INDEX "agreement_templates_organization_id_idx" ON "agreement_templates"("organization_id");

-- AddForeignKey
ALTER TABLE "leads" ADD CONSTRAINT "leads_property_id_fkey" FOREIGN KEY ("property_id") REFERENCES "properties"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "bookings" ADD CONSTRAINT "bookings_property_id_fkey" FOREIGN KEY ("property_id") REFERENCES "properties"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "bookings" ADD CONSTRAINT "bookings_bed_id_fkey" FOREIGN KEY ("bed_id") REFERENCES "beds"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "sub_meters" ADD CONSTRAINT "sub_meters_property_id_fkey" FOREIGN KEY ("property_id") REFERENCES "properties"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "meter_readings" ADD CONSTRAINT "meter_readings_sub_meter_id_fkey" FOREIGN KEY ("sub_meter_id") REFERENCES "sub_meters"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "agreement_templates" ADD CONSTRAINT "agreement_templates_property_id_fkey" FOREIGN KEY ("property_id") REFERENCES "properties"("id") ON DELETE CASCADE ON UPDATE CASCADE;
