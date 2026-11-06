CREATE INDEX CONCURRENTLY "billing_records_org_resident_status_due_idx" ON "billing_records" ("organization_id", "resident_id", "status", "due_date");
