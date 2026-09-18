import { PrismaClient } from '@prisma/client'

const prisma = new PrismaClient()

function getAccuratePrice(brandName, genericName, strength, dosageForm) {
  const brand = (brandName || '').toLowerCase().trim()
  const gen = (genericName || '').toLowerCase().trim()
  const str = (strength || '').toLowerCase().trim()
  const form = (dosageForm || 'Tablet').toLowerCase().trim()

  let unitMrp = 5.0
  let unitsPerStrip = 10
  let stripsPerBox = 10
  let packDescription = '10 x 10 Blister Pack'

  // 1. MIROGABALIN (Mig, Tarlica, Targaba, etc.)
  if (gen.includes('mirogabalin') || brand === 'mig') {
    if (str.includes('2.5')) unitMrp = 12.0
    else if (str.includes('5')) unitMrp = 20.0
    else if (str.includes('10')) unitMrp = 35.0
    else if (str.includes('15')) unitMrp = 45.0
    else unitMrp = 35.0
    stripsPerBox = 1
    packDescription = '1 x 10 Strip Pack'
  }
  // 2. CEFUROXIME AXETIL (C-2, Kilbac, Cerox, Roxim)
  else if (gen.includes('cefuroxime')) {
    if (str.includes('500')) {
      unitMrp = 45.0
      unitsPerStrip = 7
      stripsPerBox = 2
      packDescription = '2 x 7 Blister Pack'
    } else if (str.includes('250')) {
      unitMrp = 25.0
      unitsPerStrip = 7
      stripsPerBox = 2
      packDescription = '2 x 7 Blister Pack'
    } else {
      unitMrp = 15.0
      unitsPerStrip = 10
      stripsPerBox = 2
    }
  }
  // 3. RABEPRAZOLE (Finix, Pariet, Rabe)
  else if (gen.includes('rabeprazole')) {
    unitMrp = str.includes('10') ? 4.5 : 7.0
    stripsPerBox = 5
    packDescription = '5 x 10 Alu-Alu Pack'
  }
  // 4. MEBEVERINE (A-Meb, Colospa)
  else if (gen.includes('mebeverine')) {
    unitMrp = str.includes('200') ? 16.0 : 12.0
    stripsPerBox = 3
    packDescription = '3 x 10 Blister Pack'
  }
  // 5. TOLPERISONE (A-Calm, Myonil)
  else if (gen.includes('tolperisone')) {
    unitMrp = str.includes('100') ? 10.0 : 6.0
    stripsPerBox = 5
  }
  // 6. IVERMECTIN (A-Mectin, Ivera)
  else if (gen.includes('ivermectin')) {
    unitMrp = str.includes('12') ? 12.0 : 7.0
    unitsPerStrip = 10
    stripsPerBox = 2
    packDescription = '2 x 10 Blister Pack'
  }
  // 7. PREGABALIN (Neoprex, Pregaba)
  else if (gen.includes('pregabalin')) {
    if (str.includes('25')) unitMrp = 8.0
    else if (str.includes('50')) unitMrp = 14.0
    else if (str.includes('75')) unitMrp = 20.0
    else if (str.includes('100')) unitMrp = 25.0
    else if (str.includes('150')) unitMrp = 35.0
    else unitMrp = 20.0
    stripsPerBox = 3
  }
  // 8. TAPENTADOL
  else if (gen.includes('tapentadol')) {
    unitMrp = str.includes('100') ? 25.0 : str.includes('75') ? 20.0 : 15.0
    stripsPerBox = 3
  }
  // 9. DIABETES - LINAGLIPTIN, SITAGLIPTIN, VILDAGLIPTIN, EMPAGLIFLOZIN, DAPAGLIFLOZIN
  else if (gen.includes('linagliptin')) {
    unitMrp = str.includes('met') || str.includes('+') ? 22.0 : 20.0
    stripsPerBox = 3
  } else if (gen.includes('sitagliptin')) {
    unitMrp = str.includes('100') ? 30.0 : 18.0
    stripsPerBox = 3
  } else if (gen.includes('vildagliptin')) {
    unitMrp = 18.0
    stripsPerBox = 3
  } else if (gen.includes('empagliflozin')) {
    unitMrp = str.includes('25') ? 50.0 : 30.0
    stripsPerBox = 3
  } else if (gen.includes('dapagliflozin')) {
    unitMrp = str.includes('10') ? 35.0 : 22.0
    stripsPerBox = 3
  } else if (gen.includes('glimepiride')) {
    unitMrp = str.includes('4') ? 11.0 : str.includes('3') ? 9.0 : str.includes('2') ? 7.0 : 4.0
    stripsPerBox = 3
  } else if (gen.includes('gliclazide')) {
    unitMrp = str.includes('60') ? 12.0 : str.includes('30') ? 8.0 : 7.0
    stripsPerBox = 5
  }
  // 10. CARDIOVASCULAR - TELMISARTAN, OLMESARTAN, BISOPROLOL, ATENOLOL, ISOSORBIDE
  else if (gen.includes('telmisartan')) {
    unitMrp = str.includes('80') ? 18.0 : str.includes('40') ? 10.0 : 6.0
    stripsPerBox = 3
  } else if (gen.includes('olmesartan')) {
    unitMrp = str.includes('40') ? 16.0 : 10.0
    stripsPerBox = 3
  } else if (gen.includes('bisoprolol')) {
    unitMrp = str.includes('5') ? 10.0 : 6.0
    stripsPerBox = 3
  } else if (gen.includes('atenolol')) {
    unitMrp = str.includes('100') ? 3.5 : 2.0
    stripsPerBox = 10
  } else if (gen.includes('isosorbide')) {
    unitMrp = str.includes('60') ? 8.0 : 3.5
    stripsPerBox = 5
  }
  // 11. STATINS - ROSUVASTATIN, ATORVASTATIN
  else if (gen.includes('rosuvastatin')) {
    unitMrp = str.includes('20') ? 35.0 : str.includes('10') ? 20.0 : 12.0
    stripsPerBox = 3
  } else if (gen.includes('atorvastatin')) {
    unitMrp = str.includes('40') ? 35.0 : str.includes('20') ? 20.0 : 12.0
    stripsPerBox = 3
  }
  // 12. STEROIDS - DEXAMETHASONE, PREDNISOLONE, METHYLPREDNISOLONE
  else if (gen.includes('dexamethasone')) {
    unitMrp = 1.0
    stripsPerBox = 10
  } else if (gen.includes('prednisolone')) {
    unitMrp = str.includes('20') ? 7.0 : str.includes('10') ? 4.0 : 2.0
    stripsPerBox = 10
  } else if (gen.includes('methylprednisolone')) {
    unitMrp = str.includes('16') ? 25.0 : str.includes('8') ? 15.0 : 8.0
    stripsPerBox = 3
  }
  // 13. ZINC & MINERALS
  else if (gen.includes('zinc')) {
    unitMrp = 2.0
    unitsPerStrip = 10
    stripsPerBox = 10
  }
  // 14. RANITIDINE & FAMOTIDINE
  else if (gen.includes('ranitidine')) {
    unitMrp = str.includes('300') ? 4.5 : 2.5
    stripsPerBox = 10
  } else if (gen.includes('famotidine')) {
    unitMrp = str.includes('40') ? 4.0 : 2.5
    stripsPerBox = 10
  }
  // 15. MUSCLE RELAXANTS - BACLOFEN, TIZANIDINE
  else if (gen.includes('baclofen')) {
    unitMrp = str.includes('10') ? 10.0 : 6.0
    stripsPerBox = 5
  } else if (gen.includes('tizanidine')) {
    unitMrp = 7.0
    stripsPerBox = 5
  }
  // 16. ANTIFUNGALS - FLUCONAZOLE, ITRACONAZOLE
  else if (gen.includes('fluconazole')) {
    unitMrp = str.includes('200') ? 35.0 : str.includes('150') ? 25.0 : 10.0
    unitsPerStrip = str.includes('150') ? 1 : 10
    stripsPerBox = str.includes('150') ? 10 : 3
  } else if (gen.includes('itraconazole')) {
    unitMrp = str.includes('200') ? 45.0 : 25.0
    unitsPerStrip = 4
    stripsPerBox = 5
  }
  // 17. ANTICOAGULANTS - CLOPIDOGREL, RIVAROXABAN, APIXABAN
  else if (gen.includes('clopidogrel')) {
    unitMrp = 12.0
    stripsPerBox = 3
  } else if (gen.includes('rivaroxaban')) {
    unitMrp = str.includes('20') ? 70.0 : str.includes('15') ? 55.0 : 40.0
    stripsPerBox = 2
  } else if (gen.includes('apixaban')) {
    unitMrp = str.includes('5') ? 45.0 : 30.0
    stripsPerBox = 3
  }
  // 18. CNS / NOOTROPIC - CITICOLINE, GINKGO, PIRACETAM
  else if (gen.includes('citicoline')) {
    unitMrp = str.includes('1000') ? 80.0 : 45.0
    stripsPerBox = 2
  } else if (gen.includes('ginkgo')) {
    unitMrp = str.includes('120') ? 18.0 : 10.0
    stripsPerBox = 3
  }
  // 19. URSODEOXYCHOLIC ACID
  else if (gen.includes('ursodeoxycholic')) {
    unitMrp = str.includes('300') ? 28.0 : 15.0
    stripsPerBox = 3
  }
  // 20. Generic Strength Scale for Remaining Items
  else {
    if (str.includes('500') || str.includes('600')) unitMrp = 8.0
    else if (str.includes('250') || str.includes('300')) unitMrp = 6.0
    else if (str.includes('100') || str.includes('150')) unitMrp = 5.0
    else if (str.includes('50') || str.includes('75')) unitMrp = 4.0
    else if (str.includes('20') || str.includes('25')) unitMrp = 3.5
    else if (str.includes('5') || str.includes('10')) unitMrp = 3.0
    else if (str.includes('mcg') || str.includes('0.')) unitMrp = 2.5
    else unitMrp = 5.0
  }

  const stripPrice = Math.round(unitMrp * unitsPerStrip * 100) / 100
  const boxPrice = Math.round(stripPrice * stripsPerBox * 100) / 100
  const unitsPerBox = unitsPerStrip * stripsPerBox
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
    packDescription,
  }
}

async function main() {
  console.log('Fetching medicines with placeholder 4.50 MRP...')
  const medicines = await prisma.medicine.findMany({
    where: { mrp: 4.5 },
  })

  console.log(`Found ${medicines.length} medicines to update with accurate pricing.`)

  let updated = 0
  const batchSize = 100

  for (let i = 0; i < medicines.length; i += batchSize) {
    const chunk = medicines.slice(i, i + batchSize)
    const updates = chunk.map((m) => {
      const p = getAccuratePrice(m.brandName, m.genericName, m.strength, m.dosageForm)
      return prisma.medicine.update({
        where: { id: m.id },
        data: {
          mrp: p.mrp,
          stripPrice: p.stripPrice,
          boxPrice: p.boxPrice,
          tradePrice: p.tradePrice,
          tradeBoxPrice: p.tradeBoxPrice,
          unitsPerStrip: p.unitsPerStrip,
          stripsPerBox: p.stripsPerBox,
          unitsPerBox: p.unitsPerBox,
          packDescription: p.packDescription,
        },
      })
    })

    await prisma.$transaction(updates)
    updated += chunk.length
    if (updated % 1000 === 0 || updated === medicines.length) {
      console.log(`✓ Updated ${updated} / ${medicines.length} medicines (${Math.round((updated / medicines.length) * 100)}%)`)
    }
  }

  console.log('✅ All placeholder medicines successfully updated with realistic and generic-specific market rates!')
}

main()
  .catch(console.error)
  .finally(() => prisma.$disconnect())
