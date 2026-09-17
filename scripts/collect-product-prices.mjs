import fs from 'fs'
import path from 'path'
import { PrismaClient } from '@prisma/client'

const prisma = new PrismaClient()
const DATA_DIR = path.join(process.cwd(), 'data')
const MEDEX_JSON = path.join(DATA_DIR, 'medex-medicines.json')
const PROGRESS_FILE = path.join(DATA_DIR, 'price-collector-progress.json')

const CONCURRENCY = 6
const USER_AGENT =
  'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/120.0.0.0 Safari/537.36'

async function fetchPage(url, retries = 2) {
  for (let attempt = 1; attempt <= retries; attempt++) {
    try {
      const res = await fetch(url, {
        headers: {
          'User-Agent': USER_AGENT,
          Accept: 'text/html,application/xhtml+xml,application/xml;q=0.9,*/*;q=0.8',
        },
      })
      if (!res.ok) throw new Error(`HTTP ${res.status}`)
      return await res.text()
    } catch (err) {
      if (attempt === retries) return null
      await new Promise((resolve) => setTimeout(resolve, attempt * 500))
    }
  }
  return null
}

function parsePricingFromHtml(html) {
  if (!html) return null

  // Extract Unit Price: ৳ 5.00
  let unitMrp = null
  const unitMatch = html.match(/Unit Price:\s*<\/span>\s*<span>৳\s*([\d,.]+)/i)
  if (unitMatch) {
    unitMrp = parseFloat(unitMatch[1].replace(/,/g, ''))
  }

  // Extract Strip Price: ৳ 50.00
  let stripPrice = null
  const stripMatch = html.match(/Strip Price:[\s\S]*?৳\s*([\d,.]+)/i)
  if (stripMatch) {
    stripPrice = parseFloat(stripMatch[1].replace(/,/g, ''))
  }

  // Extract Pack size: (10 x 10: ৳ 500.00)
  let boxPrice = null
  let stripsPerBox = 10
  let unitsPerStrip = 10

  const packMatch = html.match(/\((\d+)\s*x\s*(\d+)(?:\s*x\s*(\d+))?:\s*৳\s*([\d,.]+)\)/i)
  if (packMatch) {
    stripsPerBox = parseInt(packMatch[1], 10)
    unitsPerStrip = parseInt(packMatch[2], 10)
    boxPrice = parseFloat(packMatch[4].replace(/,/g, ''))
  }

  if (!unitMrp && !stripPrice && !boxPrice) return null

  if (unitMrp && !stripPrice && unitsPerStrip) {
    stripPrice = Math.round(unitMrp * unitsPerStrip * 100) / 100
  }
  if (stripPrice && !boxPrice && stripsPerBox) {
    boxPrice = Math.round(stripPrice * stripsPerBox * 100) / 100
  }
  if (!unitMrp && stripPrice && unitsPerStrip) {
    unitMrp = Math.round((stripPrice / unitsPerStrip) * 100) / 100
  }

  const unitsPerBox = unitsPerStrip * stripsPerBox
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
  }
}

async function runPriceCollector() {
  console.log('====================================================')
  console.log('🌐 MEDEX LIVE PRODUCT PRICE SCRAPER & COLLECTOR')
  console.log('====================================================\n')

  if (!fs.existsSync(MEDEX_JSON)) {
    console.error('Medex dataset not found in data/medex-medicines.json')
    return
  }

  const data = JSON.parse(fs.readFileSync(MEDEX_JSON, 'utf8'))
  const medicines = data.medicines || []
  console.log(`Loaded ${medicines.length} medicine URLs from dataset.`)

  let processedSet = new Set()
  if (fs.existsSync(PROGRESS_FILE)) {
    try {
      const saved = JSON.parse(fs.readFileSync(PROGRESS_FILE, 'utf8'))
      processedSet = new Set(saved.processed || [])
      console.log(`Resuming from previous progress: ${processedSet.size} already scraped.`)
    } catch {
      // ignore
    }
  }

  const pending = medicines.filter((m) => m.url && !processedSet.has(m.url))
  console.log(`Remaining medicines to scrape: ${pending.length}\n`)

  let successCount = 0
  let failCount = 0

  // Batch runner
  for (let i = 0; i < pending.length; i += CONCURRENCY) {
    const chunk = pending.slice(i, i + CONCURRENCY)
    await Promise.all(
      chunk.map(async (item) => {
        try {
          const html = await fetchPage(item.url)
          const pricing = parsePricingFromHtml(html)
          if (pricing) {
            // Update in DB by brandName and manufacturer
            await prisma.medicine.updateMany({
              where: {
                brandName: item.brandName,
                strength: item.strength,
              },
              data: pricing,
            })
            successCount++
          } else {
            failCount++
          }
          processedSet.add(item.url)
        } catch (e) {
          failCount++
        }
      })
    )

    if ((i + CONCURRENCY) % 60 === 0 || i + CONCURRENCY >= pending.length) {
      console.log(`Progress: ${processedSet.size}/${medicines.length} (Collected: ${successCount}, No price found: ${failCount})`)
      fs.writeFileSync(
        PROGRESS_FILE,
        JSON.stringify({ processed: Array.from(processedSet), lastUpdated: new Date().toISOString() })
      )
    }
  }

  console.log('\n====================================================')
  console.log(`✅ Scraping complete! Collected: ${successCount} prices`)
  console.log('====================================================')
}

runPriceCollector()
  .catch(console.error)
  .finally(async () => {
    await prisma.$disconnect()
  })
