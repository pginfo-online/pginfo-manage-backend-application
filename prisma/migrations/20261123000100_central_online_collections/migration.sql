-- AlterTable
ALTER TABLE "payments" ADD COLUMN     "capture_platform_fee" INTEGER,
ADD COLUMN     "capture_property_id" UUID,
ADD COLUMN     "captured_at" TIMESTAMPTZ,
ADD COLUMN     "gateway_qr_id" TEXT,
ADD COLUMN     "gateway_refunded_amount" INTEGER NOT NULL DEFAULT 0;

-- AlterTable
ALTER TABLE "payment_allocations" ADD COLUMN     "refunded_amount" INTEGER NOT NULL DEFAULT 0;

-- AlterTable
ALTER TABLE "landlord_payout_accounts" ADD COLUMN     "account_number_encrypted" TEXT;

-- AlterTable
ALTER TABLE "tenant_mandates" ADD COLUMN     "gateway_status_at" TIMESTAMPTZ;

-- CreateTable
CREATE TABLE "gateway_settlements" (
    "payment_id" UUID NOT NULL,
    "provider_id" TEXT NOT NULL,
    "bank_reference" TEXT NOT NULL,
    "net_amount" INTEGER NOT NULL,
    "route_clear" BOOLEAN NOT NULL DEFAULT false,
    "settled_on" DATE NOT NULL,
    "recorded_by" UUID NOT NULL,
    "created_at" TIMESTAMPTZ NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "gateway_settlements_pkey" PRIMARY KEY ("payment_id")
);

-- CreateTable
CREATE TABLE "manual_payouts" (
    "payment_id" UUID NOT NULL,
    "payout_account_id" UUID NOT NULL,
    "amount" INTEGER NOT NULL,
    "bank_reference" TEXT,
    "paid_on" DATE,
    "recorded_by" UUID,
    "prepared_by" UUID NOT NULL,
    "created_at" TIMESTAMPTZ NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "beneficiary_name" TEXT NOT NULL,
    "account_masked" TEXT NOT NULL,
    "ifsc_code" TEXT NOT NULL,

    CONSTRAINT "manual_payouts_pkey" PRIMARY KEY ("payment_id")
);

-- CreateIndex
CREATE INDEX "gateway_settlements_provider_id_idx" ON "gateway_settlements"("provider_id");

-- CreateIndex
CREATE UNIQUE INDEX "manual_payouts_bank_reference_key" ON "manual_payouts"("bank_reference");

-- CreateIndex
CREATE INDEX "manual_payouts_payout_account_id_idx" ON "manual_payouts"("payout_account_id");

-- CreateIndex
CREATE UNIQUE INDEX "payments_gateway_qr_id_key" ON "payments"("gateway_qr_id");

-- AddForeignKey
ALTER TABLE "gateway_settlements" ADD CONSTRAINT "gateway_settlements_payment_id_fkey" FOREIGN KEY ("payment_id") REFERENCES "payments"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "manual_payouts" ADD CONSTRAINT "manual_payouts_payment_id_fkey" FOREIGN KEY ("payment_id") REFERENCES "payments"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "manual_payouts" ADD CONSTRAINT "manual_payouts_payout_account_id_fkey" FOREIGN KEY ("payout_account_id") REFERENCES "landlord_payout_accounts"("id") ON DELETE RESTRICT ON UPDATE CASCADE;


-- Money records stay within the original captured and allocated amounts.
ALTER TABLE "payments"
ADD CONSTRAINT "payments_gateway_refund_valid" CHECK ("gateway_refunded_amount" >= 0 AND "gateway_refunded_amount" <= "amount");

ALTER TABLE "payment_allocations"
ADD CONSTRAINT "payment_allocations_refund_valid" CHECK ("refunded_amount" >= 0 AND "refunded_amount" <= "amount");

ALTER TABLE "gateway_settlements"
ADD CONSTRAINT "gateway_settlements_net_valid" CHECK ("net_amount" >= 0);

ALTER TABLE "manual_payouts"
ADD CONSTRAINT "manual_payouts_completion_valid" CHECK (
  "amount" > 0 AND (
    ("paid_on" IS NULL AND "bank_reference" IS NULL AND "recorded_by" IS NULL) OR
    ("paid_on" IS NOT NULL AND "bank_reference" IS NOT NULL AND "recorded_by" IS NOT NULL)
  )
);

CREATE INDEX "payments_gateway_capture_date_idx"
ON "payments" ("collection_date" DESC, "id" DESC)
WHERE "mode" = 'RAZORPAY' AND "razorpay_payment_id" IS NOT NULL;

-- Earlier Autopay captures credited the linked rent bill directly. Rebuild
-- the original single-charge allocation where the invoice verifies that link.
INSERT INTO "payment_allocations" ("payment_id", "billing_record_id", "amount")
SELECT p.id, p.billing_record_id, p.amount
FROM "payments" p
WHERE p.mode = 'RAZORPAY' AND p.status = 'CONFIRMED'
  AND p.notes LIKE 'Rent Autopay for %'
  AND p.razorpay_payment_id IS NOT NULL AND p.billing_record_id IS NOT NULL
  AND EXISTS (
    SELECT 1 FROM "rent_invoices" i
    WHERE i.razorpay_payment_id = p.razorpay_payment_id
      AND i.organization_id = p.organization_id
      AND i.billing_record_id = p.billing_record_id
      AND i.collection_type = 'AUTOPAY'
  )
  AND NOT EXISTS (SELECT 1 FROM "payment_allocations" a WHERE a.payment_id = p.id)
ON CONFLICT DO NOTHING;

UPDATE "payments" p
SET "capture_property_id" = b.property_id
FROM "billing_records" b
WHERE b.id = p.billing_record_id AND b.organization_id = p.organization_id
  AND p.capture_property_id IS NULL AND p.mode = 'RAZORPAY';
