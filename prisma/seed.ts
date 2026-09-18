import { PrismaClient, Role, ShortageStatus } from '@prisma/client'
import bcrypt from 'bcryptjs'

const prisma = new PrismaClient()

async function main() {
  console.log('====================================================')
  console.log('🌱 SEEDING DEMO / SAMPLE PHARMACY DATA')
  console.log('⚠️  NOTE: This is sample demonstration data for development.')
  console.log('====================================================')

  // Clear existing demo records in safe order
  await prisma.auditLog.deleteMany()
  await prisma.shortage.deleteMany()
  await prisma.medicine.deleteMany()
  await prisma.manufacturer.deleteMany()
  await prisma.user.deleteMany()

  // 1. Create Default Users (Admin + Specialized Staff Roles + Employees)
  const defaultPinHash = await bcrypt.hash('1234', 10)

  const admin = await prisma.user.create({
    data: {
      employeeId: 'ADMIN',
      name: 'System Administrator',
      passwordHash: defaultPinHash,
      role: 'ADMIN' as Role,
      isActive: true,
    },
  })

  const manager = await prisma.user.create({
    data: {
      employeeId: 'MGR001',
      name: 'Branch Manager',
      passwordHash: defaultPinHash,
      role: 'MANAGER' as Role,
      isActive: true,
    },
  })

  const pharmacist = await prisma.user.create({
    data: {
      employeeId: 'PHARM001',
      name: 'Chief Pharmacist',
      passwordHash: defaultPinHash,
      role: 'PHARMACIST' as Role,
      isActive: true,
    },
  })

  const cashier = await prisma.user.create({
    data: {
      employeeId: 'CASH001',
      name: 'Counter Cashier',
      passwordHash: defaultPinHash,
      role: 'CASHIER' as Role,
      isActive: true,
    },
  })

  const salesRep = await prisma.user.create({
    data: {
      employeeId: 'REP001',
      name: 'Wholesale Sales Rep',
      passwordHash: defaultPinHash,
      role: 'SALES_REP' as Role,
      isActive: true,
    },
  })

  const empRahim = await prisma.user.create({
    data: {
      employeeId: 'EMP001',
      name: 'Rahim Ahmed',
      passwordHash: defaultPinHash,
      role: 'EMPLOYEE' as Role,
      isActive: true,
    },
  })

  const empKarim = await prisma.user.create({
    data: {
      employeeId: 'EMP002',
      name: 'Karim Uddin',
      passwordHash: defaultPinHash,
      role: 'EMPLOYEE' as Role,
      isActive: true,
    },
  })

  const empHasan = await prisma.user.create({
    data: {
      employeeId: 'EMP003',
      name: 'Hasan Mahmud',
      passwordHash: defaultPinHash,
      role: 'EMPLOYEE' as Role,
      isActive: true,
    },
  })

  const empJamal = await prisma.user.create({
    data: {
      employeeId: 'EMP004',
      name: 'Jamal Hossain',
      passwordHash: defaultPinHash,
      role: 'EMPLOYEE' as Role,
      isActive: true,
    },
  })

  console.log('✓ Users created (Admin, Manager, Pharmacist, Cashier, Sales Rep, Floor Staff - PIN: 1234)')

  // 2. Create Manufacturers
  const manufacturersData = [
    { name: 'Beximco Pharmaceuticals Ltd.', shortName: 'Beximco' },
    { name: 'Square Pharmaceuticals PLC', shortName: 'Square' },
    { name: 'Incepta Pharmaceuticals Ltd.', shortName: 'Incepta' },
    { name: 'Renata Limited', shortName: 'Renata' },
    { name: 'The ACME Laboratories Ltd.', shortName: 'ACME' },
    { name: 'Opsonin Pharma Ltd.', shortName: 'Opsonin' },
    { name: 'Aristopharma Ltd.', shortName: 'Aristopharma' },
    { name: 'Eskayef Pharmaceuticals Ltd.', shortName: 'SK+F' },
    { name: 'Healthcare Pharmaceuticals Ltd.', shortName: 'Healthcare' },
    { name: 'Drug International Ltd.', shortName: 'DIL' },
    { name: 'Popular Pharmaceuticals Ltd.', shortName: 'Popular' },
  ]

  const mfgMap = new Map<string, string>()

  for (const mfg of manufacturersData) {
    const created = await prisma.manufacturer.create({
      data: {
        name: mfg.name,
        shortName: mfg.shortName,
      },
    })
    mfgMap.set(mfg.shortName, created.id)
  }

  console.log(`✓ ${mfgMap.size} Manufacturers created`)

  // 3. Create Sample Medicine Catalog
  const medicinesData = [
    // Beximco
    {
      brandName: 'Napa',
      genericName: 'Paracetamol',
      strength: '500 mg',
      dosageForm: 'Tablet',
      mfgKey: 'Beximco',
      packDescription: '50x10 blister strips in box',
      purchaseUnit: 'Box',
      retailUnit: 'Tablet',
      searchKeywords: 'paracetamol fever pain relief nappa napa500 pyro ace pyrexia',
    },
    {
      brandName: 'Napa Extra',
      genericName: 'Paracetamol + Caffeine',
      strength: '500 mg + 65 mg',
      dosageForm: 'Tablet',
      mfgKey: 'Beximco',
      packDescription: '20x10 blister strips in box',
      purchaseUnit: 'Box',
      retailUnit: 'Tablet',
      searchKeywords: 'napa extra caffeine headache pain fast red napa',
    },
    {
      brandName: 'Napa Extend',
      genericName: 'Paracetamol',
      strength: '665 mg',
      dosageForm: 'Tablet',
      mfgKey: 'Beximco',
      packDescription: '10x10 blister strips in box',
      purchaseUnit: 'Box',
      retailUnit: 'Tablet',
      searchKeywords: 'napa extend 665 sustained release joint pain',
    },
    {
      brandName: 'Napa Rapid',
      genericName: 'Paracetamol',
      strength: '500 mg',
      dosageForm: 'Tablet',
      mfgKey: 'Beximco',
      packDescription: '10x10 strips in box',
      purchaseUnit: 'Box',
      retailUnit: 'Tablet',
      searchKeywords: 'napa rapid fast acting dissolve soluble',
    },
    {
      brandName: 'Napa Syrup',
      genericName: 'Paracetamol',
      strength: '120 mg/5 ml',
      dosageForm: 'Syrup',
      mfgKey: 'Beximco',
      packDescription: '60 ml PET bottle with measuring cup',
      purchaseUnit: 'Bottle',
      retailUnit: 'Bottle',
      searchKeywords: 'napa syrup baby children fever liquid paracetamol',
    },

    // Square
    {
      brandName: 'Seclo',
      genericName: 'Omeprazole',
      strength: '20 mg',
      dosageForm: 'Capsule',
      mfgKey: 'Square',
      packDescription: '6x10 alu-alu blister pack',
      purchaseUnit: 'Box',
      retailUnit: 'Capsule',
      searchKeywords: 'seclo 20 omeprazole gastric acidity square seclo heartburn ulcer',
    },
    {
      brandName: 'Seclo',
      genericName: 'Omeprazole',
      strength: '40 mg',
      dosageForm: 'Capsule',
      mfgKey: 'Square',
      packDescription: '3x10 alu-alu blister pack',
      purchaseUnit: 'Box',
      retailUnit: 'Capsule',
      searchKeywords: 'seclo 40 omeprazole square acidity',
    },
    {
      brandName: 'DP',
      genericName: 'Domperidone',
      strength: '5 mg',
      dosageForm: 'Tablet',
      mfgKey: 'Square',
      packDescription: '10x10 blister strips in box',
      purchaseUnit: 'Box',
      retailUnit: 'Tablet',
      searchKeywords: 'dp 5 domperidone nausea vomiting motility square',
    },
    {
      brandName: 'Ace',
      genericName: 'Paracetamol',
      strength: '500 mg',
      dosageForm: 'Tablet',
      mfgKey: 'Square',
      packDescription: '50x10 blister strips in box',
      purchaseUnit: 'Box',
      retailUnit: 'Tablet',
      searchKeywords: 'ace 500 paracetamol fever pain square',
    },
    {
      brandName: 'Ace Plus',
      genericName: 'Paracetamol + Caffeine',
      strength: '500 mg + 65 mg',
      dosageForm: 'Tablet',
      mfgKey: 'Square',
      packDescription: '25x10 blister strips in box',
      purchaseUnit: 'Box',
      retailUnit: 'Tablet',
      searchKeywords: 'ace plus caffeine migraine headache pain',
    },
    {
      brandName: 'Ciprocin',
      genericName: 'Ciprofloxacin',
      strength: '500 mg',
      dosageForm: 'Tablet',
      mfgKey: 'Square',
      packDescription: '3x10 blister strips in box',
      purchaseUnit: 'Box',
      retailUnit: 'Tablet',
      searchKeywords: 'ciprocin 500 ciprofloxacin antibiotic infection',
    },
    {
      brandName: 'Alatrol',
      genericName: 'Cetirizine Dihydrochloride',
      strength: '10 mg',
      dosageForm: 'Tablet',
      mfgKey: 'Square',
      packDescription: '10x10 blister strips in box',
      purchaseUnit: 'Box',
      retailUnit: 'Tablet',
      searchKeywords: 'alatrol cetirizine allergy itching sneeze cold runny nose',
    },
    {
      brandName: 'Fexo',
      genericName: 'Fexofenadine HCl',
      strength: '120 mg',
      dosageForm: 'Tablet',
      mfgKey: 'Square',
      packDescription: '5x10 blister strips in box',
      purchaseUnit: 'Box',
      retailUnit: 'Tablet',
      searchKeywords: 'fexo 120 fexofenadine allergy antihistamine',
    },
    {
      brandName: 'Filwel Gold',
      genericName: 'Multivitamin & Multimineral',
      strength: 'A to Zinc',
      dosageForm: 'Tablet',
      mfgKey: 'Square',
      packDescription: 'Container of 30 tablets',
      purchaseUnit: 'Bottle',
      retailUnit: 'Bottle',
      searchKeywords: 'filwel gold multivitamin mineral energy weakness immunity',
    },

    // ACME
    {
      brandName: 'Monas',
      genericName: 'Montelukast Sodium',
      strength: '10 mg',
      dosageForm: 'Tablet',
      mfgKey: 'ACME',
      packDescription: '3x10 alu-alu blister strips',
      purchaseUnit: 'Box',
      retailUnit: 'Tablet',
      searchKeywords: 'monas 10 montelukast asthma breathing allergy acme monas10',
    },
    {
      brandName: 'Monas',
      genericName: 'Montelukast Sodium',
      strength: '5 mg',
      dosageForm: 'Chewable Tablet',
      mfgKey: 'ACME',
      packDescription: '3x10 alu-alu blister strips',
      purchaseUnit: 'Box',
      retailUnit: 'Tablet',
      searchKeywords: 'monas 5 chewable children pediatric asthma',
    },
    {
      brandName: 'Neotack',
      genericName: 'Ranitidine',
      strength: '150 mg',
      dosageForm: 'Tablet',
      mfgKey: 'ACME',
      packDescription: '10x10 blister strips',
      purchaseUnit: 'Box',
      retailUnit: 'Tablet',
      searchKeywords: 'neotack ranitidine acidity ulcer acme',
    },

    // Incepta
    {
      brandName: 'Pantonix',
      genericName: 'Pantoprazole Sodium',
      strength: '20 mg',
      dosageForm: 'Tablet',
      mfgKey: 'Incepta',
      packDescription: '5x14 alu-alu blister pack',
      purchaseUnit: 'Box',
      retailUnit: 'Tablet',
      searchKeywords: 'pantonix 20 pantoprazole incepta gastric acidity gas',
    },
    {
      brandName: 'Pantonix',
      genericName: 'Pantoprazole Sodium',
      strength: '40 mg',
      dosageForm: 'Tablet',
      mfgKey: 'Incepta',
      packDescription: '5x10 alu-alu blister pack',
      purchaseUnit: 'Box',
      retailUnit: 'Tablet',
      searchKeywords: 'pantonix 40 pantoprazole incepta ulcer reflux',
    },
    {
      brandName: 'Osartil',
      genericName: 'Losartan Potassium',
      strength: '50 mg',
      dosageForm: 'Tablet',
      mfgKey: 'Incepta',
      packDescription: '3x10 blister pack',
      purchaseUnit: 'Box',
      retailUnit: 'Tablet',
      searchKeywords: 'osartil 50 losartan blood pressure hypertension bp incepta',
    },

    // Renata
    {
      brandName: 'Maxpro',
      genericName: 'Esomeprazole Magnesium',
      strength: '20 mg',
      dosageForm: 'Capsule',
      mfgKey: 'Renata',
      packDescription: '5x10 alu-alu blister pack',
      purchaseUnit: 'Box',
      retailUnit: 'Capsule',
      searchKeywords: 'maxpro 20 esomeprazole renata acidity gas ulcer',
    },
    {
      brandName: 'Maxpro',
      genericName: 'Esomeprazole Magnesium',
      strength: '40 mg',
      dosageForm: 'Capsule',
      mfgKey: 'Renata',
      packDescription: '3x10 alu-alu blister pack',
      purchaseUnit: 'Box',
      retailUnit: 'Capsule',
      searchKeywords: 'maxpro 40 esomeprazole renata reflux severe acidity',
    },

    // Healthcare
    {
      brandName: 'Sergel',
      genericName: 'Esomeprazole',
      strength: '20 mg',
      dosageForm: 'Capsule',
      mfgKey: 'Healthcare',
      packDescription: '6x10 alu-alu blister pack',
      purchaseUnit: 'Box',
      retailUnit: 'Capsule',
      searchKeywords: 'sergel 20 esomeprazole healthcare gastric gas burning',
    },

    // Opsonin
    {
      brandName: 'Finix',
      genericName: 'Rabeprazole Sodium',
      strength: '20 mg',
      dosageForm: 'Tablet',
      mfgKey: 'Opsonin',
      packDescription: '5x10 blister pack',
      purchaseUnit: 'Box',
      retailUnit: 'Tablet',
      searchKeywords: 'finix 20 rabeprazole opsonin acidity gastric',
    },
  ]

  const medMap = new Map<string, string>()

  for (const item of medicinesData) {
    const mfgId = mfgMap.get(item.mfgKey)
    if (!mfgId) continue

    const created = await prisma.medicine.create({
      data: {
        brandName: item.brandName,
        genericName: item.genericName,
        strength: item.strength,
        dosageForm: item.dosageForm,
        manufacturerId: mfgId,
        packDescription: item.packDescription,
        purchaseUnit: item.purchaseUnit,
        retailUnit: item.retailUnit,
        searchKeywords: item.searchKeywords,
        isActive: true,
      },
    })
    medMap.set(`${item.brandName}_${item.strength}`, created.id)
  }

  console.log(`✓ ${medMap.size} Medicines created`)

  // 4. Create Today's Sample Shortage Records to demonstrate duplicate consolidation
  const todayStr = new Date().toISOString().slice(0, 10)
  const napa500Id = medMap.get('Napa_500 mg')
  const seclo20Id = medMap.get('Seclo_20 mg')
  const monas10Id = medMap.get('Monas_10 mg')
  const dp5Id = medMap.get('DP_5 mg')

  if (napa500Id) {
    // 3 different employees report Napa 500
    await prisma.shortage.create({
      data: {
        medicineId: napa500Id,
        employeeId: empRahim.id,
        quantity: 10,
        unit: 'Box',
        notes: 'Out of stock in rack A2',
        status: ShortageStatus.REPORTED,
        reportedDate: todayStr,
      },
    })
    await prisma.shortage.create({
      data: {
        medicineId: napa500Id,
        employeeId: empKarim.id,
        quantity: 15,
        unit: 'Box',
        notes: 'Customer asked for 5 strips, zero left',
        status: ShortageStatus.REPORTED,
        reportedDate: todayStr,
      },
    })
    await prisma.shortage.create({
      data: {
        medicineId: napa500Id,
        employeeId: empHasan.id,
        quantity: null, // Test optional quantity submission
        unit: 'Box',
        notes: null,
        status: ShortageStatus.REPORTED,
        reportedDate: todayStr,
      },
    })
  }

  if (seclo20Id) {
    // 2 employees report Seclo 20
    await prisma.shortage.create({
      data: {
        medicineId: seclo20Id,
        employeeId: empKarim.id,
        quantity: 5,
        unit: 'Box',
        notes: 'Only 2 strips remaining',
        status: ShortageStatus.REPORTED,
        reportedDate: todayStr,
      },
    })
    await prisma.shortage.create({
      data: {
        medicineId: seclo20Id,
        employeeId: empJamal.id,
        quantity: 10,
        unit: 'Box',
        notes: 'High demand',
        status: ShortageStatus.REPORTED,
        reportedDate: todayStr,
      },
    })
  }

  if (monas10Id) {
    await prisma.shortage.create({
      data: {
        medicineId: monas10Id,
        employeeId: empRahim.id,
        quantity: 3,
        unit: 'Box',
        notes: 'ACME order pending',
        status: ShortageStatus.REPORTED,
        reportedDate: todayStr,
      },
    })
  }

  if (dp5Id) {
    await prisma.shortage.create({
      data: {
        medicineId: dp5Id,
        employeeId: empHasan.id,
        quantity: 2,
        unit: 'Box',
        status: ShortageStatus.REPORTED,
        reportedDate: todayStr,
      },
    })
  }

  // Initial System Settings
  await prisma.systemSetting.upsert({
    where: { key: 'pharmacy_name' },
    update: { value: 'Bara-Awlia Medical Hall' },
    create: { key: 'pharmacy_name', value: 'Bara-Awlia Medical Hall' },
  })
  await prisma.systemSetting.upsert({
    where: { key: 'require_quantity' },
    update: { value: 'false' },
    create: { key: 'require_quantity', value: 'false' },
  })

  // Audit log
  await prisma.auditLog.create({
    data: {
      action: 'SYSTEM_SEEDED',
      userId: admin.id,
      details: 'Initial demo seed data populated successfully.',
    },
  })

  console.log('✓ Today shortage demo entries created (Napa 500: 3 reports, Seclo 20: 2 reports, Monas 10: 1 report, DP 5: 1 report)')
  console.log('====================================================')
  console.log('✅ Demo seed completed successfully!')
  console.log('====================================================')
}

main()
  .catch((e) => {
    console.error('Seed error:', e)
    process.exit(1)
  })
  .finally(async () => {
    await prisma.$disconnect()
  })
