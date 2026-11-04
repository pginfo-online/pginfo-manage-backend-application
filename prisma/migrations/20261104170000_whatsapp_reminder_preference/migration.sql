-- Existing tenants received rent reminders before this preference was introduced.
UPDATE "residents"
SET "send_whatsapp_reminder" = true
WHERE "send_whatsapp_reminder" = false
  AND "created_at" < (
    SELECT "finished_at"
    FROM "_prisma_migrations"
    WHERE "migration_name" = '20261104150000_property_tenant_fields'
    LIMIT 1
  );

ALTER TABLE "residents" ALTER COLUMN "send_whatsapp_reminder" SET DEFAULT true;
