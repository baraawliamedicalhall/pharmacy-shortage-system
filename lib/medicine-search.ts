import { prisma } from './prisma'

export interface SearchableMedicine {
  id: string
  brandName: string
  genericName: string
  strength: string
  dosageForm: string
  manufacturerId: string
  packDescription: string | null
  purchaseUnit: string | null
  retailUnit: string | null
  searchKeywords: string | null
  barcode: string | null
  isActive: boolean
  manufacturer?: {
    id: string
    name: string
    shortName: string | null
  }
  // Pre-lowercased fields for ultra-fast matching
  _brandLower: string
  _genericLower: string
  _strengthLower: string
  _mfgLower: string
  _mfgShortLower: string
  _kwLower: string
}

let medicineIndex: SearchableMedicine[] | null = null
let isIndexing = false
let lastIndexedAt = 0

export async function getMedicineIndex(): Promise<SearchableMedicine[]> {
  const now = Date.now()
  // Cache for 10 minutes in memory, or reload if null
  if (medicineIndex && now - lastIndexedAt < 10 * 60 * 1000) {
    return medicineIndex
  }

  if (isIndexing && medicineIndex) {
    return medicineIndex
  }

  isIndexing = true
  try {
    const records = await prisma.medicine.findMany({
      where: { isActive: true },
      include: {
        manufacturer: {
          select: { id: true, name: true, shortName: true },
        },
      },
    })

    medicineIndex = records.map((m) => ({
      ...m,
      _brandLower: m.brandName.toLowerCase(),
      _genericLower: m.genericName.toLowerCase(),
      _strengthLower: m.strength.toLowerCase(),
      _mfgLower: (m.manufacturer?.name || '').toLowerCase(),
      _mfgShortLower: (m.manufacturer?.shortName || '').toLowerCase(),
      _kwLower: (m.searchKeywords || '').toLowerCase(),
    }))

    lastIndexedAt = Date.now()
    return medicineIndex
  } finally {
    isIndexing = false
  }
}

export function invalidateMedicineIndex() {
  medicineIndex = null
  lastIndexedAt = 0
}

export async function fastSearchMedicines(query: string, limit = 30): Promise<SearchableMedicine[]> {
  const index = await getMedicineIndex()
  const q = query.trim().toLowerCase()
  if (!q) {
    // Return top popular / default medicines
    return index.slice(0, limit)
  }

  const tokens = q.split(/\s+/).filter(Boolean)
  const results: Array<{ med: SearchableMedicine; score: number }> = []

  for (let i = 0; i < index.length; i++) {
    const med = index[i]
    let score = 0
    let allTokensMatch = true

    for (const token of tokens) {
      let tokenMatch = false

      // Exact brand match
      if (med._brandLower === token) {
        score += 600
        tokenMatch = true
      } else if (med._brandLower.startsWith(token)) {
        score += 350
        tokenMatch = true
      } else if (med._brandLower.includes(token)) {
        score += 150
        tokenMatch = true
      }

      // Strength match (e.g. 500, 20, 10)
      if (med._strengthLower.includes(token)) {
        score += 200
        tokenMatch = true
      }

      // Generic match
      if (med._genericLower === token) {
        score += 250
        tokenMatch = true
      } else if (med._genericLower.startsWith(token)) {
        score += 120
        tokenMatch = true
      } else if (med._genericLower.includes(token)) {
        score += 60
        tokenMatch = true
      }

      // Manufacturer match (e.g. square, beximco)
      if (med._mfgShortLower === token || med._mfgLower.startsWith(token)) {
        score += 80
        tokenMatch = true
      } else if (med._mfgLower.includes(token)) {
        score += 40
        tokenMatch = true
      }

      // Keywords match
      if (med._kwLower.includes(token)) {
        score += 50
        tokenMatch = true
      }

      if (!tokenMatch) {
        allTokensMatch = false
        break
      }
    }

    if (allTokensMatch && score > 0) {
      // Bonus if brand name starts with the entire raw query
      if (med._brandLower.startsWith(q)) {
        score += 500
      }
      results.push({ med, score })
    }
  }

  // Sort by highest score first, then shorter brand name, then alphabetical
  results.sort((a, b) => {
    if (b.score !== a.score) {
      return b.score - a.score
    }
    if (a.med.brandName.length !== b.med.brandName.length) {
      return a.med.brandName.length - b.med.brandName.length
    }
    return a.med.brandName.localeCompare(b.med.brandName)
  })

  return results.slice(0, limit).map((r) => r.med)
}
