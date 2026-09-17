import { PrismaClient } from '@prisma/client'

const prisma = new PrismaClient()

// Standard pricing generator based on dosage form, strength, and generic name
function computeMedicinePricing(brandName, genericName, strength, dosageForm) {
  const form = (dosageForm || 'Tablet').toLowerCase()
  const gen = (genericName || '').toLowerCase()
  const str = (strength || '').toLowerCase()

  let unitMrp = 3.0 // default
  let unitsPerStrip = 10
  let stripsPerBox = 10

  if (form.includes('syrup') || form.includes('suspension') || form.includes('solution') || form.includes('oral liquid')) {
    unitMrp = 65.0
    unitsPerStrip = 1
    stripsPerBox = 1
    if (gen.includes('paracetamol')) unitMrp = 35.0
    else if (gen.includes('cefixime') || gen.includes('azithromycin')) unitMrp = 195.0
    else if (gen.includes('cough') || gen.includes('dextromethorphan') || gen.includes('ambroxol')) unitMrp = 75.0
    else if (gen.includes('iron') || gen.includes('vitamin') || gen.includes('calcium')) unitMrp = 90.0
  } else if (form.includes('drop') || form.includes('eye') || form.includes('ear')) {
    unitMrp = 60.0
    unitsPerStrip = 1
    stripsPerBox = 1
    if (gen.includes('moxifloxacin') || gen.includes('tobramycin')) unitMrp = 120.0
    else if (gen.includes('chloramphenicol')) unitMrp = 35.0
  } else if (form.includes('injection') || form.includes('infusion')) {
    unitMrp = 85.0
    unitsPerStrip = 1
    stripsPerBox = 10
    if (gen.includes('ceftriaxone') || str.includes('1 g') || str.includes('1000 mg')) unitMrp = 180.0
    else if (gen.includes('pantoprazole') || gen.includes('esomeprazole')) unitMrp = 95.0
    else if (gen.includes('diclofenac')) unitMrp = 25.0
  } else if (form.includes('ointment') || form.includes('cream') || form.includes('gel')) {
    unitMrp = 55.0
    unitsPerStrip = 1
    stripsPerBox = 1
    if (gen.includes('fusidic') || gen.includes('mupirocin')) unitMrp = 110.0
    else if (gen.includes('clobetasol') || gen.includes('betamethasone')) unitMrp = 45.0
    else if (gen.includes('diclofenac') || gen.includes('pain')) unitMrp = 75.0
  } else if (form.includes('capsule')) {
    unitsPerStrip = 10
    stripsPerBox = 10
    if (gen.includes('omeprazole') || gen.includes('esomeprazole') || gen.includes('pantoprazole') || gen.includes('rabeprazole')) {
      unitMrp = str.includes('40') ? 9.0 : 6.0
      stripsPerBox = 6
    } else if (gen.includes('cefixime')) {
      unitMrp = str.includes('400') ? 55.0 : 35.0
      unitsPerStrip = 7
      stripsPerBox = 2
    } else if (gen.includes('amoxicillin') || gen.includes('cloxacillin')) {
      unitMrp = 7.5
      unitsPerStrip = 10
      stripsPerBox = 10
    } else if (gen.includes('doxycycline')) {
      unitMrp = 3.5
      unitsPerStrip = 10
      stripsPerBox = 10
    } else {
      unitMrp = 8.0
    }
  } else {
    // Standard Tablet
    unitsPerStrip = 10
    stripsPerBox = 10
    if (gen.includes('paracetamol')) {
      unitMrp = str.includes('665') ? 2.5 : str.includes('500') ? 1.4 : 1.2
      unitsPerStrip = 10
      stripsPerBox = 50 // 500 tablets box
    } else if (gen.includes('azithromycin')) {
      unitMrp = str.includes('500') ? 35.0 : 25.0
      unitsPerStrip = 6
      stripsPerBox = 3
    } else if (gen.includes('ciprofloxacin')) {
      unitMrp = str.includes('500') ? 14.0 : 9.0
      unitsPerStrip = 10
      stripsPerBox = 5
    } else if (gen.includes('montelukast')) {
      unitMrp = str.includes('10') ? 16.0 : 10.0
      unitsPerStrip = 10
      stripsPerBox = 3
    } else if (gen.includes('fexofenadine') || gen.includes('bilastine')) {
      unitMrp = str.includes('120') ? 9.0 : str.includes('180') ? 12.0 : 6.0
      unitsPerStrip = 10
      stripsPerBox = 5
    } else if (gen.includes('calcium')) {
      unitMrp = str.includes('d') ? 8.0 : 6.0
      unitsPerStrip = 15
      stripsPerBox = 2
    } else if (gen.includes('metformin')) {
      unitMrp = str.includes('850') ? 5.5 : str.includes('500') ? 3.5 : 2.5
      unitsPerStrip = 10
      stripsPerBox = 10
    } else if (gen.includes('amlodipine') || gen.includes('losartan')) {
      unitMrp = str.includes('50') || str.includes('10') ? 8.0 : 5.0
      unitsPerStrip = 10
      stripsPerBox = 5
    } else if (gen.includes('atorvastatin') || gen.includes('rosuvastatin')) {
      unitMrp = str.includes('20') ? 22.0 : str.includes('10') ? 14.0 : 8.0
      unitsPerStrip = 10
      stripsPerBox = 3
    } else if (gen.includes('vitamin') || gen.includes('mineral')) {
      unitMrp = 5.0
      unitsPerStrip = 15
      stripsPerBox = 2
    } else {
      unitMrp = 4.5
    }
  }

  // Calculate pricing tier
  const stripPrice = Math.round(unitMrp * unitsPerStrip * 100) / 100
  const boxPrice = Math.round(stripPrice * stripsPerBox * 100) / 100
  const unitsPerBox = unitsPerStrip * stripsPerBox

  // Standard Bangladesh wholesale trade price (TP) = 12% off MRP
  const tradePrice = Math.round(unitMrp * 0.88 * 100) / 100
  const tradeBoxPrice = Math.round(boxPrice * 0.88 * 100) / 100

  return {
    mrp: unitMrp,
    stripPrice,
    boxPrice,
    tradePrice,
    tradeBoxPrice,
    unitsPerStrip,
    stripsPerBox,
    unitsPerBox,
  }
}

async function seedProductPrices() {
  console.log('====================================================')
  console.log('🏷️ SEEDING BASELINE PRODUCT PRICES FOR ALL MEDICINES')
  console.log('====================================================\n')

  const totalMedicines = await prisma.medicine.count()
  console.log(`Found ${totalMedicines} medicines to price.\n`)

  const batchSize = 1000
  let processed = 0

  for (let offset = 0; offset < totalMedicines; offset += batchSize) {
    const medicines = await prisma.medicine.findMany({
      skip: offset,
      take: batchSize,
      select: { id: true, brandName: true, genericName: true, strength: true, dosageForm: true },
    })

    if (medicines.length === 0) break

    // Fast transaction update
    await prisma.$transaction(
      medicines.map((m) => {
        const pricing = computeMedicinePricing(m.brandName, m.genericName, m.strength, m.dosageForm)
        return prisma.medicine.update({
          where: { id: m.id },
          data: pricing,
        })
      })
    )

    processed += medicines.length
    console.log(`Updated pricing for ${processed} / ${totalMedicines} medicines (${Math.round((processed / totalMedicines) * 100)}%)`)
  }

  console.log('\n====================================================')
  console.log('✅ ALL MEDICINE PRICES POPULATED SUCCESSFULLY!')
  console.log('====================================================')
}

seedProductPrices()
  .catch((e) => {
    console.error('Pricing seed error:', e)
    process.exit(1)
  })
  .finally(async () => {
    await prisma.$disconnect()
  })
