-- AlterTable
ALTER TABLE "rooms"
  ADD COLUMN IF NOT EXISTS "daily_stay_min_paise" INTEGER,
  ADD COLUMN IF NOT EXISTS "daily_stay_max_paise" INTEGER,
  ADD COLUMN IF NOT EXISTS "area_sqft" INTEGER;
