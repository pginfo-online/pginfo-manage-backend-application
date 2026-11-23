CREATE TABLE "whatsapp_deliveries" (
    "message_id" VARCHAR(255) NOT NULL,
    "status" VARCHAR(16) NOT NULL,
    "status_at" TIMESTAMPTZ(3) NOT NULL,
    "failure_code" INTEGER,
    CONSTRAINT "whatsapp_deliveries_pkey" PRIMARY KEY ("message_id"),
    CONSTRAINT "whatsapp_deliveries_status_check" CHECK ("status" IN ('sent', 'delivered', 'read', 'failed'))
);
