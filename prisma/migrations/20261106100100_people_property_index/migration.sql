CREATE INDEX CONCURRENTLY "residents_org_property_created_idx" ON "residents" ("organization_id", "property_id", "created_at" DESC, "id" DESC);
