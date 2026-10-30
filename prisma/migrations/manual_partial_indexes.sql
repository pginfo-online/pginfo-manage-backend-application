-- Production-Grade Partial Unique Indexes for RentOK & PG Management

-- 1. Bed Exclusivity: Prevent two residents from concurrently holding the same bed
CREATE UNIQUE INDEX IF NOT EXISTS idx_active_bed_resident 
ON residents (bed_id) 
WHERE status IN ('ACTIVE', 'NOTICE_PERIOD') AND bed_id IS NOT NULL;

-- 2. Single Default Template Per Organization/Property
CREATE UNIQUE INDEX IF NOT EXISTS idx_org_default_agreement 
ON agreement_templates (organization_id) 
WHERE is_default = TRUE AND is_active = TRUE;
