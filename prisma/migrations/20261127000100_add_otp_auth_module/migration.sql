-- Allow OTP-only registrations without mandatory email or password
ALTER TABLE "users"
  ALTER COLUMN "email" DROP NOT NULL,
  ALTER COLUMN "password_hash" DROP NOT NULL;

-- CreateEnum
DO $$ BEGIN
  CREATE TYPE "otp_purpose" AS ENUM ('LOGIN', 'REGISTER');
EXCEPTION
  WHEN duplicate_object THEN null;
END $$;

-- CreateTable
CREATE TABLE IF NOT EXISTS "otp_verifications" (
  "id" UUID NOT NULL DEFAULT gen_random_uuid(),
  "mobile" VARCHAR(15) NOT NULL,
  "purpose" "otp_purpose" NOT NULL,
  "otp_hash" TEXT NOT NULL,
  "salt" VARCHAR(64) NOT NULL,
  "attempts" INTEGER NOT NULL DEFAULT 0,
  "max_attempts" INTEGER NOT NULL DEFAULT 5,
  "expires_at" TIMESTAMPTZ NOT NULL,
  "consumed_at" TIMESTAMPTZ,
  "invalidated_at" TIMESTAMPTZ,
  "provider_message_id" TEXT,
  "ip_address" INET,
  "user_agent" TEXT,
  "created_at" TIMESTAMPTZ NOT NULL DEFAULT CURRENT_TIMESTAMP,

  CONSTRAINT "otp_verifications_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE INDEX IF NOT EXISTS "otp_verifications_mobile_purpose_created_at_idx"
  ON "otp_verifications"("mobile", "purpose", "created_at" DESC);

CREATE INDEX IF NOT EXISTS "otp_verifications_expires_at_idx"
  ON "otp_verifications"("expires_at");
