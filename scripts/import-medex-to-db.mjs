import fs from 'fs'
import path from 'path'
import { PrismaClient } from '@prisma/client'

const prisma = new PrismaClient()
const DATA_DIR = path.join(process.cwd(), 'data')
const MEDEX_JSON = path.join(DATA_DIR, 'medex-medicines.json')
const DGDA_JSON = path.join(DATA_DIR, 'dgda-allopathic-medicines.json')

async function importDataset() {
  console.log('====================================================')
  console.log('📦 IMPORTING MEDICINE DATASET INTO SQLITE DATABASE')
  console.log('====================================================\n')

  let medicines = []

  if (fs.existsSync(MEDEX_JSON)) {
    console.log(`Loading from Medex file: ${MEDEX_JSON}`)
    const content = JSON.parse(fs.readFileSync(MEDEX_JSON, 'utf8'))
    medicines = content.medicines || []
  } else if (fs.existsSync(DGDA_JSON)) {
    console.log(`Medex file not found. Loading from official DGDA file: ${DGDA_JSON}`)
    const content = JSON.parse(fs.readFileSync(DGDA_JSON, 'utf8'))
    medicines = (content.medicines || []).map((m) => {
      // Parse DGDA format: tradeName, genericNameWithStrength, dosageForm, company
      const genericParts = (m.genericNameWithStrength || '').split(/\s+(\d+.*)$/)
      const genericName = genericParts[0]?.trim() || m.genericNameWithStrength || 'Unknown'
      const strength = genericParts[1]?.trim() || 'Standard'

      return {
        brandName: m.tradeName,
        strength,
        dosageForm: m.dosageForm || 'Tablet',
        genericName,
        manufacturer: m.company,
      }
    })
  } else {
    console.error('No medicine dataset found in data/ directory!')
    process.exit(1)
  }

  console.log(`Loaded ${medicines.length} medicine records to import.\n`)

  // 1. Gather all unique manufacturers
  console.log('Step 1: Synchronizing manufacturers...')
  const mfgNames = new Set()
  for (const m of medicines) {
    if (m.manufacturer && m.manufacturer.trim()) {
      mfgNames.add(m.manufacturer.trim())
    }
  }

  console.log(`Found ${mfgNames.size} distinct manufacturers. Checking database...`)

  // Fetch existing manufacturers
  const existingMfgs = await prisma.manufacturer.findMany({
    select: { id: true, name: true },
  })
  const mfgMap = new Map(existingMfgs.map((m) => [m.name.toLowerCase().trim(), m.id]))

  // Create missing manufacturers in batches
  const missingMfgs = Array.from(mfgNames).filter((name) => !mfgMap.has(name.toLowerCase()))

  if (missingMfgs.length > 0) {
    console.log(`Creating ${missingMfgs.length} new manufacturers...`)
    const batchSize = 100
    for (let i = 0; i < missingMfgs.length; i += batchSize) {
      const chunk = missingMfgs.slice(i, i + batchSize)
      await prisma.$transaction(
        chunk.map((name) =>
          prisma.manufacturer.create({
            data: { name },
          })
        )
      )
    }

    // Refresh lookup map
    const allMfgs = await prisma.manufacturer.findMany({ select: { id: true, name: true } })
    allMfgs.forEach((m) => mfgMap.set(m.name.toLowerCase().trim(), m.id))
  }

  console.log(`✓ All manufacturers ready (${mfgMap.size} in database).\n`)

  // 2. Fetch existing medicines to avoid duplicate creation
  console.log('Step 2: Checking existing medicines in database...')
  const existingMeds = await prisma.medicine.findMany({
    select: { brandName: true, strength: true, manufacturerId: true, dosageForm: true },
  })
  const existingMedKeys = new Set(
    existingMeds.map(
      (m) => `${m.brandName}|${m.strength}|${m.dosageForm}|${m.manufacturerId}`.toLowerCase()
    )
  )

  // Filter new medicines to insert
  const toInsert = []
  for (const m of medicines) {
    const mfgId = mfgMap.get(m.manufacturer.toLowerCase().trim())
    if (!mfgId) continue

    const key = `${m.brandName}|${m.strength}|${m.dosageForm}|${mfgId}`.toLowerCase()
    if (!existingMedKeys.has(key)) {
      existingMedKeys.add(key)
      toInsert.push({
        brandName: m.brandName.trim(),
        genericName: m.genericName.trim(),
        strength: (m.strength || 'N/A').trim(),
        dosageForm: (m.dosageForm || 'Tablet').trim(),
        manufacturerId: mfgId,
        purchaseUnit: 'Box',
        retailUnit: m.dosageForm === 'Capsule' ? 'Capsule' : m.dosageForm === 'Syrup' ? 'Bottle' : 'Tablet',
        searchKeywords: `${m.brandName} ${m.genericName}`.toLowerCase().trim(),
        isActive: true,
      })
    }
  }

  console.log(`Found ${toInsert.length} new medicines to insert into database.`)

  if (toInsert.length > 0) {
    const chunkSize = 250
    const totalChunks = Math.ceil(toInsert.length / chunkSize)
    console.log(`Inserting in ${totalChunks} transaction chunks...`)

    for (let c = 0; c < totalChunks; c++) {
      const chunk = toInsert.slice(c * chunkSize, (c + 1) * chunkSize)
      await prisma.$transaction(
        chunk.map((data) =>
          prisma.medicine.create({
            data,
          })
        )
      )
      if ((c + 1) % 10 === 0 || c + 1 === totalChunks) {
        console.log(`Imported chunk ${c + 1}/${totalChunks} (${Math.min((c + 1) * chunkSize, toInsert.length)} items)`)
      }
    }
  }

  const finalCount = await prisma.medicine.count()
  console.log('\n====================================================')
  console.log(`✅ IMPORT COMPLETE! Total medicines in SQLite database: ${finalCount}`)
  console.log('====================================================')
}

importDataset()
  .catch((e) => {
    console.error('Import error:', e)
    process.exit(1)
  })
  .finally(async () => {
    await prisma.$disconnect()
  })
