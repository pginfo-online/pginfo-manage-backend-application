import { randomBytes, randomUUID } from 'node:crypto';
import { readdir, readFile, writeFile } from 'node:fs/promises';
import { join, resolve } from 'node:path';
import { fileURLToPath } from 'node:url';
import { parseArgs } from 'node:util';
import {
  Prisma,
  PrismaClient,
  SharingType,
  type Profession,
} from '@prisma/client';
import { loginSchema } from '../src/modules/identity/api/dto/auth.dto.js';
import { PasswordHasher } from '../src/modules/identity/domain/password-hasher.js';
import {
  createOrganizationWithOwner,
  generateOrganizationSlug,
} from '../src/modules/organizations/application/organization-bootstrap.js';

type Contacts = {
  address: string;
  fullAddress?: string;
  city: string;
  state?: string;
  postalCode?: string;
  country: string;
  contactPhone: string;
  contactWhatsapp?: string;
  contactEmail?: string;
  description?: string;
};
type Listing = Contacts & {
  title: string;
  category: string;
  amenities: string[];
  pgDetails: { gender: string };
};
type Floor = { building: string; floorNumber: number; name: string };
type Room = { building: string; floorNumber: number; roomNumber: string };
type Bed = Room & { bedLabel: string };
type SourceProperty = {
  property: string;
  pgDetails: (Contacts & { facilities: string[]; gender: string }) | null;
  buildings: { name: string }[];
  floors: Floor[];
  rooms: (Room & {
    amenities: string[];
    rentPerBed: number;
    totalBeds: number;
  })[];
  beds: (Bed & {
    status: string;
    currentTenantName: string | null;
    rentOverride: number | null;
  })[];
  tenants: {
    building: string | null;
    floorNumber: number | null;
    roomNumber: string | null;
    bedLabel: string | null;
    name: string;
    phone: string;
    email: string | null;
    profession: string | null;
    status: string;
    joinDate: string;
    actualLeaveDate: string | null;
    expectedLeaveDate: string | null;
    billingDate: number;
    monthlyRent: number;
    securityDeposit: number;
    noticePeriodDays: number;
    lockInPeriodMonths: number;
    lockInEndDate: string | null;
    rentCycle: string;
  }[];
};
type SourceExport = {
  exportMetadata: {
    sourceDatabase: string;
    ownerNameFromRequest: string;
    matchedPhoneLastFour: string[];
  };
  matchedAccounts: { name: string }[];
  properties: Listing[];
  pgManagement: SourceProperty[];
};
type ExportPlan = Awaited<ReturnType<typeof planExport>>;
const importAction = 'organization.import_pg_online';
const root = fileURLToPath(new URL('..', import.meta.url));

function requireData(condition: unknown, message: string): asserts condition {
  if (!condition) throw new Error(message);
}

function splitName(name: string) {
  const [firstName, ...lastName] = name.trim().split(/\s+/);
  requireData(firstName, 'Missing name');
  return { firstName, lastName: lastName.join(' ') || undefined };
}

function mobileNumber(raw: string) {
  const result = loginSchema.safeParse({ mobile: raw, password: 'unused' });
  return result.success && 'mobile' in result.data
    ? result.data.mobile
    : undefined;
}

function paise(rupees: number) {
  const amount = Math.round(rupees * 100);
  requireData(
    Number.isFinite(rupees) && amount >= 0 && amount <= 2_147_483_647,
    'Invalid source rupee amount',
  );
  return amount;
}

function dateOnly(raw: string) {
  const date = new Date(raw);
  requireData(Number.isFinite(date.valueOf()), 'Invalid source date');
  return new Date(date.toISOString().slice(0, 10));
}

function floorKey(row: {
  building: string | null;
  floorNumber: number | null;
}) {
  return JSON.stringify([row.building, row.floorNumber]);
}

function roomKey(row: {
  building: string | null;
  floorNumber: number | null;
  roomNumber: string | null;
}) {
  return JSON.stringify([floorKey(row), row.roomNumber]);
}

function bedKey(row: {
  building: string | null;
  floorNumber: number | null;
  roomNumber: string | null;
  bedLabel: string | null;
}) {
  return JSON.stringify([roomKey(row), row.bedLabel]);
}

function uniqueMap<T>(rows: T[], key: (row: T) => string, label: string) {
  const result = new Map(rows.map((row) => [key(row), row]));
  requireData(result.size === rows.length, `Duplicate ${label}`);
  return result;
}

function planProperty(
  listing: Listing,
  source: SourceProperty | undefined,
  ownerName: string,
) {
  const id = randomUUID();
  const detail = source?.pgDetails;
  const name = listing.title.trim();
  const buildings = uniqueMap(
    source?.buildings ?? [],
    (row) => row.name,
    `building in ${name}`,
  );
  const floors = uniqueMap(source?.floors ?? [], floorKey, `floor in ${name}`);
  for (const floor of floors.values()) {
    requireData(buildings.has(floor.building), `Unmatched building in ${name}`);
  }
  const pincode =
    [listing.postalCode, detail?.postalCode]
      .find((pin) => pin && /^[1-9]\d{5}$/.test(pin.trim()))
      ?.trim() ??
    [listing.fullAddress, listing.address, detail?.fullAddress, detail?.address]
      .find((address) => address?.match(/\b[1-9]\d{5}\b/))
      ?.match(/\b[1-9]\d{5}\b/)?.[0] ??
    '';
  const fullAddress =
    listing.fullAddress?.trim() || detail?.fullAddress?.trim();
  const address = listing.address.trim();
  requireData(
    listing.category === 'pg' &&
      listing.country === 'India' &&
      name &&
      address &&
      listing.city,
    `Invalid listing for ${name}`,
  );
  const property = {
    id,
    name,
    type: 'PG',
    status: /^(demo\b|demo\d|test$)/i.test(name) ? 'INACTIVE' : 'ACTIVE',
    addressLine1: address,
    addressLine2:
      fullAddress && fullAddress !== address ? fullAddress : undefined,
    city: listing.city.trim(),
    state: listing.state?.trim() || detail?.state?.trim() || 'Maharashtra',
    pincode,
    contactPhone: mobileNumber(listing.contactPhone),
    contactEmail: listing.contactEmail?.trim() || undefined,
    ownerName,
    description:
      listing.description?.trim() || detail?.description?.trim() || undefined,
    amenities: [
      ...new Set([...listing.amenities, ...(detail?.facilities ?? [])]),
    ],
    totalFloors: floors.size || undefined,
  } satisfies Omit<Prisma.PropertyCreateManyInput, 'organizationId'>;

  const bedsByRoom = new Map<string, NonNullable<SourceProperty['beds']>>();
  for (const bed of source?.beds ?? []) {
    const key = roomKey(bed);
    const beds = bedsByRoom.get(key) ?? [];
    beds.push(bed);
    bedsByRoom.set(key, beds);
  }
  const rooms = uniqueMap(source?.rooms ?? [], roomKey, `room in ${name}`);
  requireData(
    new Set([...rooms.values()].map((room) => room.roomNumber)).size ===
      rooms.size,
    `Repeated room number across floors in ${name}`,
  );
  const roomIds = new Map<string, string>();
  const bedIds = new Map<string, { id: string; occupant: string | null }>();
  const roomRows: Omit<Prisma.RoomCreateManyInput, 'organizationId'>[] = [];
  const bedRows: Omit<Prisma.BedCreateManyInput, 'organizationId'>[] = [];
  const gender = detail?.gender ?? listing.pgDetails.gender;
  for (const [key, room] of rooms) {
    const floor = floors.get(floorKey(room));
    requireData(floor, `Unmatched floor in ${name}`);
    const sourceBeds = bedsByRoom.get(key) ?? [];
    const sharingType = Object.values(SharingType)[sourceBeds.length - 1];
    requireData(
      sharingType && sourceBeds.length === room.totalBeds,
      `Invalid bed count in ${name}`,
    );
    const roomId = randomUUID();
    roomIds.set(key, roomId);
    const occupied = sourceBeds.filter(
      (bed) => bed.status === 'occupied',
    ).length;
    roomRows.push({
      id: roomId,
      propertyId: id,
      roomNumber: room.roomNumber,
      floor: floor.name,
      sharingType,
      rentAmount: paise(room.rentPerBed),
      amenities: room.amenities,
      status:
        occupied === sourceBeds.length
          ? 'OCCUPIED'
          : occupied
            ? 'PARTIALLY_OCCUPIED'
            : 'AVAILABLE',
      gender:
        gender === 'male' ? 'MALE' : gender === 'female' ? 'FEMALE' : 'UNISEX',
      isPublished: false,
      isVerified: false,
    });
    for (const bed of sourceBeds) {
      const key = bedKey(bed);
      requireData(
        !bedIds.has(key) && ['vacant', 'occupied'].includes(bed.status),
        `Invalid bed in ${name}`,
      );
      const bedId = randomUUID();
      requireData(
        bed.status === 'occupied'
          ? bed.currentTenantName
          : !bed.currentTenantName,
        `Invalid bed occupancy in ${name}`,
      );
      bedIds.set(key, { id: bedId, occupant: bed.currentTenantName });
      bedRows.push({
        id: bedId,
        roomId,
        bedNumber: bed.bedLabel,
        status: bed.status === 'occupied' ? 'OCCUPIED' : 'AVAILABLE',
        rentAmount:
          bed.rentOverride === null ? undefined : paise(bed.rentOverride),
      });
    }
  }
  requireData(
    bedRows.length === (source?.beds.length ?? 0),
    `Unmatched beds in ${name}`,
  );

  const residents: Omit<Prisma.ResidentCreateManyInput, 'organizationId'>[] =
    [];
  const occupancy: Omit<
    Prisma.OccupancyRecordCreateManyInput,
    'organizationId'
  >[] = [];
  const claimedBeds = new Set<string>();
  const flags = {
    missingPin: !pincode,
    activeWithLeaveDate: 0,
    unusualJoinDate: 0,
    customRentCycles: 0,
  };
  for (const tenant of source?.tenants ?? []) {
    const active = tenant.status === 'active';
    requireData(
      active || tenant.status === 'vacated',
      `Unknown resident status in ${name}`,
    );
    const roomId = roomIds.get(roomKey(tenant));
    requireData(
      !tenant.roomNumber || roomId,
      `Unmatched resident room in ${name}`,
    );
    const bed = tenant.bedLabel ? bedIds.get(bedKey(tenant)) : undefined;
    if (active) {
      requireData(
        bed && bed.occupant === tenant.name && !claimedBeds.has(bed.id),
        `Inconsistent resident assignment in ${name}`,
      );
      claimedBeds.add(bed.id);
      if (tenant.actualLeaveDate) flags.activeWithLeaveDate++;
    } else {
      requireData(
        !tenant.bedLabel && tenant.actualLeaveDate,
        `Inconsistent move-out in ${name}`,
      );
    }
    const joiningDate = dateOnly(tenant.joinDate);
    if (joiningDate.getUTCFullYear() < 2000) flags.unusualJoinDate++;
    if (tenant.rentCycle !== 'standard') flags.customRentCycles++;
    const moveOutDate =
      !active && tenant.actualLeaveDate
        ? dateOnly(tenant.actualLeaveDate)
        : undefined;
    requireData(
      !moveOutDate || moveOutDate >= joiningDate,
      `Move-out predates move-in in ${name}`,
    );
    const mobile = mobileNumber(tenant.phone);
    requireData(
      mobile && tenant.billingDate >= 1 && tenant.billingDate <= 28,
      `Invalid resident mobile or due day in ${name}`,
    );
    const profession = tenant.profession?.toUpperCase() ?? 'OTHER';
    requireData(
      ['STUDENT', 'WORKING_PROFESSIONAL', 'SELF_EMPLOYED', 'OTHER'].includes(
        profession,
      ),
      `Invalid profession in ${name}`,
    );
    let lockInEndDate = tenant.lockInEndDate
      ? dateOnly(tenant.lockInEndDate)
      : undefined;
    if (
      !lockInEndDate &&
      tenant.lockInPeriodMonths &&
      joiningDate.getUTCFullYear() >= 2000
    ) {
      const lockIn = new Date(joiningDate);
      lockIn.setUTCDate(1);
      lockIn.setUTCMonth(
        lockIn.getUTCMonth() + tenant.lockInPeriodMonths + 1,
        0,
      );
      lockIn.setUTCDate(
        Math.min(joiningDate.getUTCDate(), lockIn.getUTCDate()),
      );
      lockInEndDate = lockIn;
    }
    const resident = {
      ...splitName(tenant.name),
      id: randomUUID(),
      propertyId: id,
      roomId: active ? roomId : undefined,
      bedId: bed?.id,
      email: tenant.email?.trim().toLowerCase() || undefined,
      mobile,
      profession: profession as Profession,
      status: active ? 'ACTIVE' : 'MOVED_OUT',
      monthlyRent: paise(tenant.monthlyRent),
      securityDeposit: paise(tenant.securityDeposit),
      joiningDate,
      moveInDate: joiningDate,
      moveOutDate,
      rentDueDay: tenant.billingDate,
      expectedVacatingDate: tenant.expectedLeaveDate
        ? dateOnly(tenant.expectedLeaveDate)
        : undefined,
      lockInEndDate,
      noticePeriodDays: tenant.noticePeriodDays,
      sendWhatsappReminder: false,
    } satisfies Omit<Prisma.ResidentCreateManyInput, 'organizationId'>;
    residents.push(resident);
    if (roomId)
      occupancy.push({
        residentId: resident.id,
        propertyId: id,
        roomId,
        bedId: bed?.id,
        monthlyRent: resident.monthlyRent,
        startDate: joiningDate,
        endDate: moveOutDate,
        reason: 'legacy_import',
      });
  }
  requireData(
    claimedBeds.size ===
      bedRows.filter((bed) => bed.status === 'OCCUPIED').length,
    `Unmatched occupied bed in ${name}`,
  );
  return {
    property,
    rooms: roomRows,
    beds: bedRows,
    residents,
    occupancy,
    flags,
  };
}

async function planExport(directory: string, folder: string) {
  const source = JSON.parse(
    await readFile(
      join(directory, folder, 'pg_management_export.json'),
      'utf8',
    ),
  ) as SourceExport;
  const { exportMetadata } = source;
  requireData(
    exportMetadata.sourceDatabase === 'pgOnline' &&
      source.matchedAccounts.length <= 1,
    `Unexpected export for ${folder}`,
  );
  const matchedName = source.matchedAccounts[0]?.name.trim();
  const requestedName = exportMetadata.ownerNameFromRequest.trim();
  const name =
    matchedName && !/^User\d+$/i.test(matchedName)
      ? matchedName
      : requestedName === 'Not Provided'
        ? folder
        : requestedName;
  const matchedPhones = new Set<string>();
  for (const contacts of [
    ...source.properties,
    ...source.pgManagement.flatMap((entry) =>
      entry.pgDetails ? [entry.pgDetails] : [],
    ),
  ]) {
    for (const raw of [contacts.contactPhone, contacts.contactWhatsapp]) {
      const mobile = raw && mobileNumber(raw);
      if (
        mobile &&
        exportMetadata.matchedPhoneLastFour.some((ending) =>
          mobile.endsWith(ending),
        )
      )
        matchedPhones.add(mobile);
    }
  }
  requireData(
    matchedPhones.size === 1,
    `Missing or ambiguous owner phone in ${folder}`,
  );
  const [mobile] = [...matchedPhones] as [string];
  const listings = uniqueMap(
    source.properties,
    (listing) => listing.title.trim(),
    `listing in ${folder}`,
  );
  const management = uniqueMap(
    source.pgManagement,
    (pg) => pg.property.trim(),
    `management property in ${folder}`,
  );
  for (const title of management.keys())
    requireData(
      listings.has(title),
      `Unmatched management property in ${folder}`,
    );
  const properties = [...listings].map(([title, listing]) =>
    planProperty(listing, management.get(title), name),
  );
  return {
    name,
    mobile,
    properties,
    ...splitName(name),
    email: `${generateOrganizationSlug(name).replaceAll('-', '.')}@pginfo.invalid`,
    slug: `pg-online-${generateOrganizationSlug(folder)}`,
  };
}

async function checkAccounts(
  db: Prisma.TransactionClient,
  plans: ExportPlan[],
) {
  const users = await db.user.findMany({
    select: { email: true, mobile: true },
  });
  const orgs = await db.organization.findMany({
    where: { slug: { in: plans.map(({ slug }) => slug) } },
    include: {
      members: true,
      auditLogs: { where: { action: importAction }, take: 1 },
    },
  });
  return plans.filter((plan) => {
    const owners = users.filter(
      (user) =>
        user.email?.toLowerCase() === plan.email ||
        (user.mobile && mobileNumber(user.mobile) === plan.mobile),
    );
    const org = orgs.find((entry) => entry.slug === plan.slug);
    if (!org) {
      requireData(
        owners.length === 0,
        `Existing login matches ${plan.name}. Import stopped without changing existing accounts.`,
      );
      return true;
    }
    const owner = org.auditLogs[0]?.userId;
    requireData(
      owner &&
        org.members.some(
          (member) => member.userId === owner && member.role === 'OWNER',
        ),
      `Existing organization conflicts with ${plan.name}`,
    );
    return false;
  });
}

async function main() {
  const { values } = parseArgs({
    options: {
      data: { type: 'string', default: join(root, 'data') },
      'check-db': { type: 'boolean' },
      apply: { type: 'boolean' },
      'credentials-file': { type: 'string' },
    },
  });
  const directory = resolve(values.data);
  const folders = (await readdir(directory, { withFileTypes: true })).filter(
    (entry) => entry.isDirectory(),
  );
  const plans = await Promise.all(
    folders.map((folder) => planExport(directory, folder.name)),
  );
  requireData(plans.length > 0, 'No owner exports found');
  for (const key of ['slug', 'email', 'mobile'] as const)
    uniqueMap(plans, (plan) => plan[key], `owner ${key}`);
  console.table(
    plans.map((plan) => ({
      owner: plan.name,
      properties: plan.properties.length,
      inactive: plan.properties.filter(
        (entry) => entry.property.status === 'INACTIVE',
      ).length,
      rooms: plan.properties.reduce(
        (count, entry) => count + entry.rooms.length,
        0,
      ),
      beds: plan.properties.reduce(
        (count, entry) => count + entry.beds.length,
        0,
      ),
      residents: plan.properties.reduce(
        (count, entry) => count + entry.residents.length,
        0,
      ),
      occupancy: plan.properties.reduce(
        (count, entry) => count + entry.occupancy.length,
        0,
      ),
      missingPins: plan.properties.filter((entry) => entry.flags.missingPin)
        .length,
      conflictingLeaveDates: plan.properties.reduce(
        (count, entry) => count + entry.flags.activeWithLeaveDate,
        0,
      ),
      unusualJoinDates: plan.properties.reduce(
        (count, entry) => count + entry.flags.unusualJoinDate,
        0,
      ),
      customRentCycles: plan.properties.reduce(
        (count, entry) => count + entry.flags.customRentCycles,
        0,
      ),
    })),
  );
  if (!values.apply && !values['check-db']) return;
  requireData(
    process.env.DATABASE_URL,
    'Explicitly supply DATABASE_URL to check or apply the import',
  );
  const url = new URL(process.env.DATABASE_URL);
  url.searchParams.set('connection_limit', '1');
  const db = new PrismaClient({ datasourceUrl: url.toString() });
  try {
    const pending = await checkAccounts(db, plans);
    console.log(
      `${pending.length} new owner accounts, ${plans.length - pending.length} already imported`,
    );
    if (!values.apply || !pending.length) return;
    const path = values['credentials-file'];
    requireData(
      path && !resolve(path).startsWith(`${resolve(root, '..')}/`),
      'Supply --credentials-file pointing outside the workspace',
    );
    const credentials = pending.map(({ name, firstName, email, mobile }) => ({
      name,
      email,
      mobile,
      password: `${firstName}@1${randomBytes(16).toString('base64url')}`,
    }));
    const hashes = new Map<string, string>();
    for (const credential of credentials) {
      hashes.set(
        credential.email,
        await PasswordHasher.hash(credential.password),
      );
    }
    // Preserve the credentials even if the connection fails after COMMIT.
    await writeFile(path, `${JSON.stringify(credentials, null, 2)}\n`, {
      mode: 0o600,
      flag: 'wx',
    });
    await db.$transaction(
      async (tx) => {
        const [lock] = await tx.$queryRaw<
          { locked: boolean }[]
        >`SELECT pg_try_advisory_xact_lock(35178202420) AS locked`;
        requireData(lock?.locked, 'The legacy import is already running');
        const ready = await checkAccounts(tx, plans);
        requireData(
          ready.length === pending.length,
          'Accounts changed between preflight and apply',
        );
        for (const plan of ready) {
          const passwordHash = hashes.get(plan.email);
          requireData(passwordHash, 'Missing prepared owner credentials');
          const user = await tx.user.create({
            data: {
              email: plan.email,
              mobile: plan.mobile,
              firstName: plan.firstName,
              lastName: plan.lastName,
              passwordHash,
            },
          });
          const { id: organizationId } = await createOrganizationWithOwner(tx, {
            userId: user.id,
            name: `${plan.name} Properties`,
            slug: plan.slug,
          });
          await tx.property.createMany({
            data: plan.properties.map(({ property }) => ({
              ...property,
              organizationId,
            })),
          });
          await tx.room.createMany({
            data: plan.properties.flatMap(({ rooms }) =>
              rooms.map((room) => ({ ...room, organizationId })),
            ),
          });
          await tx.bed.createMany({
            data: plan.properties.flatMap(({ beds }) =>
              beds.map((bed) => ({ ...bed, organizationId })),
            ),
          });
          await tx.resident.createMany({
            data: plan.properties.flatMap(({ residents }) =>
              residents.map((resident) => ({ ...resident, organizationId })),
            ),
          });
          await tx.occupancyRecord.createMany({
            data: plan.properties.flatMap(({ occupancy }) =>
              occupancy.map((record) => ({ ...record, organizationId })),
            ),
          });
          await tx.auditLog.create({
            data: {
              organizationId,
              userId: user.id,
              action: importAction,
              entityType: 'Organization',
              entityId: organizationId,
            },
          });
        }
      },
      { timeout: 60_000 },
    );
    console.log(
      `Committed ${pending.length} owner organizations. Credentials file: ${resolve(path)}`,
    );
  } finally {
    await db.$disconnect();
  }
}

main().catch((error: unknown) => {
  // Prisma errors can contain input values. Report their codes without dumping arguments.
  console.error(
    error instanceof Prisma.PrismaClientKnownRequestError
      ? `Database error ${error.code}`
      : error instanceof Prisma.PrismaClientInitializationError
        ? `Database connection failed (${error.errorCode ?? 'unknown'})`
        : error instanceof Prisma.PrismaClientValidationError ||
            error instanceof Prisma.PrismaClientUnknownRequestError ||
            error instanceof Prisma.PrismaClientRustPanicError
          ? `Database error (${error.name})`
          : error instanceof Error
            ? error.message
            : 'Legacy import failed',
  );
  process.exitCode = 1;
});
