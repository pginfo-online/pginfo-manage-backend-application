-- CreateTable
CREATE TABLE "due_packages" (
    "id" UUID NOT NULL,
    "organization_id" UUID NOT NULL,
    "property_type" "property_type" NOT NULL,
    "name" TEXT NOT NULL,
    "category" TEXT NOT NULL,
    "billing" TEXT NOT NULL,
    "amount" INTEGER NOT NULL,
    "description" TEXT NOT NULL DEFAULT '',
    "is_active" BOOLEAN NOT NULL DEFAULT true,
    "version" INTEGER NOT NULL DEFAULT 1,
    "created_at" TIMESTAMPTZ NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updated_at" TIMESTAMPTZ NOT NULL,

    CONSTRAINT "due_packages_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "expense_parties" (
    "id" UUID NOT NULL,
    "organization_id" UUID NOT NULL,
    "name" TEXT NOT NULL,
    "created_at" TIMESTAMPTZ NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "expense_parties_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "discount_offers" (
    "id" UUID NOT NULL,
    "organization_id" UUID NOT NULL,
    "resident_id" UUID NOT NULL,
    "amount" INTEGER NOT NULL,
    "valid_till" DATE NOT NULL,
    "minimum_payment" TEXT NOT NULL,
    "minimum_amount" INTEGER,
    "description" TEXT NOT NULL,
    "consumed_at" TIMESTAMPTZ,
    "created_at" TIMESTAMPTZ NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "discount_offers_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE INDEX "due_packages_organization_id_is_active_name_idx" ON "due_packages"("organization_id", "is_active", "name");

-- CreateIndex
CREATE UNIQUE INDEX "due_packages_organization_id_property_type_name_key" ON "due_packages"("organization_id", "property_type", "name");

-- CreateIndex
CREATE UNIQUE INDEX "expense_parties_organization_id_name_key" ON "expense_parties"("organization_id", "name");

-- CreateIndex
CREATE INDEX "discount_offers_organization_id_resident_id_consumed_at_val_idx" ON "discount_offers"("organization_id", "resident_id", "consumed_at", "valid_till");

-- CreateIndex
CREATE INDEX "billing_money_scope_idx" ON "billing_records"("organization_id", "property_id", "status", "due_date", "id");

-- CreateIndex
CREATE INDEX "payment_money_date_idx" ON "payments"("organization_id", "status", "collection_date", "id");

-- CreateIndex
CREATE INDEX "expense_money_scope_idx" ON "expenses"("organization_id", "property_id", "expense_date", "id");

ALTER TABLE due_packages ADD CONSTRAINT due_packages_org_fk FOREIGN KEY (organization_id) REFERENCES organizations(id) ON DELETE CASCADE;
ALTER TABLE expense_parties ADD CONSTRAINT expense_parties_org_fk FOREIGN KEY (organization_id) REFERENCES organizations(id) ON DELETE CASCADE;
ALTER TABLE discount_offers ADD CONSTRAINT discount_offers_org_fk FOREIGN KEY (organization_id) REFERENCES organizations(id) ON DELETE CASCADE;
ALTER TABLE discount_offers ADD CONSTRAINT discount_offers_resident_fk FOREIGN KEY (resident_id) REFERENCES residents(id) ON DELETE CASCADE;
ALTER TABLE due_packages ADD CONSTRAINT due_packages_amount_check CHECK (amount >= 0 AND billing IN ('FIXED','VARIABLE') AND (billing <> 'FIXED' OR amount > 0));
ALTER TABLE discount_offers ADD CONSTRAINT discount_offers_amount_check CHECK (amount > 0 AND minimum_payment IN ('FULL','CUSTOM') AND (minimum_payment <> 'CUSTOM' OR minimum_amount > 0));

INSERT INTO expense_categories (id,organization_id,name,is_system,is_active,created_at)
SELECT gen_random_uuid(),o.id,c.name,true,true,NOW() FROM organizations o CROSS JOIN
(VALUES ('EMI'),('Groceries'),('Salary'),('Electrical Appliances'),('Services'),('Other'),('Travel & Fuel'),('Insurance Premium'),('Loan EMI'),('Maintenance'),('Cleaning'),('Tax'),('Rent')) c(name)
ON CONFLICT (organization_id,name) DO NOTHING;
INSERT INTO expense_parties (id,organization_id,name)
SELECT gen_random_uuid(),organization_id,name FROM (
 SELECT DISTINCT organization_id,trim(paid_by) name FROM expenses WHERE trim(paid_by) <> ''
 UNION SELECT DISTINCT organization_id,trim(paid_to) name FROM expenses WHERE trim(paid_to) <> ''
) parties ON CONFLICT (organization_id,name) DO NOTHING;
