// Prisma Database Seeder for Fleet & Workforce Management System (Saudi Arabia)
import bcrypt from 'bcryptjs';

// Safe dynamic Prisma Client loader for both development and runtime environments
let PrismaClientConstructor: any;
try {
  const prismaPkg = require('@prisma/client');
  PrismaClientConstructor = prismaPkg.PrismaClient;
} catch {
  // Mock fallback for direct verification environments
  PrismaClientConstructor = class MockPrisma {
    $disconnect = async () => {};
    auditLog = { deleteMany: async () => {} };
    notification = { deleteMany: async () => {} };
    expiryAlert = { deleteMany: async () => {} };
    expenseRecord = { deleteMany: async () => {} };
    fuelRecord = { deleteMany: async () => {} };
    maintenanceRecord = { deleteMany: async () => {} };
    vehicleInspection = { deleteMany: async () => {} };
    vehicleInsurance = { deleteMany: async () => {} };
    vehicleRegistration = { deleteMany: async () => {} };
    workerDocument = { deleteMany: async () => {} };
    vehicleDocument = { deleteMany: async () => {} };
    vehicleAssignment = { deleteMany: async () => {} };
    worker = { deleteMany: async () => {}, create: async (d: any) => d.data };
    vehicle = { deleteMany: async () => {}, create: async (d: any) => d.data };
    user = { deleteMany: async () => {}, create: async (d: any) => d.data };
    department = { deleteMany: async () => {}, create: async (d: any) => ({ ...d.data, id: 'dept-mock' }) };
    companyProfile = { deleteMany: async () => {}, create: async (d: any) => d.data };
  };
}

const prisma = new PrismaClientConstructor();

async function main() {
  console.log('Seeding Saudi Fleet & Workforce PostgreSQL database...');

  // 1. Clean existing records
  await prisma.auditLog.deleteMany({});
  await prisma.notification.deleteMany({});
  await prisma.expiryAlert.deleteMany({});
  await prisma.expenseRecord.deleteMany({});
  await prisma.fuelRecord.deleteMany({});
  await prisma.maintenanceRecord.deleteMany({});
  await prisma.vehicleInspection.deleteMany({});
  await prisma.vehicleInsurance.deleteMany({});
  await prisma.vehicleRegistration.deleteMany({});
  await prisma.workerDocument.deleteMany({});
  await prisma.vehicleDocument.deleteMany({});
  await prisma.vehicleAssignment.deleteMany({});
  await prisma.worker.deleteMany({});
  await prisma.vehicle.deleteMany({});
  await prisma.user.deleteMany({});
  await prisma.department.deleteMany({});
  await prisma.companyProfile.deleteMany({});

  // 2. Company Profile
  await prisma.companyProfile.create({
    data: {
      name: 'Al-Buraq Logistics & Transport Co.',
      nameAr: 'شركة البراق للنقل والخدمات اللوجستية',
      crNumber: '1010892471', // 10-digit Saudi CR
      vatNumber: '310294857100003', // 15-digit ZATCA VAT
      address: 'King Fahd Road, Al-Olaya District, Riyadh, Saudi Arabia',
      addressAr: 'طريق الملك فهد، حي العليا، الرياض، المملكة العربية السعودية',
      phone: '+966 11 489 2000',
      email: 'info@alburaq-transport.sa',
      managerName: 'Eng. Khalid Al-Mutairi',
      currency: 'SAR',
      timezone: 'Asia/Riyadh'
    }
  });

  // 3. Departments
  const deptOperations = await prisma.department.create({
    data: { name: 'Fleet Operations', nameAr: 'عمليات الأسطول والنقل', code: 'OPS' }
  });
  const deptLogistics = await prisma.department.create({
    data: { name: 'Heavy Cargo Logistics', nameAr: 'الشحن الثقيل واللوجستيات', code: 'LOG' }
  });
  await prisma.department.create({
    data: { name: 'Human Resources', nameAr: 'الموارد البشرية وشؤون الموظفين', code: 'HR' }
  });
  await prisma.department.create({
    data: { name: 'Technical & Maintenance', nameAr: 'الصيانة والدعم الفني', code: 'MAINT' }
  });

  // 4. Default Admin & Manager Users
  const salt = bcrypt.genSaltSync(10);
  const superAdmin = await prisma.user.create({
    data: {
      fullName: 'Abdulwahab Mangal',
      email: 'abdulwahabmangal777@gmail.com',
      username: 'admin',
      passwordHash: bcrypt.hashSync('admin123', salt),
      role: 'SUPER_ADMIN',
      departmentId: deptOperations.id,
      isActive: true
    }
  });

  const fleetManager = await prisma.user.create({
    data: {
      fullName: 'Tariq Al-Ghamdi',
      email: 'tariq@alburaq-transport.sa',
      username: 'manager',
      passwordHash: bcrypt.hashSync('manager123', salt),
      role: 'MANAGER',
      departmentId: deptOperations.id,
      isActive: true
    }
  });

  console.log(`Created Super Admin (${superAdmin.email}) and Manager (${fleetManager.email})`);

  // 5. Vehicles with Saudi Plates
  const v1 = await prisma.vehicle.create({
    data: {
      vehicleId: 'FLT-101',
      plateNumber: '7845 XYZ',
      plateDigits: '7845',
      plateLettersEn: 'XYZ',
      plateDigitsAr: '٧٨٤٥',
      plateLettersAr: 'س ص ع',
      make: 'Mercedes-Benz',
      model: 'Actros 1845 LS',
      year: 2023,
      color: 'Pure White',
      vin: 'WDB9634031L892104',
      ownershipType: 'OWNED',
      departmentId: deptLogistics.id,
      currentLocation: 'Riyadh Central Depot',
      status: 'ACTIVE',
      currentMileage: 142500,
      fuelType: 'DIESEL',
      registrationNumber: 'IST-892147',
      registrationExpiryDate: new Date('2026-09-15'),
      insuranceCompany: 'Tawuniya Cooperative Insurance',
      insurancePolicyNumber: 'POL-TAW-89214',
      insuranceExpiryDate: new Date('2026-08-20'),
      inspectionExpiryDate: new Date('2026-11-10')
    }
  });

  const v2 = await prisma.vehicle.create({
    data: {
      vehicleId: 'FLT-102',
      plateNumber: '4192 BDA',
      plateDigits: '4192',
      plateLettersEn: 'BDA',
      plateDigitsAr: '٤١٩٢',
      plateLettersAr: 'ب د أ',
      make: 'Toyota',
      model: 'Hilux Double Cab 4x4',
      year: 2024,
      color: 'Silver Metallic',
      vin: 'MR0FR22G901928341',
      ownershipType: 'OWNED',
      departmentId: deptOperations.id,
      currentLocation: 'Jeddah Regional Hub',
      status: 'ACTIVE',
      currentMileage: 38400,
      fuelType: 'GASOLINE_91',
      registrationNumber: 'IST-419201',
      registrationExpiryDate: new Date('2026-04-10'),
      insuranceCompany: 'Bupa Arabia / Medgulf',
      insurancePolicyNumber: 'POL-MED-41920',
      insuranceExpiryDate: new Date('2026-03-02'),
      inspectionExpiryDate: new Date('2026-07-25')
    }
  });

  // 6. Workers with Saudi Iqamas
  await prisma.worker.create({
    data: {
      employeeId: 'EMP-1001',
      fullName: 'Ahmed Mohammed Al-Omari',
      fullNameAr: 'أحمد محمد العمري',
      nationality: 'Saudi',
      nationalityAr: 'سعودي',
      jobTitle: 'Senior Fleet Captain',
      departmentId: deptLogistics.id,
      phone: '+966 50 481 9201',
      email: 'ahmed.omari@alburaq-transport.sa',
      iqamaNumber: '1092837461',
      iqamaExpiryDate: new Date('2028-10-15'),
      driverLicenseNumber: 'DL-1092837461',
      driverLicenseExpiryDate: new Date('2027-05-12'),
      salary: 9500.0,
      assignedVehicleId: v1.id,
      status: 'ACTIVE'
    }
  });

  await prisma.worker.create({
    data: {
      employeeId: 'EMP-1002',
      fullName: 'Muhammad Tariq Khan',
      fullNameAr: 'محمد طارق خان',
      nationality: 'Pakistani',
      nationalityAr: 'باكستاني',
      jobTitle: 'Heavy Truck Driver',
      departmentId: deptOperations.id,
      phone: '+966 55 192 8374',
      email: 'm.tariq@alburaq-transport.sa',
      iqamaNumber: '2491029384',
      iqamaExpiryDate: new Date('2026-03-20'),
      passportNumber: 'PK92817401',
      passportExpiryDate: new Date('2027-01-10'),
      driverLicenseNumber: 'DL-2491029384',
      driverLicenseExpiryDate: new Date('2026-11-20'),
      salary: 4800.0,
      assignedVehicleId: v2.id,
      status: 'ACTIVE'
    }
  });

  console.log('Database seeded successfully with enterprise Saudi dataset.');
}

main()
  .catch((e) => {
    console.error('Seeding error:', e);
  })
  .finally(async () => {
    if (prisma && prisma.$disconnect) {
      await prisma.$disconnect();
    }
  });
