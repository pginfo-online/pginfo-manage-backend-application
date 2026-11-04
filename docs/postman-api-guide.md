# PgInfo APIS testing guide (Postman)

This guide covers the HTTP endpoints currently exposed by the backend and explains how to exercise them with Postman. For the complete machine-readable endpoint and schema reference, start the API and import its OpenAPI document as described below.

## 1. Start the API

From the `backend` directory, make sure PostgreSQL and Redis are available and the `.env` values are configured. Then run:

```bash
pnpm install
pnpm prisma:generate
pnpm prisma:migrate:dev
pnpm start:dev
```

The local API base URL is:

```text
http://localhost:3000
```

`localhost` is reachable only from the computer running the API. To call the API
from a phone on the same Wi-Fi network, use the computer's LAN IP instead (for
example, `http://192.168.1.105:3000`) and check
`http://192.168.1.105:3000/health/live`. The `/api/v1` prefix itself is not a
health or root endpoint, so `GET /api/v1` may correctly return 404.

The API prefix defaults to `/api/v1`. It can be changed with `API_PREFIX` in `.env`.

## 2. Import all endpoints into Postman

The running application provides Swagger UI and an OpenAPI JSON document:

- Swagger UI: `http://localhost:3000/api/docs`
- OpenAPI JSON for Postman import: `http://localhost:3000/api/docs-json`

In Postman, choose **Import → Link**, paste the OpenAPI JSON URL, and import it. Postman will create requests for the API operations described in the generated OpenAPI document. Use this guide for the recommended test order, required organization context, and example request bodies.

> Swagger is disabled when `NODE_ENV=production`.

## 3. Configure a Postman environment

Create a Postman environment with these variables:

| Variable | Example | Purpose |
|---|---|---|
| `baseUrl` | `http://localhost:3000` | Backend origin, without `/api/v1` |
| `apiPrefix` | `/api/v1` | API prefix from `API_PREFIX` |
| `accessToken` | *(empty initially)* | JWT access token |
| `refreshToken` | *(empty initially)* | JWT refresh token |
| `organizationId` | *(empty initially)* | Organization UUID |
| `propertyId` | *(empty initially)* | Property UUID |
| `residentId` | *(empty initially)* | Resident UUID |
| `roomId` | *(empty initially)* | Room UUID |
| `bedId` | *(empty initially)* | Bed UUID |
| `staffId` | *(empty initially)* | Staff UUID |
| `billingRecordId` | *(empty initially)* | Billing record UUID |
| `paymentId` | *(empty initially)* | Payment UUID |
| `complaintId` | *(empty initially)* | Complaint UUID |
| `announcementId` | *(empty initially)* | Announcement UUID |

When testing from a phone, set `baseUrl` to the computer's LAN address instead
of `localhost`.

Use `{{baseUrl}}{{apiPrefix}}` at the start of API request URLs. For example:

```text
{{baseUrl}}{{apiPrefix}}/auth/login
```

For JSON requests, set **Body → raw → JSON** and include:

```http
Content-Type: application/json
```

For authenticated requests, use Postman's **Authorization → Bearer Token** and enter `{{accessToken}}`. The API reads the organization context from the access token, not from an `organizationId` request header.

## 4. Recommended test order

1. Call `GET {{baseUrl}}/health/live` to check that the API process responds.
2. Register a test user with `POST /auth/register`, or sign in with `POST /auth/login`. Registration accepts an optional `organizationName`; it creates the organization, assigns the user as `OWNER`, seeds default categories and designations, and returns an organization-scoped access token in the same operation.
3. Save `tokens.accessToken` and `tokens.refreshToken` from the response into the environment. For a newly registered user, save `user.activeOrganizationId` as `organizationId`; the access token already carries this organization context.
4. For an existing user who has no organization, create one with `POST /organizations`. The creator becomes its `OWNER`. Save the returned organization `id`, then call `POST /organizations/{{organizationId}}/switch` and save the returned access token.
5. Use the organization-scoped access token for organization endpoints. Create a property, room, bed, and resident before trying endpoints that depend on those records.
6. Test billing and payment operations with the created resident. Add any custom categories or designations only if needed; organizations are created with system defaults.
7. Use IDs returned by successful responses for later path and body parameters. UUID fields must be valid UUIDs belonging to the active organization.

## 5. Conventions and test notes

- **Authentication:** Every endpoint is public unless marked **Bearer required** below. Use `Authorization: Bearer {{accessToken}}`.
- **Organization context:** Properties, residents, finance, staff, complaints, announcements, dashboard, and exports require a token issued after switching to an organization. Some actions also restrict roles; the current user's role is assigned when joining or creating the organization.
- **IDs:** Replace `{{...Id}}` path/body placeholders with actual UUIDs from previous responses.
- **Money:** Amounts, rents, deposits, and salaries are integer **paise**, not rupees. For example, ₹5,000 is `500000`.
- **Dates:** Date-only fields use `YYYY-MM-DD`; scheduled timestamps use ISO 8601, such as `2026-10-27T09:00:00.000Z`.
- **Pagination:** List endpoints commonly accept `page` (minimum 1) and `limit` (1–100, default 20). Check the individual endpoint notes below.
- **Validation:** Request bodies are validated. Invalid fields generally return HTTP 400 in the API's Problem Details format.
- **Destructive operations:** Delete/archive, payment, move-out, billing, and dispatch actions can change persistent state or contact configured integrations. Prefer test data and sandbox integration credentials.
- **Razorpay:** Payment order/verification flows require the Razorpay configuration and valid sandbox payment data. The webhook requires a valid `x-razorpay-signature`; do not test it with a fabricated signature.
- **External messaging:** Announcement dispatch and rent reminders may use configured Email/WhatsApp adapters. Avoid dispatching to real recipients while testing.
- **Health checks:** `/health/ready` checks database readiness. It is not a Redis health check.

The backend returns errors using a Problem Details shape similar to:

```json
{
  "type": "https://pginfo.dev/errors/bad-request",
  "title": "Bad Request",
  "status": 400,
  "detail": "Request validation failed",
  "instance": "/api/v1/example",
  "traceId": "request-trace-id",
  "timestamp": "2026-10-27T06:45:00.000Z"
}
```

The exact `detail` and optional validation `errors` depend on the failure.

## 6. Endpoint reference

`B` in the access column means the request requires a bearer token. **Org** means the access token must also have an active organization context.

### Health

| Method and path | Access | Description |
|---|---|---|
| `GET /health/live` | Public | Liveness probe; confirms the HTTP process is running. |
| `GET /health/ready` | Public | Readiness probe; checks database connectivity. |

Health routes are outside the `/api/v1` prefix.

### Authentication

| Method and path | Access | Description |
|---|---|---|
| `POST /auth/register` | Public | Create an account and receive access and refresh tokens. |
| `POST /auth/login` | Public | Authenticate with email and password. |
| `POST /auth/refresh` | Public | Exchange a refresh token for a rotated token pair. |
| `POST /auth/logout` | B | Revoke the supplied refresh token for the authenticated user. |
| `GET /auth/me` | B | Return the current user's profile and organization memberships. |

**Register body**

```json
{
  "email": "owner@example.com",
  "password": "StrongPass123",
  "firstName": "Asha",
  "lastName": "Sharma",
  "mobile": "9876543210"
}
```

`lastName` and `mobile` are optional. Passwords must be 8–100 characters and contain uppercase, lowercase, and numeric characters.

**Login body**

```json
{
  "email": "owner@example.com",
  "password": "StrongPass123"
}
```

**Refresh and logout body**

```json
{
  "refreshToken": "{{refreshToken}}"
}
```

The authentication response contains a `tokens` object with `accessToken`, `refreshToken`, and `expiresIn`, plus a `user` object.

### Organizations

All organization endpoints require a bearer token. The organization creator is assigned the `OWNER` role.

| Method and path | Description |
|---|---|
| `POST /organizations` | Create an organization. |
| `GET /organizations` | List organizations the current user belongs to. |
| `GET /organizations/{{organizationId}}` | Get one organization. |
| `POST /organizations/{{organizationId}}/switch` | Issue an organization-scoped access token. Use this before organization-scoped requests. |
| `GET /organizations/{{organizationId}}/members` | List organization members. |
| `POST /organizations/{{organizationId}}/members` | Add an existing registered user by email. |
| `PATCH /organizations/{{organizationId}}/members/{{memberId}}` | Change a member's role. |
| `DELETE /organizations/{{organizationId}}/members/{{memberId}}` | Remove a member. |

**Create organization**

```json
{
  "name": "Sunrise Living",
  "slug": "sunrise-living"
}
```

`slug` is optional; if omitted, the API derives one from the name.

**Add member**

```json
{
  "email": "manager@example.com",
  "role": "MANAGER"
}
```

Allowed roles for adding or updating members: `ADMIN`, `MANAGER`, `STAFF`, `VIEWER`.

**Update member role**

```json
{
  "role": "STAFF"
}
```

### Properties

All property endpoints require **B + Org**.

| Method and path | Description |
|---|---|
| `POST /properties` | Create a property in the active organization. |
| `GET /properties` | List properties. Query: `search`, `status`, `type`, `page`, `limit`. |
| `GET /properties/{{propertyId}}` | Get property details and statistics. |
| `PATCH /properties/{{propertyId}}` | Update supplied property fields. |
| `DELETE /properties/{{propertyId}}` | Archive a property (soft delete). |
| `GET /properties/{{propertyId}}/occupancy-map` | Get rooms, beds, and resident occupancy for the property. |

**Create property**

```json
{
  "name": "Sunrise PG",
  "type": "PG",
  "addressLine1": "12 Example Road",
  "city": "Pune",
  "state": "Maharashtra",
  "pincode": "411001",
  "country": "IN",
  "timezone": "Asia/Kolkata",
  "rentDueDay": 1,
  "amenities": ["WiFi", "Laundry"],
  "totalFloors": 3
}
```

Required fields: `name`, `type`, `addressLine1`, `city`, `state`, `pincode`. Property types: `PG`, `HOSTEL`, `CO_LIVING`, `FLAT`, `APARTMENT`, `RK`, `OTHER`. Property statuses: `ACTIVE`, `INACTIVE`, `ARCHIVED`, `UNDER_MAINTENANCE`.

### Rooms and beds

All room and bed endpoints require **B + Org**.

| Method and path | Description |
|---|---|
| `POST /properties/{{propertyId}}/rooms` | Create a room in the property. |
| `GET /properties/{{propertyId}}/rooms` | List rooms and beds in the property. |
| `GET /rooms/{{roomId}}` | Get room details. |
| `PATCH /rooms/{{roomId}}` | Update room details. |
| `DELETE /rooms/{{roomId}}` | Archive a room. |
| `POST /rooms/{{roomId}}/beds` | Add a bed to a room. |
| `PATCH /beds/{{bedId}}` | Update bed details or rent override. |
| `DELETE /beds/{{bedId}}` | Archive a bed. |

**Create room**

```json
{
  "roomNumber": "101",
  "floor": "1",
  "sharingType": "DOUBLE",
  "rentAmount": 800000,
  "amenities": ["Attached bathroom"],
  "initialBedCount": 2
}
```

`rentAmount` is in paise. Sharing types include `SINGLE`, `DOUBLE`, `TRIPLE`, and `FOUR_SHARING` through `NINE_SHARING`. `initialBedCount` (1–10) can create beds when the room is created.

**Add bed**

```json
{
  "bedNumber": "A",
  "rentAmount": 800000
}
```

Room statuses: `AVAILABLE`, `OCCUPIED`, `PARTIALLY_OCCUPIED`, `UNDER_MAINTENANCE`, `ARCHIVED`. Bed statuses: `AVAILABLE`, `OCCUPIED`, `RESERVED`, `UNDER_MAINTENANCE`, `ARCHIVED`.

### Residents and occupancy

All resident endpoints require **B + Org**.

| Method and path | Description |
|---|---|
| `POST /residents` | Onboard a resident and optionally assign a room/bed. |
| `GET /residents` | List residents. Query: `propertyId`, `status`, `search`, `page`, `limit`. |
| `GET /residents/{{residentId}}` | Get a resident profile, allocation, and balance summary. |
| `PATCH /residents/{{residentId}}` | Update personal or lease details. |
| `POST /residents/{{residentId}}/reallocate` | Move a resident to another room/bed. |
| `POST /residents/swap-beds` | Atomically swap allocations for two residents. |
| `POST /residents/{{residentId}}/move-out` | Process move-out and release the bed. |

**Create resident**

```json
{
  "propertyId": "{{propertyId}}",
  "roomId": "{{roomId}}",
  "bedId": "{{bedId}}",
  "firstName": "Ravi",
  "lastName": "Kumar",
  "email": "ravi@example.com",
  "mobile": "9876543210",
  "profession": "WORKING_PROFESSIONAL",
  "monthlyRent": 800000,
  "securityDeposit": 1600000,
  "joiningDate": "2026-10-01"
}
```

Required fields are `propertyId`, `firstName`, `mobile`, `monthlyRent`, and `joiningDate`. `roomId` and `bedId` are optional. Money is in paise. Profession values: `STUDENT`, `WORKING_PROFESSIONAL`, `SELF_EMPLOYED`, `OTHER`. Resident statuses: `PENDING_MOVE_IN`, `ACTIVE`, `NOTICE_PERIOD`, `MOVED_OUT`, `ARCHIVED`.

**Reallocate resident**

```json
{
  "roomId": "{{roomId}}",
  "bedId": "{{bedId}}",
  "newRentAmount": 850000,
  "reason": "room_change"
}
```

**Swap beds**

```json
{
  "residentOneId": "{{residentId}}",
  "residentTwoId": "REPLACE_WITH_SECOND_RESIDENT_UUID",
  "reason": "bed_swap"
}
```

**Move out**

```json
{
  "moveOutDate": "2026-10-27",
  "notes": "Lease ended"
}
```

### Billing

All billing endpoints require **B + Org**.

| Method and path | Description |
|---|---|
| `POST /billing/generate-monthly-dues` | Generate monthly rent dues; safe to rerun for the same billing period. |
| `POST /billing/charges` | Create an ad-hoc resident charge. |
| `GET /billing/records` | List billing records. Query: `propertyId`, `residentId`, `type`, `status`, `month`, `year`, `page`, `limit`. |
| `GET /billing/records/{{billingRecordId}}` | Get a billing record. |
| `POST /billing/records/{{billingRecordId}}/cancel` | Cancel an unpaid billing record. |

**Generate monthly dues**

```json
{
  "propertyId": "{{propertyId}}",
  "billingMonth": 10,
  "billingYear": 2026
}
```

`propertyId` is optional; omit it to process the active organization's eligible residents.

**Create charge**

```json
{
  "residentId": "{{residentId}}",
  "type": "ELECTRICITY",
  "amount": 25000,
  "dueDate": "2026-11-05",
  "description": "October electricity charge",
  "periodStart": "2026-10-01",
  "periodEnd": "2026-10-31"
}
```

Billing types: `RENT`, `SECURITY_DEPOSIT`, `ELECTRICITY`, `WATER`, `MAINTENANCE`, `LATE_FEE`, `OTHER`. Billing statuses: `ISSUED`, `DUE`, `PARTIALLY_PAID`, `PAID`, `OVERDUE`, `CANCELLED`, `WAIVED`.

**Cancel billing record**

```json
{
  "reason": "Created in error"
}
```

### Payments

All payment endpoints require **B + Org**.

| Method and path | Description |
|---|---|
| `POST /payments/record` | Record an offline/manual payment. |
| `POST /payments/razorpay/order` | Create a server-side Razorpay order. |
| `POST /payments/razorpay/verify` | Verify Razorpay signature and confirm a payment. |
| `GET /payments` | List payments. Query: `residentId`, `propertyId`, `status`, `mode`, `page`, `limit`. |
| `GET /payments/{{paymentId}}/receipt` | Retrieve receipt data for a payment. |

**Record offline payment**

```json
{
  "residentId": "{{residentId}}",
  "billingRecordId": "{{billingRecordId}}",
  "amount": 800000,
  "mode": "UPI",
  "collectionDate": "2026-10-27",
  "reference": "UPI-TEST-001",
  "notes": "October rent"
}
```

`billingRecordId`, `collectionDate`, `reference`, `notes`, `proofUrl`, and `idempotencyKey` are optional. Payment modes: `CASH`, `UPI`, `BANK_TRANSFER`, `CHEQUE`, `RAZORPAY`, `OTHER`.

**Create Razorpay order**

```json
{
  "residentId": "{{residentId}}",
  "billingRecordId": "{{billingRecordId}}",
  "amount": 800000
}
```

**Verify Razorpay payment**

```json
{
  "paymentId": "{{paymentId}}",
  "razorpayOrderId": "order_from_razorpay",
  "razorpayPaymentId": "payment_from_razorpay",
  "razorpaySignature": "signature_from_razorpay"
}
```

Use actual values returned by the Razorpay sandbox checkout. Payment statuses include `PENDING`, `CONFIRMED`, `FAILED`, `REFUNDED`, and `DISPUTED`.

### Expenses

All expense endpoints require **B + Org**.

| Method and path | Description |
|---|---|
| `POST /expenses` | Record an operational expense. |
| `GET /expenses` | List expenses. Query: `propertyId`, `categoryId`, `paymentMode`, `startDate`, `endDate`, `page`, `limit`. |
| `GET /expenses/summary` | Summarize expenses by category/property. Optional query: `propertyId`, `startDate`, `endDate`. |
| `GET /expenses/categories` | List active expense categories. |
| `POST /expenses/categories` | Create a custom category. |
| `GET /expenses/{{expenseId}}` | Get one expense. |
| `PATCH /expenses/{{expenseId}}` | Update supplied expense fields. |
| `DELETE /expenses/{{expenseId}}` | Delete an expense. |

**Create expense**

```json
{
  "propertyId": "{{propertyId}}",
  "categoryId": "REPLACE_WITH_CATEGORY_UUID",
  "amount": 45000,
  "expenseDate": "2026-10-27",
  "paymentMode": "CASH",
  "paidBy": "Asha",
  "paidTo": "Local supplier",
  "description": "Cleaning supplies",
  "notes": "Test expense"
}
```

`propertyId`, `categoryId`, `amount`, `paymentMode`, and `description` are required. The organization is created with default system categories; fetch their IDs using `GET /expenses/categories`.

**Create custom category**

```json
{
  "name": "Internet"
}
```

### Complaints and maintenance

All complaint endpoints require **B + Org**.

| Method and path | Description |
|---|---|
| `POST /complaints` | Create a maintenance complaint. |
| `GET /complaints` | List complaints. Query: `propertyId`, `categoryId`, `status`, `urgency`, `assignedTo`, `search`, `page`, `limit`. |
| `GET /complaints/categories` | List active complaint categories. |
| `POST /complaints/categories` | Add a custom category. |
| `GET /complaints/{{complaintId}}` | Get complaint, comments, and status history. |
| `PATCH /complaints/{{complaintId}}/status` | Change complaint status. |
| `POST /complaints/{{complaintId}}/assign` | Assign a staff member. |
| `POST /complaints/{{complaintId}}/comments` | Add a comment. |

**Create complaint**

```json
{
  "propertyId": "{{propertyId}}",
  "categoryId": "REPLACE_WITH_CATEGORY_UUID",
  "roomId": "{{roomId}}",
  "location": "Room 101",
  "description": "Bathroom tap is leaking and needs repair.",
  "urgency": "MEDIUM"
}
```

Required fields: `propertyId`, `categoryId`, `description` (at least five characters). The organization is created with default complaint categories; fetch their IDs using `GET /complaints/categories`. Urgency: `LOW`, `MEDIUM`, `HIGH`, `CRITICAL`. Status: `RECEIVED`, `VERIFIED`, `NEED_MORE_TIME`, `TEAM_WORKING`, `PENDING`, `RESOLVED`.

**Update status**

```json
{
  "status": "TEAM_WORKING",
  "notes": "Technician assigned",
  "resolution": "REPLACE_WITH_RESOLUTION_IF_RESOLVED"
}
```

**Assign staff**

```json
{
  "assignedTo": "{{staffId}}",
  "notes": "Please inspect today"
}
```

**Add comment / create category**

```json
{
  "content": "The technician will visit this afternoon."
}
```

For a category, use `{"name":"Electrical"}` instead of `content`.

### Staff

All staff endpoints require **B + Org**.

| Method and path | Description |
|---|---|
| `POST /staff` | Add a staff member. |
| `GET /staff` | List staff. Query: `propertyId`, `designationId`, `status`, `search`, `page`, `limit`. |
| `GET /staff/designations` | List active designations. |
| `POST /staff/designations` | Create a custom designation. |
| `GET /staff/{{staffId}}` | Get a staff profile. |
| `PATCH /staff/{{staffId}}` | Update staff details/status. |
| `DELETE /staff/{{staffId}}` | Deactivate a staff member. |

**Create staff**

```json
{
  "propertyId": "{{propertyId}}",
  "designationId": "REPLACE_WITH_DESIGNATION_UUID",
  "firstName": "Mina",
  "lastName": "Patel",
  "mobile": "9876543210",
  "email": "mina@example.com",
  "salary": 2500000,
  "joiningDate": "2026-10-01"
}
```

Required fields: `propertyId`, `designationId`, `firstName`, `mobile`. Fetch default designation IDs using `GET /staff/designations`. Salary is in paise. Staff statuses: `ACTIVE`, `INACTIVE`, `TERMINATED`.

**Create designation**

```json
{
  "name": "Electrician"
}
```

### Announcements and reminders

All announcement endpoints require **B + Org**.

| Method and path | Description |
|---|---|
| `POST /announcements` | Create an announcement draft or scheduled notice. |
| `GET /announcements` | List announcements. Query: `propertyId`, `status`, `page`, `limit`. |
| `GET /announcements/{{announcementId}}` | Get announcement details. |
| `POST /announcements/{{announcementId}}/send` | Dispatch an announcement to in-scope residents. |
| `POST /announcements/reminders/rent` | Send rent reminders to residents with pending balances. |

**Create announcement**

```json
{
  "propertyId": "{{propertyId}}",
  "scope": "PROPERTY",
  "title": "Water maintenance",
  "body": "Water service will be unavailable from 10 AM to noon.",
  "scheduledAt": "2026-10-28T04:30:00.000Z"
}
```

`propertyId` and `scheduledAt` are optional. Scope: `ORGANIZATION`, `PROPERTY`. Announcement statuses: `DRAFT`, `SCHEDULED`, `SENDING`, `SENT`, `FAILED`.

**Send rent reminders**

```json
{
  "propertyId": "{{propertyId}}",
  "channel": "BOTH"
}
```

Both `residentId` and `propertyId` are optional filters. Channel: `WHATSAPP`, `EMAIL`, `BOTH`.

### Dashboard and reports

All dashboard/report endpoints require **B + Org**. Export endpoints are limited to `OWNER`, `ADMIN`, and `MANAGER`.

| Method and path | Description |
|---|---|
| `GET /dashboard/metrics` | Retrieve operational and financial metrics. Optional query: `propertyId`. |
| `GET /reports/collections/csv` | Download collection/payment data as CSV. Optional query: `propertyId`. |
| `GET /reports/residents/csv` | Download the resident registry as CSV. Optional query: `propertyId`. |
| `GET /reports/expenses/csv` | Download expense data as CSV. Optional query: `propertyId`. |

CSV routes return `text/csv`, not JSON. Use **Send and Download** in Postman to save the response as a file.

### Payment webhook

| Method and path | Access | Description |
|---|---|---|
| `POST /webhooks/razorpay` | Public route with signature verification | Receive and verify a Razorpay webhook. Requires a valid `x-razorpay-signature` header and a payload signed with the configured webhook secret. |

This route is intended to be called by Razorpay. Prefer testing it with Razorpay's sandbox webhook tooling rather than manually inventing signatures.

## 7. Authorization and role reminders

Organization access uses the active organization claim in the JWT. A member must be switched into the organization to get a scoped access token. Several write operations also require a specific role:

- **OWNER / ADMIN:** organization member management, custom expense/complaint categories, custom staff designations, cancel billing records, delete expenses, archive properties.
- **OWNER / ADMIN / MANAGER:** create/update properties, rooms, residents, billing, expenses, staff, and announcements; assign complaints; dispatch announcements and reminders; export reports.
- **OWNER / ADMIN / MANAGER / STAFF:** record manual payments and update complaint status.
- Read endpoints generally require only a valid organization-scoped bearer token.

If Postman returns `401`, check the access token and expiry. If it returns `403`, check that the token has the correct active organization and role. Refresh tokens via `/auth/refresh`; after switching organizations, use the newly returned access token.
