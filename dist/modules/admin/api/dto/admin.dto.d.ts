import { z } from 'zod';
export declare const adminDashboardQuerySchema: z.ZodEffects<z.ZodObject<{
    from: z.ZodOptional<z.ZodDate>;
    to: z.ZodOptional<z.ZodDate>;
    organizationId: z.ZodOptional<z.ZodString>;
}, "strip", z.ZodTypeAny, {
    organizationId?: string | undefined;
    to?: Date | undefined;
    from?: Date | undefined;
}, {
    organizationId?: string | undefined;
    to?: Date | undefined;
    from?: Date | undefined;
}>, {
    organizationId?: string | undefined;
    to?: Date | undefined;
    from?: Date | undefined;
}, {
    organizationId?: string | undefined;
    to?: Date | undefined;
    from?: Date | undefined;
}>;
export type AdminDashboardQueryDto = z.infer<typeof adminDashboardQuerySchema>;
export declare const adminPortfolioQuerySchema: z.ZodEffects<z.ZodObject<{
    from: z.ZodOptional<z.ZodDate>;
    to: z.ZodOptional<z.ZodDate>;
    organizationId: z.ZodOptional<z.ZodString>;
} & {
    page: z.ZodOptional<z.ZodNumber>;
    limit: z.ZodDefault<z.ZodNumber>;
}, "strip", z.ZodTypeAny, {
    limit: number;
    organizationId?: string | undefined;
    to?: Date | undefined;
    page?: number | undefined;
    from?: Date | undefined;
}, {
    organizationId?: string | undefined;
    limit?: number | undefined;
    to?: Date | undefined;
    page?: number | undefined;
    from?: Date | undefined;
}>, {
    limit: number;
    organizationId?: string | undefined;
    to?: Date | undefined;
    page?: number | undefined;
    from?: Date | undefined;
}, {
    organizationId?: string | undefined;
    limit?: number | undefined;
    to?: Date | undefined;
    page?: number | undefined;
    from?: Date | undefined;
}>;
export type AdminPortfolioQueryDto = z.infer<typeof adminPortfolioQuerySchema>;
export declare const adminListQuerySchema: z.ZodObject<{
    page: z.ZodDefault<z.ZodNumber>;
    limit: z.ZodDefault<z.ZodNumber>;
    search: z.ZodOptional<z.ZodString>;
}, "strip", z.ZodTypeAny, {
    limit: number;
    page: number;
    search?: string | undefined;
}, {
    search?: string | undefined;
    limit?: number | undefined;
    page?: number | undefined;
}>;
export type AdminListQueryDto = z.infer<typeof adminListQuerySchema>;
export declare const adminUsersQuerySchema: z.ZodObject<{
    page: z.ZodDefault<z.ZodNumber>;
    limit: z.ZodDefault<z.ZodNumber>;
    search: z.ZodOptional<z.ZodString>;
} & {
    isActive: z.ZodEffects<z.ZodOptional<z.ZodBoolean>, boolean | undefined, unknown>;
    organizationId: z.ZodOptional<z.ZodString>;
}, "strip", z.ZodTypeAny, {
    limit: number;
    page: number;
    search?: string | undefined;
    isActive?: boolean | undefined;
    organizationId?: string | undefined;
}, {
    search?: string | undefined;
    isActive?: unknown;
    organizationId?: string | undefined;
    limit?: number | undefined;
    page?: number | undefined;
}>;
export type AdminUsersQueryDto = z.infer<typeof adminUsersQuerySchema>;
export declare const adminOrganizationsQuerySchema: z.ZodObject<{
    page: z.ZodDefault<z.ZodNumber>;
    limit: z.ZodDefault<z.ZodNumber>;
    search: z.ZodOptional<z.ZodString>;
} & {
    isActive: z.ZodEffects<z.ZodOptional<z.ZodBoolean>, boolean | undefined, unknown>;
}, "strip", z.ZodTypeAny, {
    limit: number;
    page: number;
    search?: string | undefined;
    isActive?: boolean | undefined;
}, {
    search?: string | undefined;
    isActive?: unknown;
    limit?: number | undefined;
    page?: number | undefined;
}>;
export type AdminOrganizationsQueryDto = z.infer<typeof adminOrganizationsQuerySchema>;
export declare const adminPropertiesQuerySchema: z.ZodObject<{
    page: z.ZodDefault<z.ZodNumber>;
    limit: z.ZodDefault<z.ZodNumber>;
    search: z.ZodOptional<z.ZodString>;
} & {
    organizationId: z.ZodOptional<z.ZodString>;
    status: z.ZodOptional<z.ZodNativeEnum<{
        ACTIVE: "ACTIVE";
        INACTIVE: "INACTIVE";
        ARCHIVED: "ARCHIVED";
        UNDER_MAINTENANCE: "UNDER_MAINTENANCE";
    }>>;
}, "strip", z.ZodTypeAny, {
    limit: number;
    page: number;
    search?: string | undefined;
    status?: "ACTIVE" | "INACTIVE" | "ARCHIVED" | "UNDER_MAINTENANCE" | undefined;
    organizationId?: string | undefined;
}, {
    search?: string | undefined;
    status?: "ACTIVE" | "INACTIVE" | "ARCHIVED" | "UNDER_MAINTENANCE" | undefined;
    organizationId?: string | undefined;
    limit?: number | undefined;
    page?: number | undefined;
}>;
export type AdminPropertiesQueryDto = z.infer<typeof adminPropertiesQuerySchema>;
export declare const adminInventoryQuerySchema: z.ZodObject<{
    page: z.ZodDefault<z.ZodNumber>;
    limit: z.ZodDefault<z.ZodNumber>;
    search: z.ZodOptional<z.ZodString>;
} & {
    organizationId: z.ZodOptional<z.ZodString>;
    propertyId: z.ZodOptional<z.ZodString>;
    roomStatus: z.ZodOptional<z.ZodNativeEnum<{
        AVAILABLE: "AVAILABLE";
        OCCUPIED: "OCCUPIED";
        PARTIALLY_OCCUPIED: "PARTIALLY_OCCUPIED";
        UNDER_MAINTENANCE: "UNDER_MAINTENANCE";
        ARCHIVED: "ARCHIVED";
    }>>;
    bedStatus: z.ZodOptional<z.ZodNativeEnum<{
        AVAILABLE: "AVAILABLE";
        OCCUPIED: "OCCUPIED";
        RESERVED: "RESERVED";
        UNDER_MAINTENANCE: "UNDER_MAINTENANCE";
        ARCHIVED: "ARCHIVED";
    }>>;
}, "strip", z.ZodTypeAny, {
    limit: number;
    page: number;
    search?: string | undefined;
    organizationId?: string | undefined;
    propertyId?: string | undefined;
    roomStatus?: "ARCHIVED" | "UNDER_MAINTENANCE" | "AVAILABLE" | "OCCUPIED" | "PARTIALLY_OCCUPIED" | undefined;
    bedStatus?: "ARCHIVED" | "UNDER_MAINTENANCE" | "AVAILABLE" | "OCCUPIED" | "RESERVED" | undefined;
}, {
    search?: string | undefined;
    organizationId?: string | undefined;
    limit?: number | undefined;
    page?: number | undefined;
    propertyId?: string | undefined;
    roomStatus?: "ARCHIVED" | "UNDER_MAINTENANCE" | "AVAILABLE" | "OCCUPIED" | "PARTIALLY_OCCUPIED" | undefined;
    bedStatus?: "ARCHIVED" | "UNDER_MAINTENANCE" | "AVAILABLE" | "OCCUPIED" | "RESERVED" | undefined;
}>;
export type AdminInventoryQueryDto = z.infer<typeof adminInventoryQuerySchema>;
export declare const adminResidentsQuerySchema: z.ZodObject<{
    page: z.ZodDefault<z.ZodNumber>;
    limit: z.ZodDefault<z.ZodNumber>;
    search: z.ZodOptional<z.ZodString>;
} & {
    organizationId: z.ZodOptional<z.ZodString>;
    propertyId: z.ZodOptional<z.ZodString>;
    status: z.ZodOptional<z.ZodEnum<["PENDING_MOVE_IN", "ACTIVE", "NOTICE_PERIOD", "MOVED_OUT", "ARCHIVED"]>>;
}, "strip", z.ZodTypeAny, {
    limit: number;
    page: number;
    search?: string | undefined;
    status?: "ACTIVE" | "ARCHIVED" | "PENDING_MOVE_IN" | "NOTICE_PERIOD" | "MOVED_OUT" | undefined;
    organizationId?: string | undefined;
    propertyId?: string | undefined;
}, {
    search?: string | undefined;
    status?: "ACTIVE" | "ARCHIVED" | "PENDING_MOVE_IN" | "NOTICE_PERIOD" | "MOVED_OUT" | undefined;
    organizationId?: string | undefined;
    limit?: number | undefined;
    page?: number | undefined;
    propertyId?: string | undefined;
}>;
export type AdminResidentsQueryDto = z.infer<typeof adminResidentsQuerySchema>;
export declare const adminBookingsQuerySchema: z.ZodObject<{
    page: z.ZodDefault<z.ZodNumber>;
    limit: z.ZodDefault<z.ZodNumber>;
    search: z.ZodOptional<z.ZodString>;
} & {
    organizationId: z.ZodOptional<z.ZodString>;
    propertyId: z.ZodOptional<z.ZodString>;
    status: z.ZodOptional<z.ZodEnum<["CONFIRMED", "CHECKED_IN", "CANCELLED", "EXPIRED"]>>;
}, "strip", z.ZodTypeAny, {
    limit: number;
    page: number;
    search?: string | undefined;
    status?: "CONFIRMED" | "CHECKED_IN" | "CANCELLED" | "EXPIRED" | undefined;
    organizationId?: string | undefined;
    propertyId?: string | undefined;
}, {
    search?: string | undefined;
    status?: "CONFIRMED" | "CHECKED_IN" | "CANCELLED" | "EXPIRED" | undefined;
    organizationId?: string | undefined;
    limit?: number | undefined;
    page?: number | undefined;
    propertyId?: string | undefined;
}>;
export type AdminBookingsQueryDto = z.infer<typeof adminBookingsQuerySchema>;
export declare const adminComplaintsQuerySchema: z.ZodObject<{
    page: z.ZodDefault<z.ZodNumber>;
    limit: z.ZodDefault<z.ZodNumber>;
    search: z.ZodOptional<z.ZodString>;
} & {
    organizationId: z.ZodOptional<z.ZodString>;
    propertyId: z.ZodOptional<z.ZodString>;
    status: z.ZodOptional<z.ZodEnum<["RECEIVED", "VERIFIED", "NEED_MORE_TIME", "TEAM_WORKING", "PENDING", "RESOLVED"]>>;
    urgency: z.ZodOptional<z.ZodEnum<["LOW", "MEDIUM", "HIGH", "CRITICAL"]>>;
}, "strip", z.ZodTypeAny, {
    limit: number;
    page: number;
    search?: string | undefined;
    status?: "RECEIVED" | "VERIFIED" | "NEED_MORE_TIME" | "TEAM_WORKING" | "PENDING" | "RESOLVED" | undefined;
    organizationId?: string | undefined;
    propertyId?: string | undefined;
    urgency?: "LOW" | "MEDIUM" | "HIGH" | "CRITICAL" | undefined;
}, {
    search?: string | undefined;
    status?: "RECEIVED" | "VERIFIED" | "NEED_MORE_TIME" | "TEAM_WORKING" | "PENDING" | "RESOLVED" | undefined;
    organizationId?: string | undefined;
    limit?: number | undefined;
    page?: number | undefined;
    propertyId?: string | undefined;
    urgency?: "LOW" | "MEDIUM" | "HIGH" | "CRITICAL" | undefined;
}>;
export type AdminComplaintsQueryDto = z.infer<typeof adminComplaintsQuerySchema>;
export declare const adminAnnouncementsQuerySchema: z.ZodObject<{
    page: z.ZodDefault<z.ZodNumber>;
    limit: z.ZodDefault<z.ZodNumber>;
    search: z.ZodOptional<z.ZodString>;
} & {
    organizationId: z.ZodOptional<z.ZodString>;
    propertyId: z.ZodOptional<z.ZodString>;
    status: z.ZodOptional<z.ZodEnum<["DRAFT", "SCHEDULED", "SENDING", "SENT", "FAILED"]>>;
}, "strip", z.ZodTypeAny, {
    limit: number;
    page: number;
    search?: string | undefined;
    status?: "FAILED" | "DRAFT" | "SCHEDULED" | "SENDING" | "SENT" | undefined;
    organizationId?: string | undefined;
    propertyId?: string | undefined;
}, {
    search?: string | undefined;
    status?: "FAILED" | "DRAFT" | "SCHEDULED" | "SENDING" | "SENT" | undefined;
    organizationId?: string | undefined;
    limit?: number | undefined;
    page?: number | undefined;
    propertyId?: string | undefined;
}>;
export type AdminAnnouncementsQueryDto = z.infer<typeof adminAnnouncementsQuerySchema>;
export declare const adminPaymentsQuerySchema: z.ZodEffects<z.ZodObject<{
    page: z.ZodDefault<z.ZodNumber>;
    limit: z.ZodDefault<z.ZodNumber>;
    search: z.ZodOptional<z.ZodString>;
} & {
    organizationId: z.ZodOptional<z.ZodString>;
    status: z.ZodOptional<z.ZodEnum<["PENDING", "CONFIRMED", "FAILED", "REFUNDED", "DISPUTED"]>>;
    mode: z.ZodOptional<z.ZodEnum<["CASH", "UPI", "BANK_TRANSFER", "CHEQUE", "RAZORPAY", "OTHER"]>>;
    from: z.ZodOptional<z.ZodDate>;
    to: z.ZodOptional<z.ZodDate>;
}, "strip", z.ZodTypeAny, {
    limit: number;
    page: number;
    search?: string | undefined;
    status?: "CONFIRMED" | "PENDING" | "FAILED" | "REFUNDED" | "DISPUTED" | undefined;
    mode?: "OTHER" | "CASH" | "UPI" | "BANK_TRANSFER" | "CHEQUE" | "RAZORPAY" | undefined;
    organizationId?: string | undefined;
    to?: Date | undefined;
    from?: Date | undefined;
}, {
    search?: string | undefined;
    status?: "CONFIRMED" | "PENDING" | "FAILED" | "REFUNDED" | "DISPUTED" | undefined;
    mode?: "OTHER" | "CASH" | "UPI" | "BANK_TRANSFER" | "CHEQUE" | "RAZORPAY" | undefined;
    organizationId?: string | undefined;
    limit?: number | undefined;
    to?: Date | undefined;
    page?: number | undefined;
    from?: Date | undefined;
}>, {
    limit: number;
    page: number;
    search?: string | undefined;
    status?: "CONFIRMED" | "PENDING" | "FAILED" | "REFUNDED" | "DISPUTED" | undefined;
    mode?: "OTHER" | "CASH" | "UPI" | "BANK_TRANSFER" | "CHEQUE" | "RAZORPAY" | undefined;
    organizationId?: string | undefined;
    to?: Date | undefined;
    from?: Date | undefined;
}, {
    search?: string | undefined;
    status?: "CONFIRMED" | "PENDING" | "FAILED" | "REFUNDED" | "DISPUTED" | undefined;
    mode?: "OTHER" | "CASH" | "UPI" | "BANK_TRANSFER" | "CHEQUE" | "RAZORPAY" | undefined;
    organizationId?: string | undefined;
    limit?: number | undefined;
    to?: Date | undefined;
    page?: number | undefined;
    from?: Date | undefined;
}>;
export type AdminPaymentsQueryDto = z.infer<typeof adminPaymentsQuerySchema>;
export declare const applyDisputedCaptureSchema: z.ZodObject<{
    reason: z.ZodString;
}, "strip", z.ZodTypeAny, {
    reason: string;
}, {
    reason: string;
}>;
export declare const reconcileSettlementSchema: z.ZodObject<{
    settledOn: z.ZodEffects<z.ZodEffects<z.ZodString, string, string>, string, string>;
}, "strip", z.ZodTypeAny, {
    settledOn: string;
}, {
    settledOn: string;
}>;
export declare const prepareManualPayoutSchema: z.ZodObject<{
    payoutAccountId: z.ZodString;
    amount: z.ZodNumber;
}, "strip", z.ZodTypeAny, {
    amount: number;
    payoutAccountId: string;
}, {
    amount: number;
    payoutAccountId: string;
}>;
export type PrepareManualPayoutDto = z.infer<typeof prepareManualPayoutSchema>;
export declare const recordManualPayoutSchema: z.ZodObject<{
    bankReference: z.ZodString;
    paidOn: z.ZodEffects<z.ZodEffects<z.ZodString, string, string>, string, string>;
}, "strip", z.ZodTypeAny, {
    bankReference: string;
    paidOn: string;
}, {
    bankReference: string;
    paidOn: string;
}>;
export type RecordManualPayoutDto = z.infer<typeof recordManualPayoutSchema>;
export declare const adminPayoutsQuerySchema: z.ZodObject<{
    page: z.ZodDefault<z.ZodNumber>;
    limit: z.ZodDefault<z.ZodNumber>;
    search: z.ZodOptional<z.ZodString>;
} & {
    organizationId: z.ZodOptional<z.ZodString>;
    status: z.ZodOptional<z.ZodEnum<["PENDING", "ACTIVE", "SUSPENDED", "REJECTED"]>>;
    kycStatus: z.ZodOptional<z.ZodNativeEnum<{
        PENDING: "PENDING";
        SUBMITTED: "SUBMITTED";
        VERIFIED: "VERIFIED";
        REJECTED: "REJECTED";
    }>>;
}, "strip", z.ZodTypeAny, {
    limit: number;
    page: number;
    search?: string | undefined;
    status?: "ACTIVE" | "SUSPENDED" | "PENDING" | "REJECTED" | undefined;
    organizationId?: string | undefined;
    kycStatus?: "VERIFIED" | "PENDING" | "REJECTED" | "SUBMITTED" | undefined;
}, {
    search?: string | undefined;
    status?: "ACTIVE" | "SUSPENDED" | "PENDING" | "REJECTED" | undefined;
    organizationId?: string | undefined;
    limit?: number | undefined;
    page?: number | undefined;
    kycStatus?: "VERIFIED" | "PENDING" | "REJECTED" | "SUBMITTED" | undefined;
}>;
export type AdminPayoutsQueryDto = z.infer<typeof adminPayoutsQuerySchema>;
export declare const adminPendingQuerySchema: z.ZodObject<{
    organizationId: z.ZodOptional<z.ZodString>;
}, "strip", z.ZodTypeAny, {
    organizationId?: string | undefined;
}, {
    organizationId?: string | undefined;
}>;
export type AdminPendingQueryDto = z.infer<typeof adminPendingQuerySchema>;
export declare const adminAuditQuerySchema: z.ZodEffects<z.ZodObject<{
    page: z.ZodDefault<z.ZodNumber>;
    limit: z.ZodDefault<z.ZodNumber>;
    search: z.ZodOptional<z.ZodString>;
} & {
    organizationId: z.ZodOptional<z.ZodString>;
    userId: z.ZodOptional<z.ZodString>;
    action: z.ZodOptional<z.ZodString>;
    entityType: z.ZodOptional<z.ZodString>;
    entityId: z.ZodOptional<z.ZodString>;
    from: z.ZodOptional<z.ZodDate>;
    to: z.ZodOptional<z.ZodDate>;
}, "strip", z.ZodTypeAny, {
    limit: number;
    page: number;
    search?: string | undefined;
    userId?: string | undefined;
    organizationId?: string | undefined;
    to?: Date | undefined;
    action?: string | undefined;
    entityType?: string | undefined;
    entityId?: string | undefined;
    from?: Date | undefined;
}, {
    search?: string | undefined;
    userId?: string | undefined;
    organizationId?: string | undefined;
    limit?: number | undefined;
    to?: Date | undefined;
    action?: string | undefined;
    entityType?: string | undefined;
    entityId?: string | undefined;
    page?: number | undefined;
    from?: Date | undefined;
}>, {
    limit: number;
    page: number;
    search?: string | undefined;
    userId?: string | undefined;
    organizationId?: string | undefined;
    to?: Date | undefined;
    action?: string | undefined;
    entityType?: string | undefined;
    entityId?: string | undefined;
    from?: Date | undefined;
}, {
    search?: string | undefined;
    userId?: string | undefined;
    organizationId?: string | undefined;
    limit?: number | undefined;
    to?: Date | undefined;
    action?: string | undefined;
    entityType?: string | undefined;
    entityId?: string | undefined;
    page?: number | undefined;
    from?: Date | undefined;
}>;
export type AdminAuditQueryDto = z.infer<typeof adminAuditQuerySchema>;
export declare const adminCasesQuerySchema: z.ZodObject<{
    page: z.ZodDefault<z.ZodNumber>;
    limit: z.ZodDefault<z.ZodNumber>;
    search: z.ZodOptional<z.ZodString>;
} & {
    type: z.ZodOptional<z.ZodNativeEnum<{
        PROPERTY_VERIFICATION: "PROPERTY_VERIFICATION";
        PAYOUT_KYC: "PAYOUT_KYC";
        PAYMENT_REVIEW: "PAYMENT_REVIEW";
        SUPPORT_ESCALATION: "SUPPORT_ESCALATION";
        FRAUD_REVIEW: "FRAUD_REVIEW";
        DATA_CORRECTION: "DATA_CORRECTION";
        OTHER: "OTHER";
    }>>;
    status: z.ZodOptional<z.ZodNativeEnum<{
        OPEN: "OPEN";
        IN_REVIEW: "IN_REVIEW";
        BLOCKED: "BLOCKED";
        RESOLVED: "RESOLVED";
        REJECTED: "REJECTED";
    }>>;
    priority: z.ZodOptional<z.ZodNativeEnum<{
        LOW: "LOW";
        MEDIUM: "MEDIUM";
        HIGH: "HIGH";
        CRITICAL: "CRITICAL";
    }>>;
    organizationId: z.ZodOptional<z.ZodString>;
    assignedToUserId: z.ZodOptional<z.ZodString>;
}, "strip", z.ZodTypeAny, {
    limit: number;
    page: number;
    search?: string | undefined;
    type?: "OTHER" | "PROPERTY_VERIFICATION" | "PAYOUT_KYC" | "PAYMENT_REVIEW" | "SUPPORT_ESCALATION" | "FRAUD_REVIEW" | "DATA_CORRECTION" | undefined;
    status?: "RESOLVED" | "REJECTED" | "OPEN" | "IN_REVIEW" | "BLOCKED" | undefined;
    organizationId?: string | undefined;
    priority?: "LOW" | "MEDIUM" | "HIGH" | "CRITICAL" | undefined;
    assignedToUserId?: string | undefined;
}, {
    search?: string | undefined;
    type?: "OTHER" | "PROPERTY_VERIFICATION" | "PAYOUT_KYC" | "PAYMENT_REVIEW" | "SUPPORT_ESCALATION" | "FRAUD_REVIEW" | "DATA_CORRECTION" | undefined;
    status?: "RESOLVED" | "REJECTED" | "OPEN" | "IN_REVIEW" | "BLOCKED" | undefined;
    organizationId?: string | undefined;
    limit?: number | undefined;
    page?: number | undefined;
    priority?: "LOW" | "MEDIUM" | "HIGH" | "CRITICAL" | undefined;
    assignedToUserId?: string | undefined;
}>;
export type AdminCasesQueryDto = z.infer<typeof adminCasesQuerySchema>;
export declare const createPlatformAdminSchema: z.ZodObject<{
    email: z.ZodString;
    role: z.ZodNativeEnum<{
        SUPER_ADMIN: "SUPER_ADMIN";
        OPERATIONS_ADMIN: "OPERATIONS_ADMIN";
        FINANCE_ADMIN: "FINANCE_ADMIN";
        SUPPORT_ADMIN: "SUPPORT_ADMIN";
        ANALYST: "ANALYST";
        AUDITOR: "AUDITOR";
    }>;
    permissionOverrides: z.ZodDefault<z.ZodArray<z.ZodEnum<["dashboard.read", "users.read", "users.write", "organizations.read", "organizations.write", "properties.read", "properties.write", "inventory.read", "inventory.write", "residents.read", "bookings.read", "finance.read", "finance.review", "banks.read", "banks.review", "reports.read", "audit.read", "support.read", "support.write", "settings.read", "settings.write", "admins.manage"]>, "many">>;
}, "strip", z.ZodTypeAny, {
    role: "SUPER_ADMIN" | "OPERATIONS_ADMIN" | "FINANCE_ADMIN" | "SUPPORT_ADMIN" | "ANALYST" | "AUDITOR";
    email: string;
    permissionOverrides: ("dashboard.read" | "users.read" | "users.write" | "organizations.read" | "organizations.write" | "properties.read" | "properties.write" | "inventory.read" | "inventory.write" | "residents.read" | "bookings.read" | "finance.read" | "finance.review" | "banks.read" | "banks.review" | "reports.read" | "audit.read" | "support.read" | "support.write" | "settings.read" | "settings.write" | "admins.manage")[];
}, {
    role: "SUPER_ADMIN" | "OPERATIONS_ADMIN" | "FINANCE_ADMIN" | "SUPPORT_ADMIN" | "ANALYST" | "AUDITOR";
    email: string;
    permissionOverrides?: ("dashboard.read" | "users.read" | "users.write" | "organizations.read" | "organizations.write" | "properties.read" | "properties.write" | "inventory.read" | "inventory.write" | "residents.read" | "bookings.read" | "finance.read" | "finance.review" | "banks.read" | "banks.review" | "reports.read" | "audit.read" | "support.read" | "support.write" | "settings.read" | "settings.write" | "admins.manage")[] | undefined;
}>;
export type CreatePlatformAdminDto = z.infer<typeof createPlatformAdminSchema>;
export declare const updatePlatformAdminSchema: z.ZodEffects<z.ZodObject<{
    role: z.ZodOptional<z.ZodNativeEnum<{
        SUPER_ADMIN: "SUPER_ADMIN";
        OPERATIONS_ADMIN: "OPERATIONS_ADMIN";
        FINANCE_ADMIN: "FINANCE_ADMIN";
        SUPPORT_ADMIN: "SUPPORT_ADMIN";
        ANALYST: "ANALYST";
        AUDITOR: "AUDITOR";
    }>>;
    status: z.ZodOptional<z.ZodNativeEnum<{
        ACTIVE: "ACTIVE";
        SUSPENDED: "SUSPENDED";
        REVOKED: "REVOKED";
    }>>;
    permissionOverrides: z.ZodOptional<z.ZodArray<z.ZodEnum<["dashboard.read", "users.read", "users.write", "organizations.read", "organizations.write", "properties.read", "properties.write", "inventory.read", "inventory.write", "residents.read", "bookings.read", "finance.read", "finance.review", "banks.read", "banks.review", "reports.read", "audit.read", "support.read", "support.write", "settings.read", "settings.write", "admins.manage"]>, "many">>;
    reason: z.ZodString;
}, "strip", z.ZodTypeAny, {
    reason: string;
    status?: "ACTIVE" | "SUSPENDED" | "REVOKED" | undefined;
    role?: "SUPER_ADMIN" | "OPERATIONS_ADMIN" | "FINANCE_ADMIN" | "SUPPORT_ADMIN" | "ANALYST" | "AUDITOR" | undefined;
    permissionOverrides?: ("dashboard.read" | "users.read" | "users.write" | "organizations.read" | "organizations.write" | "properties.read" | "properties.write" | "inventory.read" | "inventory.write" | "residents.read" | "bookings.read" | "finance.read" | "finance.review" | "banks.read" | "banks.review" | "reports.read" | "audit.read" | "support.read" | "support.write" | "settings.read" | "settings.write" | "admins.manage")[] | undefined;
}, {
    reason: string;
    status?: "ACTIVE" | "SUSPENDED" | "REVOKED" | undefined;
    role?: "SUPER_ADMIN" | "OPERATIONS_ADMIN" | "FINANCE_ADMIN" | "SUPPORT_ADMIN" | "ANALYST" | "AUDITOR" | undefined;
    permissionOverrides?: ("dashboard.read" | "users.read" | "users.write" | "organizations.read" | "organizations.write" | "properties.read" | "properties.write" | "inventory.read" | "inventory.write" | "residents.read" | "bookings.read" | "finance.read" | "finance.review" | "banks.read" | "banks.review" | "reports.read" | "audit.read" | "support.read" | "support.write" | "settings.read" | "settings.write" | "admins.manage")[] | undefined;
}>, {
    reason: string;
    status?: "ACTIVE" | "SUSPENDED" | "REVOKED" | undefined;
    role?: "SUPER_ADMIN" | "OPERATIONS_ADMIN" | "FINANCE_ADMIN" | "SUPPORT_ADMIN" | "ANALYST" | "AUDITOR" | undefined;
    permissionOverrides?: ("dashboard.read" | "users.read" | "users.write" | "organizations.read" | "organizations.write" | "properties.read" | "properties.write" | "inventory.read" | "inventory.write" | "residents.read" | "bookings.read" | "finance.read" | "finance.review" | "banks.read" | "banks.review" | "reports.read" | "audit.read" | "support.read" | "support.write" | "settings.read" | "settings.write" | "admins.manage")[] | undefined;
}, {
    reason: string;
    status?: "ACTIVE" | "SUSPENDED" | "REVOKED" | undefined;
    role?: "SUPER_ADMIN" | "OPERATIONS_ADMIN" | "FINANCE_ADMIN" | "SUPPORT_ADMIN" | "ANALYST" | "AUDITOR" | undefined;
    permissionOverrides?: ("dashboard.read" | "users.read" | "users.write" | "organizations.read" | "organizations.write" | "properties.read" | "properties.write" | "inventory.read" | "inventory.write" | "residents.read" | "bookings.read" | "finance.read" | "finance.review" | "banks.read" | "banks.review" | "reports.read" | "audit.read" | "support.read" | "support.write" | "settings.read" | "settings.write" | "admins.manage")[] | undefined;
}>;
export type UpdatePlatformAdminDto = z.infer<typeof updatePlatformAdminSchema>;
export declare const updateUserStatusSchema: z.ZodObject<{
    isActive: z.ZodBoolean;
    reason: z.ZodString;
}, "strip", z.ZodTypeAny, {
    isActive: boolean;
    reason: string;
}, {
    isActive: boolean;
    reason: string;
}>;
export type UpdateUserStatusDto = z.infer<typeof updateUserStatusSchema>;
export declare const updateOrganizationStatusSchema: z.ZodObject<{
    isActive: z.ZodBoolean;
    reason: z.ZodString;
}, "strip", z.ZodTypeAny, {
    isActive: boolean;
    reason: string;
}, {
    isActive: boolean;
    reason: string;
}>;
export type UpdateOrganizationStatusDto = z.infer<typeof updateOrganizationStatusSchema>;
export declare const updatePropertyStatusSchema: z.ZodObject<{
    status: z.ZodNativeEnum<{
        ACTIVE: "ACTIVE";
        INACTIVE: "INACTIVE";
        ARCHIVED: "ARCHIVED";
        UNDER_MAINTENANCE: "UNDER_MAINTENANCE";
    }>;
    reason: z.ZodString;
}, "strip", z.ZodTypeAny, {
    status: "ACTIVE" | "INACTIVE" | "ARCHIVED" | "UNDER_MAINTENANCE";
    reason: string;
}, {
    status: "ACTIVE" | "INACTIVE" | "ARCHIVED" | "UNDER_MAINTENANCE";
    reason: string;
}>;
export type UpdatePropertyStatusDto = z.infer<typeof updatePropertyStatusSchema>;
export declare const updateRoomStatusSchema: z.ZodObject<{
    status: z.ZodNativeEnum<{
        AVAILABLE: "AVAILABLE";
        OCCUPIED: "OCCUPIED";
        PARTIALLY_OCCUPIED: "PARTIALLY_OCCUPIED";
        UNDER_MAINTENANCE: "UNDER_MAINTENANCE";
        ARCHIVED: "ARCHIVED";
    }>;
    reason: z.ZodString;
}, "strip", z.ZodTypeAny, {
    status: "ARCHIVED" | "UNDER_MAINTENANCE" | "AVAILABLE" | "OCCUPIED" | "PARTIALLY_OCCUPIED";
    reason: string;
}, {
    status: "ARCHIVED" | "UNDER_MAINTENANCE" | "AVAILABLE" | "OCCUPIED" | "PARTIALLY_OCCUPIED";
    reason: string;
}>;
export type UpdateRoomStatusDto = z.infer<typeof updateRoomStatusSchema>;
export declare const updateBedStatusSchema: z.ZodObject<{
    status: z.ZodNativeEnum<{
        AVAILABLE: "AVAILABLE";
        OCCUPIED: "OCCUPIED";
        RESERVED: "RESERVED";
        UNDER_MAINTENANCE: "UNDER_MAINTENANCE";
        ARCHIVED: "ARCHIVED";
    }>;
    reason: z.ZodString;
}, "strip", z.ZodTypeAny, {
    status: "ARCHIVED" | "UNDER_MAINTENANCE" | "AVAILABLE" | "OCCUPIED" | "RESERVED";
    reason: string;
}, {
    status: "ARCHIVED" | "UNDER_MAINTENANCE" | "AVAILABLE" | "OCCUPIED" | "RESERVED";
    reason: string;
}>;
export type UpdateBedStatusDto = z.infer<typeof updateBedStatusSchema>;
export declare const reviewPayoutSchema: z.ZodEffects<z.ZodObject<{
    kycStatus: z.ZodNativeEnum<{
        PENDING: "PENDING";
        SUBMITTED: "SUBMITTED";
        VERIFIED: "VERIFIED";
        REJECTED: "REJECTED";
    }>;
    status: z.ZodOptional<z.ZodEnum<["PENDING", "ACTIVE", "SUSPENDED", "REJECTED"]>>;
    reason: z.ZodString;
}, "strip", z.ZodTypeAny, {
    reason: string;
    kycStatus: "VERIFIED" | "PENDING" | "REJECTED" | "SUBMITTED";
    status?: "ACTIVE" | "SUSPENDED" | "PENDING" | "REJECTED" | undefined;
}, {
    reason: string;
    kycStatus: "VERIFIED" | "PENDING" | "REJECTED" | "SUBMITTED";
    status?: "ACTIVE" | "SUSPENDED" | "PENDING" | "REJECTED" | undefined;
}>, {
    reason: string;
    kycStatus: "VERIFIED" | "PENDING" | "REJECTED" | "SUBMITTED";
    status?: "ACTIVE" | "SUSPENDED" | "PENDING" | "REJECTED" | undefined;
}, {
    reason: string;
    kycStatus: "VERIFIED" | "PENDING" | "REJECTED" | "SUBMITTED";
    status?: "ACTIVE" | "SUSPENDED" | "PENDING" | "REJECTED" | undefined;
}>;
export type ReviewPayoutDto = z.infer<typeof reviewPayoutSchema>;
export declare const createAdminCaseSchema: z.ZodObject<{
    type: z.ZodNativeEnum<{
        PROPERTY_VERIFICATION: "PROPERTY_VERIFICATION";
        PAYOUT_KYC: "PAYOUT_KYC";
        PAYMENT_REVIEW: "PAYMENT_REVIEW";
        SUPPORT_ESCALATION: "SUPPORT_ESCALATION";
        FRAUD_REVIEW: "FRAUD_REVIEW";
        DATA_CORRECTION: "DATA_CORRECTION";
        OTHER: "OTHER";
    }>;
    priority: z.ZodDefault<z.ZodNativeEnum<{
        LOW: "LOW";
        MEDIUM: "MEDIUM";
        HIGH: "HIGH";
        CRITICAL: "CRITICAL";
    }>>;
    title: z.ZodString;
    description: z.ZodOptional<z.ZodString>;
    organizationId: z.ZodOptional<z.ZodString>;
    targetType: z.ZodOptional<z.ZodString>;
    targetId: z.ZodOptional<z.ZodString>;
    assignedToUserId: z.ZodOptional<z.ZodString>;
    evidence: z.ZodOptional<z.ZodRecord<z.ZodString, z.ZodUnknown>>;
    idempotencyKey: z.ZodOptional<z.ZodString>;
    dueAt: z.ZodOptional<z.ZodDate>;
}, "strip", z.ZodTypeAny, {
    type: "OTHER" | "PROPERTY_VERIFICATION" | "PAYOUT_KYC" | "PAYMENT_REVIEW" | "SUPPORT_ESCALATION" | "FRAUD_REVIEW" | "DATA_CORRECTION";
    title: string;
    priority: "LOW" | "MEDIUM" | "HIGH" | "CRITICAL";
    organizationId?: string | undefined;
    description?: string | undefined;
    idempotencyKey?: string | undefined;
    assignedToUserId?: string | undefined;
    targetType?: string | undefined;
    targetId?: string | undefined;
    evidence?: Record<string, unknown> | undefined;
    dueAt?: Date | undefined;
}, {
    type: "OTHER" | "PROPERTY_VERIFICATION" | "PAYOUT_KYC" | "PAYMENT_REVIEW" | "SUPPORT_ESCALATION" | "FRAUD_REVIEW" | "DATA_CORRECTION";
    title: string;
    organizationId?: string | undefined;
    description?: string | undefined;
    idempotencyKey?: string | undefined;
    priority?: "LOW" | "MEDIUM" | "HIGH" | "CRITICAL" | undefined;
    assignedToUserId?: string | undefined;
    targetType?: string | undefined;
    targetId?: string | undefined;
    evidence?: Record<string, unknown> | undefined;
    dueAt?: Date | undefined;
}>;
export type CreateAdminCaseDto = z.infer<typeof createAdminCaseSchema>;
export declare const updateAdminCaseSchema: z.ZodObject<{
    status: z.ZodOptional<z.ZodNativeEnum<{
        OPEN: "OPEN";
        IN_REVIEW: "IN_REVIEW";
        BLOCKED: "BLOCKED";
        RESOLVED: "RESOLVED";
        REJECTED: "REJECTED";
    }>>;
    priority: z.ZodOptional<z.ZodNativeEnum<{
        LOW: "LOW";
        MEDIUM: "MEDIUM";
        HIGH: "HIGH";
        CRITICAL: "CRITICAL";
    }>>;
    assignedToUserId: z.ZodOptional<z.ZodNullable<z.ZodString>>;
    resolution: z.ZodOptional<z.ZodString>;
    evidence: z.ZodOptional<z.ZodRecord<z.ZodString, z.ZodUnknown>>;
    dueAt: z.ZodOptional<z.ZodNullable<z.ZodDate>>;
    reason: z.ZodString;
}, "strip", z.ZodTypeAny, {
    reason: string;
    status?: "RESOLVED" | "REJECTED" | "OPEN" | "IN_REVIEW" | "BLOCKED" | undefined;
    resolution?: string | undefined;
    priority?: "LOW" | "MEDIUM" | "HIGH" | "CRITICAL" | undefined;
    assignedToUserId?: string | null | undefined;
    evidence?: Record<string, unknown> | undefined;
    dueAt?: Date | null | undefined;
}, {
    reason: string;
    status?: "RESOLVED" | "REJECTED" | "OPEN" | "IN_REVIEW" | "BLOCKED" | undefined;
    resolution?: string | undefined;
    priority?: "LOW" | "MEDIUM" | "HIGH" | "CRITICAL" | undefined;
    assignedToUserId?: string | null | undefined;
    evidence?: Record<string, unknown> | undefined;
    dueAt?: Date | null | undefined;
}>;
export type UpdateAdminCaseDto = z.infer<typeof updateAdminCaseSchema>;
export declare const upsertPlatformSettingSchema: z.ZodObject<{
    value: z.ZodUnknown;
    description: z.ZodOptional<z.ZodString>;
    isPublic: z.ZodDefault<z.ZodBoolean>;
    expectedVersion: z.ZodOptional<z.ZodNumber>;
    reason: z.ZodString;
}, "strip", z.ZodTypeAny, {
    isPublic: boolean;
    reason: string;
    value?: unknown;
    description?: string | undefined;
    expectedVersion?: number | undefined;
}, {
    reason: string;
    value?: unknown;
    isPublic?: boolean | undefined;
    description?: string | undefined;
    expectedVersion?: number | undefined;
}>;
export type UpsertPlatformSettingDto = z.infer<typeof upsertPlatformSettingSchema>;
