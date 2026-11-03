-- Admin searches intentionally support contains/ILIKE semantics. Trigram GIN
-- indexes keep those filters usable at platform scale.
CREATE EXTENSION IF NOT EXISTS pg_trgm;

CREATE INDEX "users_email_trgm_idx" ON "users" USING GIN ("email" gin_trgm_ops);
CREATE INDEX "users_first_name_trgm_idx" ON "users" USING GIN ("first_name" gin_trgm_ops);
CREATE INDEX "users_last_name_trgm_idx" ON "users" USING GIN ("last_name" gin_trgm_ops);
CREATE INDEX "users_mobile_trgm_idx" ON "users" USING GIN ("mobile" gin_trgm_ops);
CREATE INDEX "organizations_name_trgm_idx" ON "organizations" USING GIN ("name" gin_trgm_ops);
CREATE INDEX "properties_name_trgm_idx" ON "properties" USING GIN ("name" gin_trgm_ops);
CREATE INDEX "properties_owner_name_trgm_idx" ON "properties" USING GIN ("owner_name" gin_trgm_ops);
CREATE INDEX "properties_city_trgm_idx" ON "properties" USING GIN ("city" gin_trgm_ops);
CREATE INDEX "rooms_room_number_trgm_idx" ON "rooms" USING GIN ("room_number" gin_trgm_ops);
CREATE INDEX "residents_first_name_trgm_idx" ON "residents" USING GIN ("first_name" gin_trgm_ops);
CREATE INDEX "residents_last_name_trgm_idx" ON "residents" USING GIN ("last_name" gin_trgm_ops);
CREATE INDEX "residents_email_trgm_idx" ON "residents" USING GIN ("email" gin_trgm_ops);
CREATE INDEX "residents_mobile_trgm_idx" ON "residents" USING GIN ("mobile" gin_trgm_ops);
CREATE INDEX "admin_cases_title_trgm_idx" ON "admin_cases" USING GIN ("title" gin_trgm_ops);

-- Composite indexes align with the oldest-first operational queues and the
-- newest-first audit timeline used by the admin API.
CREATE INDEX "payments_status_created_at_idx" ON "payments"("status", "created_at");
CREATE INDEX "rent_invoices_status_created_at_idx" ON "rent_invoices"("status", "created_at");
CREATE INDEX "payout_accounts_kyc_status_created_at_idx" ON "landlord_payout_accounts"("kyc_status", "created_at");
CREATE INDEX "audit_logs_org_created_at_idx" ON "audit_logs"("organization_id", "created_at" DESC);
CREATE INDEX "audit_logs_user_created_at_idx" ON "audit_logs"("user_id", "created_at" DESC);
