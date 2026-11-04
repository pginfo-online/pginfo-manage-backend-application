CREATE INDEX IF NOT EXISTS "property_rooms_org_property_status_floor_idx"
  ON "rooms" ("organization_id", "property_id", "status", "floor", "room_number");

CREATE INDEX IF NOT EXISTS "property_beds_org_room_status_idx"
  ON "beds" ("organization_id", "room_id", "status");

CREATE INDEX IF NOT EXISTS "property_bookings_org_property_status_idx"
  ON "bookings" ("organization_id", "property_id", "status");
