import { PrismaClient, OrderStatus, PaymentStatus, PaymentMethod } from '@prisma/client'

const prisma = new PrismaClient()

const SAMPLE_RETAILERS = [
  {
    retailerCode: 'RET-001',
    storeName: 'Popular Pharmacy',
    ownerName: 'Al-Haj Mohammad Rafiqul Islam',
    phone: '01711-234567',
    email: 'popular.pharmacy01@gmail.com',
    address: 'Shop 14, Super Market, Farmgate, Dhaka',
    marketRoute: 'Farmgate & Panthapath Route',
    defaultDiscountPercent: 12.0,
    creditLimit: 100000,
    currentDue: 24500,
    pinCode: '1001',
  },
  {
    retailerCode: 'RET-002',
    storeName: 'Lazz Pharma (Dhanmondi Branch)',
    ownerName: 'Kamrul Hassan',
    phone: '01819-345678',
    email: 'kamrul.lazz@gmail.com',
    address: 'Road 7/A, Satmasjid Road, Dhanmondi, Dhaka',
    marketRoute: 'Dhanmondi & Mohammadpur Route',
    defaultDiscountPercent: 14.0,
    creditLimit: 250000,
    currentDue: 58200,
    pinCode: '1002',
  },
  {
    retailerCode: 'RET-003',
    storeName: 'Al-Madina Medicine Corner',
    ownerName: 'Maulana Abul Bashar',
    phone: '01912-456789',
    email: 'almadina.corner@yahoo.com',
    address: 'Gate 2, Mitford Hospital Road, Babubazar, Old Dhaka',
    marketRoute: 'Old Dhaka & Mitford Route',
    defaultDiscountPercent: 12.0,
    creditLimit: 150000,
    currentDue: 42000,
    pinCode: '1003',
  },
  {
    retailerCode: 'RET-004',
    storeName: 'Care & Cure Drug House',
    ownerName: 'Dr. Shahab Uddin Ahmed',
    phone: '01678-567890',
    email: 'carecure.shahab@gmail.com',
    address: 'Plot 42, Sector 3, Uttara, Dhaka',
    marketRoute: 'Uttara & Airport Route',
    defaultDiscountPercent: 12.0,
    creditLimit: 80000,
    currentDue: 18400,
    pinCode: '1004',
  },
  {
    retailerCode: 'RET-005',
    storeName: 'Shampa Medical Store',
    ownerName: 'Mizanur Rahman',
    phone: '01712-678901',
    email: 'mizan.shampa@gmail.com',
    address: 'Station Road, Mirpur-10 Circle, Dhaka',
    marketRoute: 'Mirpur Route',
    defaultDiscountPercent: 12.0,
    creditLimit: 75000,
    currentDue: 0,
    pinCode: '1005',
  },
  {
    retailerCode: 'RET-006',
    storeName: 'Bengal Pharmacy & Surgical',
    ownerName: 'Anowar Hossain',
    phone: '01823-789012',
    email: 'bengalpharma.anowar@gmail.com',
    address: 'Opposite DMCH Emergency Gate, Bakshibazar, Dhaka',
    marketRoute: 'Old Dhaka & Mitford Route',
    defaultDiscountPercent: 13.0,
    creditLimit: 180000,
    currentDue: 63800,
    pinCode: '1006',
  },
  {
    retailerCode: 'RET-007',
    storeName: 'Green Life Medicine Corner',
    ownerName: 'Jahangir Alam',
    phone: '01734-890123',
    email: 'greenlife.jahangir@gmail.com',
    address: 'Green Road, Panthapath Signal, Dhaka',
    marketRoute: 'Farmgate & Panthapath Route',
    defaultDiscountPercent: 12.0,
    creditLimit: 90000,
    currentDue: 12000,
    pinCode: '1007',
  },
  {
    retailerCode: 'RET-008',
    storeName: 'City Pharma & General Store',
    ownerName: 'Tanvir Ahmed Chowdhury',
    phone: '01934-901234',
    email: 'citypharma.tanvir@gmail.com',
    address: 'B-Block Main Road, Halishahar, Chittagong',
    marketRoute: 'Regional Wholesale Route',
    defaultDiscountPercent: 14.0,
    creditLimit: 200000,
    currentDue: 78500,
    pinCode: '1008',
  },
  {
    retailerCode: 'RET-009',
    storeName: 'Trust Medical Hall',
    ownerName: 'Nurul Huda',
    phone: '01715-012345',
    email: 'trustmedical.huda@gmail.com',
    address: 'Shaheed Minar Road, Narayanganj Sadar',
    marketRoute: 'Narayanganj Route',
    defaultDiscountPercent: 12.0,
    creditLimit: 60000,
    currentDue: 15300,
    pinCode: '1009',
  },
  {
    retailerCode: 'RET-010',
    storeName: 'Apollo Drug House',
    ownerName: 'Mahfuzur Rahman',
    phone: '01845-123456',
    email: 'apollo.mahfuz@gmail.com',
    address: 'Chowrasta Market, Gazipur Sadar',
    marketRoute: 'Gazipur Route',
    defaultDiscountPercent: 12.0,
    creditLimit: 85000,
    currentDue: 29000,
    pinCode: '1010',
  },
  {
    retailerCode: 'RET-011',
    storeName: 'New Model Pharmacy',
    ownerName: 'Subrata Roy',
    phone: '01611-234568',
    email: 'subrata.newmodel@gmail.com',
    address: 'Thana Road, Savar Bazaar, Dhaka',
    marketRoute: 'Savar & Ashulia Route',
    defaultDiscountPercent: 12.0,
    creditLimit: 70000,
    currentDue: 8500,
    pinCode: '1011',
  },
  {
    retailerCode: 'RET-012',
    storeName: 'Bismillah Medicine Point',
    ownerName: 'Kazi Faruk Hossain',
    phone: '01722-345679',
    email: 'bismillah.faruk@gmail.com',
    address: 'Mohammadpur Town Hall Market, Dhaka',
    marketRoute: 'Dhanmondi & Mohammadpur Route',
    defaultDiscountPercent: 12.0,
    creditLimit: 95000,
    currentDue: 34200,
    pinCode: '1012',
  },
  {
    retailerCode: 'RET-013',
    storeName: 'Medicare Corner',
    ownerName: 'Golam Rabbani',
    phone: '01915-456780',
    email: 'medicare.rabbani@gmail.com',
    address: 'Badda Link Road, Middle Badda, Dhaka',
    marketRoute: 'Badda & Rampura Route',
    defaultDiscountPercent: 12.0,
    creditLimit: 65000,
    currentDue: 19800,
    pinCode: '1013',
  },
  {
    retailerCode: 'RET-014',
    storeName: 'United Drug House',
    ownerName: 'Ziaul Hoque',
    phone: '01816-567891',
    email: 'uniteddrug.zia@gmail.com',
    address: 'Shahjadpur Bus Stand, Gulshan-2, Dhaka',
    marketRoute: 'Gulshan & Banani Route',
    defaultDiscountPercent: 13.0,
    creditLimit: 120000,
    currentDue: 47000,
    pinCode: '1014',
  },
  {
    retailerCode: 'RET-015',
    storeName: 'Seva Pharmacy',
    ownerName: 'Biplob Kumar Das',
    phone: '01735-678902',
    email: 'seva.biplob@gmail.com',
    address: 'Shantinagar Mor, Kakrail Road, Dhaka',
    marketRoute: 'Shantinagar & Motijheel Route',
    defaultDiscountPercent: 12.0,
    creditLimit: 75000,
    currentDue: 14600,
    pinCode: '1015',
  },
  {
    retailerCode: 'RET-016',
    storeName: 'Hope Medical Hall',
    ownerName: 'Nasir Uddin',
    phone: '01679-789013',
    email: 'hopemedical.nasir@gmail.com',
    address: 'Khilgaon Taltola Market, Dhaka',
    marketRoute: 'Khilgaon & Malibagh Route',
    defaultDiscountPercent: 12.0,
    creditLimit: 50000,
    currentDue: 9200,
    pinCode: '1016',
  },
  {
    retailerCode: 'RET-017',
    storeName: 'Arogya Niketan',
    ownerName: 'Shyamal Chandra Dey',
    phone: '01716-890124',
    email: 'arogya.shyamal@gmail.com',
    address: 'Naya Bazaar, Old Dhaka',
    marketRoute: 'Old Dhaka & Mitford Route',
    defaultDiscountPercent: 12.0,
    creditLimit: 110000,
    currentDue: 38700,
    pinCode: '1017',
  },
  {
    retailerCode: 'RET-018',
    storeName: 'Prime Pharmacy',
    ownerName: 'Iqbal Mahmood',
    phone: '01825-901235',
    email: 'primepharma.iqbal@gmail.com',
    address: 'College Road, Tongi Bazaar, Gazipur',
    marketRoute: 'Gazipur Route',
    defaultDiscountPercent: 12.0,
    creditLimit: 80000,
    currentDue: 21500,
    pinCode: '1018',
  },
  {
    retailerCode: 'RET-019',
    storeName: 'Life Care Pharma',
    ownerName: 'Sultan Mahmud',
    phone: '01926-012346',
    email: 'lifecare.sultan@gmail.com',
    address: 'DIT Road, Malibagh Chowdhury Para, Dhaka',
    marketRoute: 'Khilgaon & Malibagh Route',
    defaultDiscountPercent: 12.0,
    creditLimit: 60000,
    currentDue: 0,
    pinCode: '1019',
  },
  {
    retailerCode: 'RET-020',
    storeName: 'Shurhid Medical Store',
    ownerName: 'Fazlul Karim',
    phone: '01717-123457',
    email: 'shurhid.fazlul@gmail.com',
    address: 'Rupnagar Main Road, Mirpur-2, Dhaka',
    marketRoute: 'Mirpur Route',
    defaultDiscountPercent: 12.0,
    creditLimit: 70000,
    currentDue: 17300,
    pinCode: '1020',
  },
  {
    retailerCode: 'RET-021',
    storeName: 'Mother & Child Pharma',
    ownerName: 'Dr. Shahida Begum',
    phone: '01681-234569',
    email: 'motherchild.pharma@gmail.com',
    address: 'Matuail Hospital Road, Jatrabari, Dhaka',
    marketRoute: 'Jatrabari & Sayedabad Route',
    defaultDiscountPercent: 12.0,
    creditLimit: 85000,
    currentDue: 26400,
    pinCode: '1021',
  },
  {
    retailerCode: 'RET-022',
    storeName: 'Siam Medicine Corner',
    ownerName: 'Siam Chowdhury',
    phone: '01827-345670',
    email: 'siam.corner@gmail.com',
    address: 'Chamelibagh, Shantinagar, Dhaka',
    marketRoute: 'Shantinagar & Motijheel Route',
    defaultDiscountPercent: 12.0,
    creditLimit: 90000,
    currentDue: 31000,
    pinCode: '1022',
  },
  {
    retailerCode: 'RET-023',
    storeName: 'Sonali Drug House',
    ownerName: 'Azizul Islam',
    phone: '01928-456781',
    email: 'sonali.aziz@gmail.com',
    address: 'Dohar Main Bazaar, Nawabganj, Dhaka',
    marketRoute: 'Regional Wholesale Route',
    defaultDiscountPercent: 13.0,
    creditLimit: 120000,
    currentDue: 52000,
    pinCode: '1023',
  },
  {
    retailerCode: 'RET-024',
    storeName: 'Modern Prescription Point',
    ownerName: 'Tariqul Alam',
    phone: '01718-567892',
    email: 'modern.tariq@gmail.com',
    address: 'Sector 11, Uttara, Dhaka',
    marketRoute: 'Uttara & Airport Route',
    defaultDiscountPercent: 12.0,
    creditLimit: 75000,
    currentDue: 13800,
    pinCode: '1024',
  },
  {
    retailerCode: 'RET-025',
    storeName: 'Standard Medical Hall',
    ownerName: 'Monirul Islam',
    phone: '01683-678903',
    email: 'standard.monir@gmail.com',
    address: 'Postagola Bridge Mor, Shyampur, Dhaka',
    marketRoute: 'Old Dhaka & Mitford Route',
    defaultDiscountPercent: 12.0,
    creditLimit: 60000,
    currentDue: 11400,
    pinCode: '1025',
  },
  {
    retailerCode: 'RET-026',
    storeName: 'Amanat Drug Center',
    ownerName: 'Hafez Mawlana Nuruzzaman',
    phone: '01829-789014',
    email: 'amanat.drug@gmail.com',
    address: 'Ashulia Bazar, Savar, Dhaka',
    marketRoute: 'Savar & Ashulia Route',
    defaultDiscountPercent: 12.0,
    creditLimit: 70000,
    currentDue: 22800,
    pinCode: '1026',
  },
  {
    retailerCode: 'RET-027',
    storeName: 'Delta Pharmacy',
    ownerName: 'Masum Billah',
    phone: '01930-890125',
    email: 'delta.masum@gmail.com',
    address: 'Kalyanpur Bus Stand, Mirpur Road, Dhaka',
    marketRoute: 'Mirpur Route',
    defaultDiscountPercent: 12.0,
    creditLimit: 80000,
    currentDue: 19500,
    pinCode: '1027',
  },
  {
    retailerCode: 'RET-028',
    storeName: 'Evergreen Medical Store',
    ownerName: 'Pranab Kumar Saha',
    phone: '01719-901236',
    email: 'evergreen.pranab@gmail.com',
    address: 'Chashara Goalchamot, Narayanganj',
    marketRoute: 'Narayanganj Route',
    defaultDiscountPercent: 12.0,
    creditLimit: 95000,
    currentDue: 33700,
    pinCode: '1028',
  },
  {
    retailerCode: 'RET-029',
    storeName: 'Universal Drug House',
    ownerName: 'Sayeedul Haque',
    phone: '01685-012347',
    email: 'universal.sayeed@gmail.com',
    address: 'Ring Road, Shyamoli, Dhaka',
    marketRoute: 'Dhanmondi & Mohammadpur Route',
    defaultDiscountPercent: 12.0,
    creditLimit: 85000,
    currentDue: 25100,
    pinCode: '1029',
  },
  {
    retailerCode: 'RET-030',
    storeName: 'Central Health Pharmacy',
    ownerName: 'Ashraful Alam',
    phone: '01831-123458',
    email: 'central.ashraf@gmail.com',
    address: 'Mohakhali Wireless Gate, Dhaka',
    marketRoute: 'Gulshan & Banani Route',
    defaultDiscountPercent: 12.0,
    creditLimit: 100000,
    currentDue: 41300,
    pinCode: '1030',
  },
  {
    retailerCode: 'RET-031',
    storeName: 'MedPlus Express Corner',
    ownerName: 'Habibur Rahman',
    phone: '01932-234569',
    email: 'medplus.habib@gmail.com',
    address: 'Banani 11 Shopping Area, Dhaka',
    marketRoute: 'Gulshan & Banani Route',
    defaultDiscountPercent: 14.0,
    creditLimit: 150000,
    currentDue: 49800,
    pinCode: '1031',
  },
  {
    retailerCode: 'RET-032',
    storeName: 'Health First Dispensary',
    ownerName: 'Enamul Haque',
    phone: '01720-345680',
    email: 'healthfirst.enam@gmail.com',
    address: 'Gazipur Chourasta Mor, Joydebpur',
    marketRoute: 'Gazipur Route',
    defaultDiscountPercent: 12.0,
    creditLimit: 90000,
    currentDue: 28400,
    pinCode: '1032',
  },
  {
    retailerCode: 'RET-033',
    storeName: 'Dhaka Care Pharmacy',
    ownerName: 'Mosharraf Hossain',
    phone: '01687-456791',
    email: 'dhakacare.mosharraf@gmail.com',
    address: 'Paltan VIP Road, Purana Paltan, Dhaka',
    marketRoute: 'Shantinagar & Motijheel Route',
    defaultDiscountPercent: 12.0,
    creditLimit: 110000,
    currentDue: 37600,
    pinCode: '1033',
  },
  {
    retailerCode: 'RET-034',
    storeName: 'Palli Chikitsa Medicine House',
    ownerName: 'Abdur Razzak',
    phone: '01833-567802',
    email: 'pallichikitsa.razzak@gmail.com',
    address: 'Baipal Stand, Ashulia, Savar',
    marketRoute: 'Savar & Ashulia Route',
    defaultDiscountPercent: 12.0,
    creditLimit: 75000,
    currentDue: 16900,
    pinCode: '1034',
  },
  {
    retailerCode: 'RET-035',
    storeName: 'Apex Medical Corner',
    ownerName: 'Zahid Hasan',
    phone: '01934-678913',
    email: 'apex.zahid@gmail.com',
    address: 'Madani Avenue, Sayeed Nagar, Vatara, Dhaka',
    marketRoute: 'Badda & Rampura Route',
    defaultDiscountPercent: 12.0,
    creditLimit: 85000,
    currentDue: 22100,
    pinCode: '1035',
  },
]

async function seedRetailers() {
  console.log('====================================================')
  console.log('🏥 SEEDING 35 PHARMACY RETAILERS & WHOLESALE ORDERS')
  console.log('====================================================\n')

  let createdCount = 0

  for (const ret of SAMPLE_RETAILERS) {
    const existing = await prisma.retailer.findUnique({
      where: { retailerCode: ret.retailerCode },
    })

    if (!existing) {
      await prisma.retailer.create({
        data: ret,
      })
      createdCount++
    } else {
      await prisma.retailer.update({
        where: { retailerCode: ret.retailerCode },
        data: ret,
      })
    }
  }

  console.log(`✓ Synchronized ${SAMPLE_RETAILERS.length} Retailers (${createdCount} newly created).\n`)

  // Now create sample wholesale orders for top retailers
  const popularMeds = await prisma.medicine.findMany({
    take: 12,
    where: {
      mrp: { not: null },
    },
    select: {
      id: true,
      brandName: true,
      genericName: true,
      mrp: true,
      tradePrice: true,
      boxPrice: true,
      tradeBoxPrice: true,
    },
  })

  if (popularMeds.length > 0) {
    console.log('Creating demo wholesale orders with line items...')
    const allRetailers = await prisma.retailer.findMany({ take: 5 })

    for (let i = 0; i < allRetailers.length; i++) {
      const ret = allRetailers[i]
      const orderNumber = `WHO-${new Date().toISOString().slice(0, 10).replace(/-/g, '')}-${String(i + 1).padStart(3, '0')}`

      const existingOrder = await prisma.wholesaleOrder.findUnique({
        where: { orderNumber },
      })

      if (!existingOrder) {
        // Pick 2-4 medicines
        const orderMeds = popularMeds.slice(i * 2, (i * 2) + 3)
        let subtotal = 0
        let totalDiscount = 0

        const itemsData = orderMeds.map((m) => {
          const qty = Math.floor(Math.random() * 8) + 2 // 2 to 10 boxes
          const unitPrice = m.boxPrice || (m.mrp || 10) * 100
          const tradePrice = m.tradeBoxPrice || Math.round(unitPrice * 0.88 * 100) / 100
          const lineMrp = unitPrice * qty
          const lineTotal = tradePrice * qty
          const lineDisc = lineMrp - lineTotal

          subtotal += lineMrp
          totalDiscount += lineDisc

          return {
            medicineId: m.id,
            quantity: qty,
            unit: 'Box',
            unitPrice: unitPrice,
            tradePrice: tradePrice,
            discountPercent: 12.0,
            total: lineTotal,
          }
        })

        const totalAmount = Math.round((subtotal - totalDiscount) * 100) / 100
        const paidAmount = i === 0 ? totalAmount : i === 1 ? Math.round(totalAmount / 2) : 0
        const dueAmount = totalAmount - paidAmount
        const paymentStatus =
          paidAmount === totalAmount
            ? PaymentStatus.PAID
            : paidAmount > 0
            ? PaymentStatus.PARTIAL
            : PaymentStatus.DUE

        const status =
          i === 0
            ? OrderStatus.DELIVERED
            : i === 1
            ? OrderStatus.CONFIRMED
            : OrderStatus.PENDING

        await prisma.wholesaleOrder.create({
          data: {
            orderNumber,
            retailerId: ret.id,
            orderDate: new Date().toISOString().slice(0, 10),
            status,
            paymentStatus,
            paymentMethod: i % 2 === 0 ? PaymentMethod.CASH : PaymentMethod.BKASH,
            subtotal,
            discountAmount: totalDiscount,
            totalAmount,
            paidAmount,
            dueAmount,
            notes: `Regular weekly supply order for ${ret.storeName}`,
            items: {
              create: itemsData,
            },
          },
        })
      }
    }
    console.log('✓ Initial wholesale orders created successfully.')
  }

  console.log('\n====================================================')
  console.log('✅ 35 RETAILERS READY IN DATABASE!')
  console.log('====================================================')
}

seedRetailers()
  .catch((e) => {
    console.error('Retailer seed error:', e)
    process.exit(1)
  })
  .finally(async () => {
    await prisma.$disconnect()
  })
