ALTER TABLE "residents"
  ADD COLUMN "rental_frequency_months" INTEGER NOT NULL DEFAULT 1,
  ADD COLUMN "skip_first_rent" BOOLEAN NOT NULL DEFAULT false,
  ADD CONSTRAINT "residents_rental_frequency_months_check"
  CHECK ("rental_frequency_months" IN (1, 3, 6, 10, 11, 12));
