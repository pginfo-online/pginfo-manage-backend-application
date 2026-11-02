import pkg from '@prisma/client';
const {
  PrismaClient,
  OrgRole,
  PropertyType,
  PropertyStatus,
  SharingType,
  RoomStatus,
  BedStatus,
  ResidentStatus,
  BillingType,
  BillingStatus,
  PaymentMode,
  PaymentStatus,
  ComplaintUrgency,
  ComplaintStatus,
  StaffStatus,
} = pkg;

const prisma = new PrismaClient();

async function main() {
  console.log('🚀 Seeding full real PG data matching UI references...');

  // 1. Find or verify owner user
  let user = await prisma.user.findUnique({
    where: { email: 'owner@example.com' },
  });

  if (!user) {
    console.error('Owner user not found!');
    return;
  }

  // 2. Ensure organization exists
  let org = await prisma.organization.findFirst({
    where: { members: { some: { userId: user.id } } },
  });

  if (!org) {
    org = await prisma.organization.create({
      data: {
        name: 'RentOk Living',
        slug: 'rentok-living',
        members: {
          create: {
            userId: user.id,
            role: OrgRole.OWNER,
          },
        },
      },
    });
  }

  const orgId = org.id;
  console.log(`Using organization: ${org.name} (${orgId})`);

  // Ensure default categories exist for this org
  const expenseCats = ['Groceries', 'Salaries', 'Electrical Services', 'Plumbing', 'Cleaning Supplies', 'Internet & WiFi', 'Electricity Bill', 'Repairs & Maintenance'];
  for (const name of expenseCats) {
    await prisma.expenseCategory.upsert({
      where: { organizationId_name: { organizationId: orgId, name } },
      update: {},
      create: { organizationId: orgId, name, isSystem: true },
    });
  }

  const complaintCats = ['Agreements', 'Amenities', 'Electrical Appliances', 'Food', 'Housekeeping', 'Plumbing', 'Internet & WiFi', 'Other'];
  for (const name of complaintCats) {
    await prisma.complaintCategory.upsert({
      where: { organizationId_name: { organizationId: orgId, name } },
      update: {},
      create: { organizationId: orgId, name, isSystem: true },
    });
  }

  const staffDesigs = ['Cook', 'Cleaner', 'Plumber', 'Guard', 'Manager', 'Electrician', 'Warden'];
  for (const name of staffDesigs) {
    await prisma.staffDesignation.upsert({
      where: { organizationId_name: { organizationId: orgId, name } },
      update: {},
      create: { organizationId: orgId, name, isSystem: true },
    });
  }

  // 3. Create or update Property 1: Vanalilka
  let prop1 = await prisma.property.findFirst({
    where: { organizationId: orgId, name: 'Vanalilka' },
  });

  if (!prop1) {
    prop1 = await prisma.property.create({
      data: {
        organizationId: orgId,
        name: 'Vanalilka',
        type: PropertyType.PG,
        status: PropertyStatus.ACTIVE,
        addressLine1: 'Vanalika Apartments, Pirangut',
        city: 'Pune',
        state: 'Maharashtra',
        pincode: '412115',
        country: 'IN',
        rentDueDay: 1,
        amenities: ['WiFi', 'Laundry', 'Power Backup', 'CCTV', 'Attached Bathroom'],
        totalFloors: 3,
      },
    });
  }

  // Property 2: tst2
  let prop2 = await prisma.property.findFirst({
    where: { organizationId: orgId, name: 'tst2' },
  });

  if (!prop2) {
    prop2 = await prisma.property.create({
      data: {
        organizationId: orgId,
        name: 'tst2',
        type: PropertyType.FLAT,
        status: PropertyStatus.ACTIVE,
        addressLine1: 'Latur Awalkonda Banshelki Road',
        city: 'Latur',
        state: 'Maharashtra',
        pincode: '413512',
        country: 'IN',
        rentDueDay: 1,
        amenities: ['Water 24/7', 'Parking'],
        totalFloors: 1,
      },
    });
  }

  console.log(`Properties initialized: ${prop1.name} (${prop1.id}), ${prop2.name} (${prop2.id})`);

  // 4. Setup Rooms and Beds in Vanalilka
  // Room 101: Ground Floor, 4 Sharing, 4 Beds (A, B, C, D)
  let room101 = await prisma.room.findFirst({
    where: { propertyId: prop1.id, roomNumber: '101' },
  });

  if (!room101) {
    room101 = await prisma.room.create({
      data: {
        organizationId: orgId,
        propertyId: prop1.id,
        roomNumber: '101',
        floor: 'Ground Floor',
        sharingType: SharingType.FOUR_SHARING,
        rentAmount: 1200000, // ₹12,000 / bed in paise
        amenities: ['Attached bathroom', 'Balcony', 'Geyser', 'Cupboard'],
        status: RoomStatus.OCCUPIED,
      },
    });
  }

  // Beds in 101
  const beds101Data = [
    { bedNumber: 'BedA', status: BedStatus.OCCUPIED, rentAmount: 1200000 },
    { bedNumber: 'BedB', status: BedStatus.OCCUPIED, rentAmount: 1200000 },
    { bedNumber: 'BedC', status: BedStatus.AVAILABLE, rentAmount: 1200000 },
    { bedNumber: 'BedD', status: BedStatus.OCCUPIED, rentAmount: 2400000 },
  ];

  const beds101Map: Record<string, any> = {};
  for (const b of beds101Data) {
    let bed = await prisma.bed.findFirst({
      where: { roomId: room101.id, bedNumber: b.bedNumber },
    });
    if (!bed) {
      bed = await prisma.bed.create({
        data: {
          organizationId: orgId,
          roomId: room101.id,
          bedNumber: b.bedNumber,
          rentAmount: b.rentAmount,
          status: b.status,
        },
      });
    } else {
      bed = await prisma.bed.update({
        where: { id: bed.id },
        data: { status: b.status, rentAmount: b.rentAmount },
      });
    }
    beds101Map[b.bedNumber] = bed;
  }

  // Room 102: Ground Floor, DOUBLE, 2 Beds (BedA, BedB)
  let room102 = await prisma.room.findFirst({
    where: { propertyId: prop1.id, roomNumber: '102' },
  });

  if (!room102) {
    room102 = await prisma.room.create({
      data: {
        organizationId: orgId,
        propertyId: prop1.id,
        roomNumber: '102',
        floor: 'Ground Floor',
        sharingType: SharingType.DOUBLE,
        rentAmount: 1000000,
        amenities: ['Attached bathroom', 'Cupboard'],
        status: RoomStatus.PARTIALLY_OCCUPIED,
      },
    });
  }

  const beds102Data = [
    { bedNumber: 'BedA', status: BedStatus.OCCUPIED, rentAmount: 0 },
    { bedNumber: 'BedB', status: BedStatus.AVAILABLE, rentAmount: 1000000 },
  ];

  const beds102Map: Record<string, any> = {};
  for (const b of beds102Data) {
    let bed = await prisma.bed.findFirst({
      where: { roomId: room102.id, bedNumber: b.bedNumber },
    });
    if (!bed) {
      bed = await prisma.bed.create({
        data: {
          organizationId: orgId,
          roomId: room102.id,
          bedNumber: b.bedNumber,
          rentAmount: b.rentAmount,
          status: b.status,
        },
      });
    } else {
      bed = await prisma.bed.update({
        where: { id: bed.id },
        data: { status: b.status, rentAmount: b.rentAmount },
      });
    }
    beds102Map[b.bedNumber] = bed;
  }

  // Room 201: 1st Floor, TRIPLE (3 beds, all vacant)
  let room201 = await prisma.room.findFirst({
    where: { propertyId: prop1.id, roomNumber: '201' },
  });

  if (!room201) {
    room201 = await prisma.room.create({
      data: {
        organizationId: orgId,
        propertyId: prop1.id,
        roomNumber: '201',
        floor: '1st Floor',
        sharingType: SharingType.TRIPLE,
        rentAmount: 900000,
        amenities: ['AC', 'Attached bathroom'],
        status: RoomStatus.AVAILABLE,
      },
    });
    for (const bNum of ['BedA', 'BedB', 'BedC']) {
      await prisma.bed.create({
        data: {
          organizationId: orgId,
          roomId: room201.id,
          bedNumber: bNum,
          rentAmount: 900000,
          status: BedStatus.AVAILABLE,
        },
      });
    }
  }

  // Room 202: 1st Floor, TRIPLE (3 beds, all vacant)
  let room202 = await prisma.room.findFirst({
    where: { propertyId: prop1.id, roomNumber: '202' },
  });

  if (!room202) {
    room202 = await prisma.room.create({
      data: {
        organizationId: orgId,
        propertyId: prop1.id,
        roomNumber: '202',
        floor: '1st Floor',
        sharingType: SharingType.TRIPLE,
        rentAmount: 900000,
        amenities: ['Balcony', 'Geyser'],
        status: RoomStatus.AVAILABLE,
      },
    });
    for (const bNum of ['BedA', 'BedB', 'BedC']) {
      await prisma.bed.create({
        data: {
          organizationId: orgId,
          roomId: room202.id,
          bedNumber: bNum,
          rentAmount: 900000,
          status: BedStatus.AVAILABLE,
        },
      });
    }
  }

  console.log('Rooms & Beds created: Total 12 beds (4 occupied, 8 vacant)');

  // 5. Residents matching UI screenshots
  // Resident 1: Madhav (occupies 101 BedA and BedB)
  let resMadhav = await prisma.resident.findFirst({
    where: { organizationId: orgId, mobile: '8010097706' },
  });

  if (!resMadhav) {
    resMadhav = await prisma.resident.create({
      data: {
        organizationId: orgId,
        propertyId: prop1.id,
        roomId: room101.id,
        bedId: beds101Map['BedA'].id,
        firstName: 'Madhav',
        lastName: 'More',
        email: 'madhav@example.com',
        mobile: '8010097706',
        profession: 'WORKING_PROFESSIONAL',
        monthlyRent: 1200000, // ₹12,000
        securityDeposit: 2400000,
        joiningDate: new Date('2026-06-01'),
        status: ResidentStatus.ACTIVE,
      },
    });
  }

  // Resident 2: raghav (101 BedD)
  let resRaghav = await prisma.resident.findFirst({
    where: { organizationId: orgId, mobile: '9822001122' },
  });

  if (!resRaghav) {
    resRaghav = await prisma.resident.create({
      data: {
        organizationId: orgId,
        propertyId: prop1.id,
        roomId: room101.id,
        bedId: beds101Map['BedD'].id,
        firstName: 'raghav',
        lastName: 'Verma',
        email: 'raghav@example.com',
        mobile: '9822001122',
        profession: 'WORKING_PROFESSIONAL',
        monthlyRent: 2400000, // ₹24,000
        securityDeposit: 2400000,
        joiningDate: new Date('2026-01-15'),
        expectedVacatingDate: new Date('2027-09-21'),
        status: ResidentStatus.ACTIVE,
      },
    });
  }

  // Resident 3: iuyyuiuh (102 BedA)
  let resIuy = await prisma.resident.findFirst({
    where: { organizationId: orgId, mobile: '9766554433' },
  });

  if (!resIuy) {
    resIuy = await prisma.resident.create({
      data: {
        organizationId: orgId,
        propertyId: prop1.id,
        roomId: room102.id,
        bedId: beds102Map['BedA'].id,
        firstName: 'iuyyuiuh',
        lastName: 'Patil',
        email: 'iuyyuiuh@example.com',
        mobile: '9766554433',
        profession: 'STUDENT',
        monthlyRent: 0,
        securityDeposit: 1000000,
        joiningDate: new Date('2026-08-01'),
        expectedVacatingDate: new Date('2027-09-30'),
        status: ResidentStatus.ACTIVE,
      },
    });
  }

  console.log(`Residents created: Madhav (${resMadhav.id}), raghav (${resRaghav.id}), iuyyuiuh (${resIuy.id})`);

  // 6. Billing & Dues
  // Raghav has ₹32,516 pending dues (3251600 paise)
  // Check if existing billing records exist
  const existingBills = await prisma.billingRecord.findMany({
    where: { residentId: resRaghav.id },
  });

  if (existingBills.length === 0) {
    await prisma.billingRecord.create({
      data: {
        organizationId: orgId,
        propertyId: prop1.id,
        residentId: resRaghav.id,
        type: BillingType.RENT,
        amount: 2400000, // ₹24,000
        paidAmount: 0,
        dueDate: new Date('2026-10-05'),
        billingMonth: 10,
        billingYear: 2026,
        status: BillingStatus.OVERDUE,
        description: 'October Monthly Rent',
      },
    });

    await prisma.billingRecord.create({
      data: {
        organizationId: orgId,
        propertyId: prop1.id,
        residentId: resRaghav.id,
        type: BillingType.ELECTRICITY,
        amount: 451600, // ₹4,516
        paidAmount: 0,
        dueDate: new Date('2026-10-10'),
        billingMonth: 10,
        billingYear: 2026,
        status: BillingStatus.OVERDUE,
        description: 'Room 101 Electricity Sub-meter Split',
      },
    });

    await prisma.billingRecord.create({
      data: {
        organizationId: orgId,
        propertyId: prop1.id,
        residentId: resRaghav.id,
        type: BillingType.MAINTENANCE,
        amount: 400000, // ₹4,000
        paidAmount: 0,
        dueDate: new Date('2026-10-15'),
        billingMonth: 10,
        billingYear: 2026,
        status: BillingStatus.OVERDUE,
        description: 'Quarterly Maintenance & Deep Cleaning',
      },
    });
  }

  // 7. Payments Collections
  // Total Collection in current period = ₹39,484 (3948400 paise)
  const existingPayments = await prisma.payment.findMany({
    where: { organizationId: orgId },
  });

  if (existingPayments.length === 0) {
    await prisma.payment.create({
      data: {
        organizationId: orgId,
        residentId: resRaghav.id,
        amount: 2400000, // ₹24,000
        mode: PaymentMode.UPI,
        status: PaymentStatus.CONFIRMED,
        collectionDate: new Date('2026-10-02'),
        reference: 'UPI/20261002/894726159',
        notes: 'September Rent Cleared',
      },
    });

    await prisma.payment.create({
      data: {
        organizationId: orgId,
        residentId: resMadhav.id,
        amount: 1548400, // ₹15,484
        mode: PaymentMode.CASH,
        status: PaymentStatus.CONFIRMED,
        collectionDate: new Date('2026-10-05'),
        reference: 'CASH-VAN-092',
        notes: 'Rent + Mess fees',
      },
    });
  }

  // 8. Staff members
  const wardenDesig = await prisma.staffDesignation.findFirst({
    where: { organizationId: orgId, name: 'Warden' },
  });
  const cookDesig = await prisma.staffDesignation.findFirst({
    where: { organizationId: orgId, name: 'Cook' },
  });
  const cleanerDesig = await prisma.staffDesignation.findFirst({
    where: { organizationId: orgId, name: 'Cleaner' },
  });

  if (wardenDesig) {
    const existingStaff = await prisma.staff.findFirst({
      where: { organizationId: orgId, mobile: '9876500001' },
    });
    if (!existingStaff) {
      await prisma.staff.create({
        data: {
          organizationId: orgId,
          propertyId: prop1.id,
          designationId: wardenDesig.id,
          firstName: 'Ramesh',
          lastName: 'Kulkarni',
          mobile: '9876500001',
          email: 'ramesh.warden@example.com',
          salary: 2500000, // ₹25,000
          joiningDate: new Date('2025-04-01'),
          status: StaffStatus.ACTIVE,
        },
      });
    }
  }

  if (cookDesig) {
    const existingStaff = await prisma.staff.findFirst({
      where: { organizationId: orgId, mobile: '9876500002' },
    });
    if (!existingStaff) {
      await prisma.staff.create({
        data: {
          organizationId: orgId,
          propertyId: prop1.id,
          designationId: cookDesig.id,
          firstName: 'Aarav',
          lastName: 'Yadav',
          mobile: '9876500002',
          salary: 1800000,
          joiningDate: new Date('2025-06-01'),
          status: StaffStatus.ACTIVE,
        },
      });
    }
  }

  // 9. Complaints
  const plumbCat = await prisma.complaintCategory.findFirst({
    where: { organizationId: orgId, name: 'Plumbing' },
  });
  const wifiCat = await prisma.complaintCategory.findFirst({
    where: { organizationId: orgId, name: 'Internet & WiFi' },
  });

  if (plumbCat) {
    const existingC = await prisma.complaint.findFirst({
      where: { organizationId: orgId, description: { contains: 'tap is leaking' } },
    });
    if (!existingC) {
      await prisma.complaint.create({
        data: {
          organizationId: orgId,
          propertyId: prop1.id,
          roomId: room101.id,
          categoryId: plumbCat.id,
          description: 'Bathroom tap is leaking and water pressure is low.',
          urgency: ComplaintUrgency.MEDIUM,
          status: ComplaintStatus.TEAM_WORKING,
          location: 'Room 101 Bathroom',
          createdBy: user.id,
        },
      });
    }
  }

  if (wifiCat) {
    const existingC = await prisma.complaint.findFirst({
      where: { organizationId: orgId, description: { contains: 'Wi-Fi' } },
    });
    if (!existingC) {
      await prisma.complaint.create({
        data: {
          organizationId: orgId,
          propertyId: prop1.id,
          categoryId: wifiCat.id,
          description: 'Wi-Fi connectivity drops frequently on 1st Floor corridor router.',
          urgency: ComplaintUrgency.HIGH,
          status: ComplaintStatus.RECEIVED,
          location: '1st Floor Common Area',
          createdBy: user.id,
        },
      });
    }
  }

  // 10. Leads
  const existingLead = await prisma.lead.findFirst({
    where: { organizationId: orgId, mobile: '9123456780' },
  });
  if (!existingLead) {
    await prisma.lead.create({
      data: {
        organizationId: orgId,
        propertyId: prop1.id,
        name: 'Ankit Sharma',
        mobile: '9123456780',
        email: 'ankit.s@gmail.com',
        sharingPreference: 'DOUBLE',
        status: 'VISITED',
        budget: 1200000,
        visitScheduledAt: new Date('2026-11-15T11:00:00Z'),
        notes: 'Requested Ground floor room if available.',
        source: 'walk_in',
      },
    });
  }

  // 11. Bookings
  const existingBooking = await prisma.booking.findFirst({
    where: { organizationId: orgId, guestMobile: '9888877777' },
  });
  if (!existingBooking) {
    await prisma.booking.create({
      data: {
        organizationId: orgId,
        propertyId: prop1.id,
        roomId: room201.id,
        guestName: 'Rohit Deshmukh',
        guestMobile: '9888877777',
        guestEmail: 'rohit.d@example.com',
        tokenAmount: 500000, // ₹5,000
        expectedMoveIn: new Date('2026-11-10'),
        status: 'CONFIRMED',
        paymentMode: PaymentMode.UPI,
        paymentRef: 'UPI-BOOK-991',
      },
    });
  }

  // 12. Sub-Meter
  const existingMeter = await prisma.subMeter.findFirst({
    where: { propertyId: prop1.id, meterNumber: 'MTR-101-A' },
  });
  if (!existingMeter) {
    const meter = await prisma.subMeter.create({
      data: {
        organizationId: orgId,
        propertyId: prop1.id,
        roomId: room101.id,
        meterNumber: 'MTR-101-A',
        initialReading: 1200,
        currentReading: 1680,
        tariffRate: 1200, // ₹12/unit in paise
      },
    });
    await prisma.meterReading.create({
      data: {
        subMeterId: meter.id,
        reading: 1680,
        unitsConsumed: 260,
        readingDate: new Date('2026-10-31'),
        totalAmount: 312000, // 260 * 12 = ₹3,120
      },
    });
  }

  console.log('✅ Full seed completed successfully with verified data!');
}

main()
  .catch((e) => {
    console.error('❌ Seed error:', e);
    process.exit(1);
  })
  .finally(async () => {
    await prisma.$disconnect();
  });
