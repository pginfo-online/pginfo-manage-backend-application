-- Dashboard filters always include organization and frequently property/date.
-- Tables were checked before deployment and are small enough for transactional index builds.
CREATE INDEX IF NOT EXISTS "dashboard_billing_org_property_due_idx"
  ON "billing_records" ("organization_id", "property_id", "due_date")
  WHERE "status" <> 'CANCELLED';
CREATE INDEX IF NOT EXISTS "dashboard_billing_org_created_idx"
  ON "billing_records" ("organization_id", "created_at")
  WHERE "status" <> 'CANCELLED';
CREATE INDEX IF NOT EXISTS "dashboard_payment_org_status_created_idx"
  ON "payments" ("organization_id", "status", "created_at");
CREATE INDEX IF NOT EXISTS "dashboard_expense_org_property_date_idx"
  ON "expenses" ("organization_id", "property_id", "expense_date");
CREATE INDEX IF NOT EXISTS "dashboard_complaint_org_property_created_idx"
  ON "complaints" ("organization_id", "property_id", "created_at");
CREATE INDEX IF NOT EXISTS "dashboard_resident_org_property_status_idx"
  ON "residents" ("organization_id", "property_id", "status");
