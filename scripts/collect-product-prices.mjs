import fs from 'fs'
import path from 'path'
import { PrismaClient } from '@prisma/client'

const prisma = new PrismaClient()
const DATA_DIR = path.join(process.cwd(), 'data')
const MEDEX_JSON = path.join(DATA_DIR, 'medex-medicines.json')
const COLLECTED_PRICES_JSON = path.join(DATA_DIR, 'medex-collected-prices.json')
const PROGRESS_FILE = path.join(DATA_DIR, 'price-collector-progress.json')

// Polite crawling settings to avoid Cloudflare/WAF bans
const CONCURRENCY = 6
const BATCH_DELAY_MS = 150
const USER_AGENT =
  'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/124.0.0.0 Safari/537.36'

// High-demand essential Bangladesh brands to prioritize
const PRIORITY_BRANDS = [
  'Napa', 'Napa Extra', 'Napa One', 'Napa Rapid', 'Ace', 'Ace Plus', 'Ace Power',
  'Seclo', 'Sergel', 'Pantonix', 'Maxpro', 'Finix', 'Losectil', 'Proceptin',
  'Monas', 'Montene', 'Lumona', 'Odmon', 'Fexo', 'Bilastin', 'Telfast',
  'Ceevit', 'Bextram Gold', 'Coralcal-D', 'Calbo-D', 'Aristocal-D', 'Ostocal-D',
  'D-Rise', 'Toran-D', 'Almex', 'Solbex', 'Zimax', 'Azithrocin', 'Tridosil',
  'Ciprocin', 'Neofloxin', 'Ceftron', 'Triocim', 'Cef-3', 'Tyclav', 'Moxacil',
  'G-Amoxicillin', 'A-Flox', 'Fluclox', 'Filwel Gold', 'Filwel Silver',
  'A-Cal', 'A-Cal D', 'A-Fenac', 'A-Fenac Plus', 'A-Cold', 'Tofen', 'Adrylex',
  'Tusca', 'Brofex', 'Basok', 'Dextromac', 'Ebatin', 'Alatrol', 'Cetrizin',
  'Comet', 'Daonil', 'Diapro', 'Metfo', 'Diamicron', 'Lipitor', 'Atova',
  'Rosuva', 'Rostil', 'Camlosan', 'Bizoran', 'Angilock', 'Osartil', 'Losan',
  'Anril', 'Cardizem', 'Betacard', 'Tenocard', 'Indever', 'Cloba', 'Rivotril'
]

async function fetchPage(url, retries = 3) {
  for (let attempt = 1; attempt <= retries; attempt++) {
    try {
      const res = await fetch(url, {
        headers: {
          'User-Agent': USER_AGENT,
          Accept: 'text/html,application/xhtml+xml,application/xml;q=0.9,*/*;q=0.8',
          'Accept-Language': 'en-US,en;q=0.9',
        },
      })
      if (res.status === 429) {
        // Rate limited - back off
        await new Promise((resolve) => setTimeout(resolve, attempt * 1500))
        continue
      }
      if (!res.ok) throw new Error(`HTTP ${res.status}`)
      return await res.text()
    } catch (err) {
      if (attempt === retries) return null
      await new Promise((resolve) => setTimeout(resolve, attempt * 400))
    }
  }
  return null
}

export function parseMedexPricing(html) {
  if (!html) return null

  let unitMrp = null
  let stripPrice = null
  let boxPrice = null
  let unitsPerStrip = 10
  let stripsPerBox = 10
  let packDescription = null
  let gridMatched = false
  let countMatched = false

  // 1. Unit Price: ৳ 5.00
  const unitMatch = html.match(/Unit Price:\s*<\/span>\s*<span>৳\s*([\d,.]+)/i)
  if (unitMatch) {
    unitMrp = parseFloat(unitMatch[1].replace(/,/g, ''))
  }

  // 2. Strip Price: ৳ 50.00
  const stripMatch = html.match(/Strip Price:[\s\S]*?৳\s*([\d,.]+)/i)
  if (stripMatch) {
    stripPrice = parseFloat(stripMatch[1].replace(/,/g, ''))
  }

  // 3. Grid pack size: (10 x 10: ৳ 500.00) or (2 x 5: ৳ 90.00) or (12 x 4: ৳ 384.00)
  const packGridMatch = html.match(/\((\d+)\s*x\s*(\d+)(?:\s*x\s*(\d+))?:\s*৳\s*([\d,.]+)\)/i)
  if (packGridMatch) {
    stripsPerBox = parseInt(packGridMatch[1], 10)
    unitsPerStrip = parseInt(packGridMatch[2], 10)
    boxPrice = parseFloat(packGridMatch[4].replace(/,/g, ''))
    packDescription = `${stripsPerBox} x ${unitsPerStrip}`
    gridMatched = true
  }

  // 4. Pack Count: (30's pack: ৳ 240.00) or (100's pack: ৳ 800.00)
  if (!gridMatched) {
    const packCountMatch = html.match(/\((\d+)(?:&#039;|'|’)?s pack:\s*৳\s*([\d,.]+)\)/i)
    if (packCountMatch) {
      const totalCount = parseInt(packCountMatch[1], 10)
      boxPrice = parseFloat(packCountMatch[2].replace(/,/g, ''))
      packDescription = `${totalCount}'s pack`
      countMatched = true
      if (totalCount >= 10 && totalCount % 10 === 0) {
        unitsPerStrip = 10
        stripsPerBox = totalCount / 10
      } else {
        unitsPerStrip = totalCount
        stripsPerBox = 1
      }
    }
  }

  // 5. Liquids, Drops, Creams, Injections, Kits
  // e.g. "100 ml bottle: ৳ 40.00", "15 gm tube: ৳ 55.00", "(1+4) tablet kit: ৳ 300.00", "1 vial: ৳ 180.00"
  if (!gridMatched && !countMatched) {
    const bottleMatch = html.match(
      /<span[^>]*style="[^"]*#3a5571[^"]*"[^>]*>\s*([^\n<]+(?:bottle|tube|kit|vial|injection|ampoule|drop|spray|suspension|syrup|pack|can|jar|sachet|unit|applicator|respule|mdi|dpi|iv|im)[^\n<]*):?\s*<\/span>\s*<span>৳\s*([\d,.]+)/i
    )
    if (bottleMatch) {
      const desc = bottleMatch[1].trim()
      const price = parseFloat(bottleMatch[2].replace(/,/g, ''))
      packDescription = desc
      if (!boxPrice) boxPrice = price
      if (!unitMrp) unitMrp = price
      unitsPerStrip = 1
      stripsPerBox = 1
    }
  }

  // 6. General Fallback for any ৳ price badge
  if (!unitMrp && !stripPrice && !boxPrice) {
    const genericBadge = html.match(
      /<span[^>]*style="[^"]*#3a5571[^"]*"[^>]*>\s*([^\n<:]+):?\s*<\/span>\s*<span>৳\s*([\d,.]+)/i
    )
    if (genericBadge) {
      const desc = genericBadge[1].trim()
      const price = parseFloat(genericBadge[2].replace(/,/g, ''))
      packDescription = desc
      unitMrp = price
      boxPrice = price
      unitsPerStrip = 1
      stripsPerBox = 1
    }
  }

  if (!unitMrp && !stripPrice && !boxPrice) return null

  // Calculate pricing tier relationships
  if (unitMrp && !stripPrice && unitsPerStrip > 1) {
    stripPrice = Math.round(unitMrp * unitsPerStrip * 100) / 100
  }
  if (stripPrice && !unitMrp && unitsPerStrip > 0) {
    unitMrp = Math.round((stripPrice / unitsPerStrip) * 100) / 100
  }
  if (boxPrice && !unitMrp && unitsPerStrip * stripsPerBox > 0) {
    unitMrp = Math.round((boxPrice / (unitsPerStrip * stripsPerBox)) * 100) / 100
  }
  if (!boxPrice && stripPrice && stripsPerBox) {
    boxPrice = Math.round(stripPrice * stripsPerBox * 100) / 100
  }
  if (!boxPrice && unitMrp) {
    boxPrice = Math.round(unitMrp * unitsPerStrip * stripsPerBox * 100) / 100
  }
  if (!stripPrice && unitMrp) {
    stripPrice = Math.round(unitMrp * unitsPerStrip * 100) / 100
  }

  const unitsPerBox = unitsPerStrip * stripsPerBox
  // Bangladesh standard wholesale Trade Price (TP = MRP × 0.88, 12% discount)
  const tradePrice = unitMrp ? Math.round(unitMrp * 0.88 * 100) / 100 : null
  const tradeBoxPrice = boxPrice ? Math.round(boxPrice * 0.88 * 100) / 100 : null

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

async function runPriceCollector() {
  const args = process.argv.slice(2)
  const isAll = args.includes('--all')
  const limitArg = args.find((a) => a.startsWith('--limit='))
  const maxLimit = limitArg ? parseInt(limitArg.split('=')[1], 10) : isAll ? 26000 : 1200

  console.log('=================================================================')
  console.log('🌐 INDUSTRIAL MEDEX PRODUCT PRICE COLLECTOR & SYNCHRONIZER')
  console.log('=================================================================\n')

  if (!fs.existsSync(MEDEX_JSON)) {
    console.error('Dataset not found in data/medex-medicines.json')
    return
  }

  const raw = JSON.parse(fs.readFileSync(MEDEX_JSON, 'utf8'))
  const allMeds = raw.medicines || []
  console.log(`Loaded ${allMeds.length} medicine catalog URLs from Medex dataset.`)

  // Load existing collected prices cache
  let collectedPrices = {}
  if (fs.existsSync(COLLECTED_PRICES_JSON)) {
    try {
      collectedPrices = JSON.parse(fs.readFileSync(COLLECTED_PRICES_JSON, 'utf8'))
      console.log(`Loaded ${Object.keys(collectedPrices).length} previously collected prices from cache.`)
    } catch {
      collectedPrices = {}
    }
  }

  // Load progress
  let processedSet = new Set(Object.keys(collectedPrices))
  if (fs.existsSync(PROGRESS_FILE)) {
    try {
      const saved = JSON.parse(fs.readFileSync(PROGRESS_FILE, 'utf8'))
      if (saved.processedUrls) {
        saved.processedUrls.forEach((u) => processedSet.add(u))
      }
      console.log(`Resuming session: ${processedSet.size} medicines already processed.`)
    } catch {
      // ignore
    }
  }

  // Sort queue: Top priority brands first, then others
  const priorityBrandSet = new Set(PRIORITY_BRANDS.map((b) => b.toLowerCase()))

  const priorityMeds = []
  const regularMeds = []

  for (const m of allMeds) {
    if (!m.url) continue
    if (processedSet.has(m.url) || processedSet.has(m.medexId)) continue

    if (priorityBrandSet.has(m.brandName.toLowerCase())) {
      priorityMeds.push(m)
    } else {
      regularMeds.push(m)
    }
  }

  const queue = [...priorityMeds, ...regularMeds].slice(0, maxLimit)
  console.log(`Prioritized ${priorityMeds.length} essential brand medicines.`)
  console.log(`Total queue size for this run: ${queue.length} items (Limit: ${maxLimit})\n`)

  if (queue.length === 0) {
    console.log('🎉 All items up to date!')
    return
  }

  let successCount = 0
  let noPriceCount = 0
  let errorCount = 0
  const startTime = Date.now()

  // Batch runner
  for (let i = 0; i < queue.length; i += CONCURRENCY) {
    const chunk = queue.slice(i, i + CONCURRENCY)

    await Promise.all(
      chunk.map(async (item) => {
        try {
          const html = await fetchPage(item.url)
          const pricing = parseMedexPricing(html)

          if (pricing && (pricing.mrp || pricing.boxPrice)) {
            // Save to in-memory collected prices cache
            collectedPrices[item.medexId] = {
              brandName: item.brandName,
              strength: item.strength,
              dosageForm: item.dosageForm,
              genericName: item.genericName,
              manufacturer: item.manufacturer,
              url: item.url,
              pricing,
              collectedAt: new Date().toISOString(),
            }

            // Update in SQLite Medicine database
            // 1. Try exact brandName + strength
            const updated = await prisma.medicine.updateMany({
              where: {
                brandName: item.brandName.trim(),
                strength: item.strength ? item.strength.trim() : undefined,
              },
              data: {
                mrp: pricing.mrp,
                stripPrice: pricing.stripPrice,
                boxPrice: pricing.boxPrice,
                tradePrice: pricing.tradePrice,
                tradeBoxPrice: pricing.tradeBoxPrice,
                unitsPerStrip: pricing.unitsPerStrip,
                stripsPerBox: pricing.stripsPerBox,
                unitsPerBox: pricing.unitsPerBox,
                packDescription: pricing.packDescription || undefined,
              },
            })

            // 2. If no record matched with strength, match by brandName alone
            if (updated.count === 0) {
              await prisma.medicine.updateMany({
                where: {
                  brandName: item.brandName.trim(),
                },
                data: {
                  mrp: pricing.mrp,
                  stripPrice: pricing.stripPrice,
                  boxPrice: pricing.boxPrice,
                  tradePrice: pricing.tradePrice,
                  tradeBoxPrice: pricing.tradeBoxPrice,
                  unitsPerStrip: pricing.unitsPerStrip,
                  stripsPerBox: pricing.stripsPerBox,
                  unitsPerBox: pricing.unitsPerBox,
                  packDescription: pricing.packDescription || undefined,
                },
              })
            }

            successCount++
          } else {
            noPriceCount++
          }
          processedSet.add(item.url)
          processedSet.add(item.medexId)
        } catch (err) {
          errorCount++
        }
      })
    )

    // Polite delay between batches
    await new Promise((resolve) => setTimeout(resolve, BATCH_DELAY_MS))

    const processedTotal = i + chunk.length
    if (processedTotal % 60 === 0 || processedTotal >= queue.length) {
      const elapsedSec = Math.round((Date.now() - startTime) / 1000)
      const rate = elapsedSec > 0 ? (processedTotal / elapsedSec).toFixed(1) : 0
      console.log(
        `[${processedTotal}/${queue.length}] ${Math.round((processedTotal / queue.length) * 100)}% | ` +
          `Collected: ${successCount} | No Price: ${noPriceCount} | Speed: ${rate} req/s | Time: ${elapsedSec}s`
      )

      // Persist cache and progress periodically
      fs.writeFileSync(COLLECTED_PRICES_JSON, JSON.stringify(collectedPrices, null, 2))
      fs.writeFileSync(
        PROGRESS_FILE,
        JSON.stringify(
          {
            totalProcessed: processedSet.size,
            totalCollected: Object.keys(collectedPrices).length,
            processedUrls: Array.from(processedSet),
            lastUpdated: new Date().toISOString(),
          },
          null,
          2
        )
      )
    }
  }

  // Final write
  fs.writeFileSync(COLLECTED_PRICES_JSON, JSON.stringify(collectedPrices, null, 2))

  const totalTimeSec = ((Date.now() - startTime) / 1000).toFixed(1)
  console.log('\n=================================================================')
  console.log(`✅ COLLECTION FINISHED in ${totalTimeSec} seconds!`)
  console.log(`  • New Prices Collected & Synced to DB: ${successCount}`)
  console.log(`  • Unpriced / Discontinued on Medex: ${noPriceCount}`)
  console.log(`  • Network Errors: ${errorCount}`)
  console.log(`  • Total in Price Cache: ${Object.keys(collectedPrices).length}`)
  console.log('=================================================================\n')
}

runPriceCollector()
  .catch((e) => {
    console.error('Fatal collector error:', e)
  })
  .finally(async () => {
    await prisma.$disconnect()
  })
