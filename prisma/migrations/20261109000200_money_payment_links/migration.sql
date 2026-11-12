-- AlterTable
ALTER TABLE "payments" ADD COLUMN     "payment_link_expires_at" TIMESTAMPTZ,
ADD COLUMN     "payment_link_id" TEXT,
ADD COLUMN     "payment_link_url" TEXT;

-- CreateTable
CREATE TABLE "payment_allocations" (
    "payment_id" UUID NOT NULL,
    "billing_record_id" UUID NOT NULL,
    "amount" INTEGER NOT NULL,

    CONSTRAINT "payment_allocations_pkey" PRIMARY KEY ("payment_id","billing_record_id")
);

-- CreateIndex
CREATE INDEX "payment_allocations_billing_record_id_idx" ON "payment_allocations"("billing_record_id");

-- CreateIndex
CREATE UNIQUE INDEX "payments_payment_link_id_key" ON "payments"("payment_link_id");

-- AddForeignKey
ALTER TABLE "payment_allocations" ADD CONSTRAINT "payment_allocations_payment_id_fkey" FOREIGN KEY ("payment_id") REFERENCES "payments"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "payment_allocations" ADD CONSTRAINT "payment_allocations_billing_record_id_fkey" FOREIGN KEY ("billing_record_id") REFERENCES "billing_records"("id") ON DELETE RESTRICT ON UPDATE CASCADE;
