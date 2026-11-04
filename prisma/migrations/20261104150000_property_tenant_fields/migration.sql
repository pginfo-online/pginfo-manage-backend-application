ALTER TYPE "sharing_type" ADD VALUE IF NOT EXISTS 'TEN_SHARING';
ALTER TABLE "residents"
  ADD COLUMN "alternate_phone" TEXT,
  ADD COLUMN "send_whatsapp_reminder" BOOLEAN NOT NULL DEFAULT false,
  ADD COLUMN "stay_type" TEXT NOT NULL DEFAULT 'LONG_TERM',
  ADD COLUMN "tenant_type" TEXT NOT NULL DEFAULT 'OTHER',
  ADD COLUMN "notice_period_days" INTEGER,
  ADD COLUMN "agreement_period_months" INTEGER;
ALTER TABLE "billing_records"
  ADD COLUMN "attachment_urls" TEXT[] NOT NULL DEFAULT ARRAY[]::TEXT[];
