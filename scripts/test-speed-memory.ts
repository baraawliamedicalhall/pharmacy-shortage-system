import { prisma } from '../lib/prisma'

async function benchmark() {
  const tLoad0 = performance.now()
  const allMeds = await prisma.medicine.findMany({
    where: { isActive: true },
    include: { manufacturer: { select: { name: true, shortName: true } } },
  })
  console.log(`Loaded ${allMeds.length} records into memory in ${(performance.now() - tLoad0).toFixed(1)}ms`)

  const testTerms = ['napa', 'napa 500', 'seclo', 'square seclo', 'paracetamol', 'fexo', 'monas 10', 'beximco']
  for (const term of testTerms) {
    const t0 = performance.now()
    const tokens = term.toLowerCase().split(/\s+/).filter(Boolean)
    const matches: any[] = []

    for (let i = 0; i < allMeds.length; i++) {
      const m = allMeds[i]
      const brand = m.brandName.toLowerCase()
      const gen = m.genericName.toLowerCase()
      const str = m.strength.toLowerCase()
      const mfg = (m.manufacturer?.name || '').toLowerCase()
      const mfgShort = (m.manufacturer?.shortName || '').toLowerCase()
      const kw = (m.searchKeywords || '').toLowerCase()

      let allMatch = true
      for (const tok of tokens) {
        if (!brand.includes(tok) && !gen.includes(tok) && !str.includes(tok) && !mfg.includes(tok) && !mfgShort.includes(tok) && !kw.includes(tok)) {
          allMatch = false
          break
        }
      }
      if (allMatch) {
        matches.push(m)
        if (matches.length >= 30) break
      }
    }
    const elapsed = (performance.now() - t0).toFixed(2)
    console.log(`Term "${term}": ${matches.length} matches in ${elapsed}ms! Sample: ${matches[0]?.brandName} ${matches[0]?.strength} (${matches[0]?.manufacturer?.name})`)
  }
}

benchmark().catch(console.error).finally(() => prisma.$disconnect())
