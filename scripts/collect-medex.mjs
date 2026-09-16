import fs from 'fs'
import path from 'path'

const ALPHABET = 'abcdefghijklmnopqrstuvwxyz'.split('')
const CONCURRENCY = 8
const DATA_DIR = path.join(process.cwd(), 'data')
const JSON_OUTPUT = path.join(DATA_DIR, 'medex-medicines.json')
const CSV_OUTPUT = path.join(DATA_DIR, 'medex-medicines.csv')

function decodeHtml(html) {
  if (!html) return ''
  return html
    .replace(/&amp;/g, '&')
    .replace(/&quot;/g, '"')
    .replace(/&#039;/g, "'")
    .replace(/&apos;/g, "'")
    .replace(/&lt;/g, '<')
    .replace(/&gt;/g, '>')
    .replace(/&nbsp;/g, ' ')
    .trim()
}

async function fetchPage(url, retries = 3) {
  for (let attempt = 1; attempt <= retries; attempt++) {
    try {
      const res = await fetch(url, {
        headers: {
          'User-Agent':
            'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/120.0.0.0 Safari/537.36',
          Accept:
            'text/html,application/xhtml+xml,application/xml;q=0.9,image/avif,image/webp,*/*;q=0.8',
          'Accept-Language': 'en-US,en;q=0.9',
        },
      })
      if (!res.ok) throw new Error(`HTTP ${res.status}`)
      return await res.text()
    } catch (err) {
      if (attempt === retries) throw err
      await new Promise((resolve) => setTimeout(resolve, attempt * 500))
    }
  }
}

function getMaxPage(html) {
  const matches = [...html.matchAll(/page=(\d+)/g)]
  if (matches.length === 0) return 1
  const pageNums = matches.map((m) => parseInt(m[1], 10)).filter((n) => !isNaN(n))
  return Math.max(...pageNums, 1)
}

function parseCards(html) {
  // Regex to extract cards
  const regex =
    /<a href="([^"]+)" class="brand-card">[\s\S]*?<img[^>]*alt='([^']*)'[^>]*class='dosage-icon'[\s\S]*?<span class="brand-card__name">([^<]+)<\/span>[\s\S]*?<div class="brand-card__strength">([^<]*)<\/div>[\s\S]*?<div class="brand-card__generic">([^<]*)<\/div>[\s\S]*?<div class="brand-card__company">([^<]*)<\/div>/g

  const medicines = []
  let match
  while ((match = regex.exec(html)) !== null) {
    const url = match[1].trim()
    const idMatch = url.match(/brands\/(\d+)\//)
    const medexId = idMatch ? idMatch[1] : null

    const brandName = decodeHtml(match[3])
    const strength = decodeHtml(match[4])
    const dosageForm = decodeHtml(match[2]) || 'Tablet'
    const genericName = decodeHtml(match[5])
    const manufacturer = decodeHtml(match[6])

    if (brandName && genericName && manufacturer) {
      medicines.push({
        medexId,
        brandName,
        strength: strength || 'N/A',
        dosageForm,
        genericName,
        manufacturer,
        url,
      })
    }
  }
  return medicines
}

// Concurrency pool runner
async function asyncPool(limit, items, iteratorFn) {
  const results = []
  const executing = new Set()

  for (const item of items) {
    const p = Promise.resolve().then(() => iteratorFn(item))
    results.push(p)
    executing.add(p)

    const clean = () => executing.delete(p)
    p.then(clean).catch(clean)

    if (executing.size >= limit) {
      await Promise.race(executing)
    }
  }

  return Promise.all(results)
}

async function collectAllMedicines() {
  console.log('====================================================')
  console.log('🌐 COLLECTING ALL MEDICINES FROM HTTPS://MEDEX.COM.BD')
  console.log('====================================================\n')

  if (!fs.existsSync(DATA_DIR)) {
    fs.mkdirSync(DATA_DIR, { recursive: true })
  }

  const allMedicines = []
  const uniqueKeys = new Set()
  const startTime = Date.now()

  // 1. Build list of all letter tasks
  console.log('Phase 1: Discovering total pages across alphabet A-Z...')
  const tasks = []

  for (const letter of ALPHABET) {
    try {
      const page1Html = await fetchPage(`https://medex.com.bd/brands?alpha=${letter}&page=1`)
      const maxPage = getMaxPage(page1Html)

      // Also parse page 1 immediately
      const page1Cards = parseCards(page1Html)
      for (const card of page1Cards) {
        const key = `${card.brandName}|${card.strength}|${card.dosageForm}|${card.manufacturer}`.toLowerCase()
        if (!uniqueKeys.has(key)) {
          uniqueKeys.add(key)
          allMedicines.push(card)
        }
      }

      console.log(`✓ Letter [${letter.toUpperCase()}]: ${maxPage} pages (Page 1 parsed: ${page1Cards.length} items)`)

      // Queue pages 2 through maxPage
      for (let p = 2; p <= maxPage; p++) {
        tasks.push({ letter, page: p })
      }
    } catch (err) {
      console.error(`❌ Failed to init letter ${letter}:`, err.message)
    }
  }

  console.log(`\nPhase 2: Scraping ${tasks.length} remaining pages with concurrency = ${CONCURRENCY}...`)

  let completedTasks = 0
  const totalTasks = tasks.length

  await asyncPool(CONCURRENCY, tasks, async ({ letter, page }) => {
    try {
      const url = `https://medex.com.bd/brands?alpha=${letter}&page=${page}`
      const html = await fetchPage(url)
      const cards = parseCards(html)

      for (const card of cards) {
        const key = `${card.brandName}|${card.strength}|${card.dosageForm}|${card.manufacturer}`.toLowerCase()
        if (!uniqueKeys.has(key)) {
          uniqueKeys.add(key)
          allMedicines.push(card)
        }
      }

      completedTasks++
      if (completedTasks % 25 === 0 || completedTasks === totalTasks) {
        const elapsedSec = ((Date.now() - startTime) / 1000).toFixed(1)
        console.log(
          `Progress: ${completedTasks}/${totalTasks} pages (${((completedTasks / totalTasks) * 100).toFixed(1)}%) | Medicines: ${allMedicines.length} | Elapsed: ${elapsedSec}s`
        )
      }
    } catch (err) {
      console.error(`Warning: Failed to fetch ${letter} page ${page}:`, err.message)
    }
  })

  const totalTime = ((Date.now() - startTime) / 1000).toFixed(1)
  console.log('\n====================================================')
  console.log(`✓ FINISHED COLLECTION IN ${totalTime}s`)
  console.log(`✓ Total Unique Medicines Collected: ${allMedicines.length}`)
  console.log('====================================================\n')

  // 3. Save JSON output
  fs.writeFileSync(
    JSON_OUTPUT,
    JSON.stringify(
      {
        source: 'https://medex.com.bd/',
        collectedAt: new Date().toISOString(),
        totalCount: allMedicines.length,
        medicines: allMedicines,
      },
      null,
      2
    )
  )
  console.log(`✓ Saved JSON to: ${JSON_OUTPUT}`)

  // 4. Export clean CSV ready for system import
  const csvHeaders = 'brand_name,generic_name,strength,dosage_form,manufacturer,search_keywords\n'
  const csvRows = allMedicines
    .map((m) => {
      const b = `"${m.brandName.replace(/"/g, '""')}"`
      const g = `"${m.genericName.replace(/"/g, '""')}"`
      const s = `"${m.strength.replace(/"/g, '""')}"`
      const d = `"${m.dosageForm.replace(/"/g, '""')}"`
      const c = `"${m.manufacturer.replace(/"/g, '""')}"`
      const kw = `"${(m.brandName + ' ' + m.genericName).toLowerCase().replace(/"/g, '""')}"`
      return `${b},${g},${s},${d},${c},${kw}`
    })
    .join('\n')

  fs.writeFileSync(CSV_OUTPUT, csvHeaders + csvRows)
  console.log(`✓ Saved CSV to: ${CSV_OUTPUT}`)
}

collectAllMedicines().catch((err) => {
  console.error('Fatal collection error:', err)
  process.exit(1)
})
