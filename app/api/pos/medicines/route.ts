import { NextRequest, NextResponse } from 'next/server'
import { prisma } from '@/lib/prisma'
import { getCurrentUser } from '@/lib/auth'

// Lightweight select for POS — only fields needed for display & cart
const POS_SELECT = {
  id: true,
  brandName: true,
  genericName: true,
  strength: true,
  dosageForm: true,
  barcode: true,
  mrp: true,
  stripPrice: true,
  boxPrice: true,
  tradePrice: true,
  unitsPerStrip: true,
  stripsPerBox: true,
  manufacturer: { select: { name: true, shortName: true } },
}

export async function GET(req: NextRequest) {
  try {
    const user = await getCurrentUser()
    if (!user) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
    }

    const { searchParams } = new URL(req.url)
    const q = searchParams.get('q')?.trim() || ''
    const barcode = searchParams.get('barcode')?.trim()
    const limit = Math.min(parseInt(searchParams.get('limit') || '25', 10), 50)

    // Exact barcode match first — instant return
    if (barcode) {
      const match = await prisma.medicine.findFirst({
        where: { barcode, isActive: true },
        select: POS_SELECT,
      })
      if (match) {
        return NextResponse.json({ medicines: [match] })
      }
    }

    // OTC quick-access medicines
    const isOtc = searchParams.get('otc') === 'true'
    if (isOtc) {
      const candidates = await prisma.medicine.findMany({
        where: {
          isActive: true,
          dosageForm: { in: ['Tablet', 'Capsule', 'Chewable Tablet'] },
          OR: [
            { brandName: 'Napa Extra' },
            { brandName: 'Napa', strength: '500 mg' },
            { brandName: 'Ace Plus' },
            { brandName: 'Ace', strength: '500 mg' },
            { brandName: 'Seclo', strength: '20 mg' },
            { brandName: 'Sergel', strength: '20 mg' },
            { brandName: 'Monas', strength: '10 mg' },
            { brandName: 'Fexo', strength: '120 mg' },
            { brandName: 'Ceevit', strength: '250 mg' },
            { brandName: 'Almex', strength: '400 mg' },
            { brandName: 'Pantonix', strength: '20 mg' },
            { brandName: 'Coralcal-D' },
          ],
        },
        select: POS_SELECT,
        orderBy: [{ brandName: 'asc' }, { mrp: 'desc' }],
      })

      const seen = new Set<string>()
      const uniqueOtc = candidates.filter((m) => {
        const key = `${m.brandName.toLowerCase().trim()}|${m.strength.toLowerCase().trim()}`
        if (seen.has(key)) return false
        seen.add(key)
        return true
      })

      return NextResponse.json({ medicines: uniqueOtc })
    }

    if (!q || q.length < 2) {
      // Return high-demand / frequent medicines
      const defaultMeds = await prisma.medicine.findMany({
        take: limit,
        where: {
          isActive: true,
          OR: [
            { brandName: { startsWith: 'Napa' } },
            { brandName: { startsWith: 'Seclo' } },
            { brandName: { startsWith: 'Monas' } },
            { brandName: { startsWith: 'Fexo' } },
            { brandName: { startsWith: 'Ceevit' } },
            { brandName: { startsWith: 'Maxpro' } },
          ],
        },
        select: POS_SELECT,
        orderBy: { brandName: 'asc' },
      })
      return NextResponse.json({ medicines: defaultMeds })
    }

    // Smart search: detect multi-word queries (e.g. "napa 500", "seclo 20")
    const words = q.toLowerCase().split(/\s+/).filter(Boolean)
    const primaryTerm = words[0]
    const secondaryTerms = words.slice(1)

    // Build search conditions — fetch more candidates for re-ranking
    const fetchLimit = Math.min(limit * 3, 75)

    // Strategy: two-phase search for accuracy
    // Phase 1: startsWith on brandName (fastest, most relevant)
    // Phase 2: contains fallback on brand, generic, keywords
    const [startsWithResults, containsResults] = await Promise.all([
      prisma.medicine.findMany({
        take: fetchLimit,
        where: {
          isActive: true,
          brandName: { startsWith: primaryTerm },
        },
        select: POS_SELECT,
        orderBy: { brandName: 'asc' },
      }),
      prisma.medicine.findMany({
        take: fetchLimit,
        where: {
          isActive: true,
          OR: [
            { brandName: { contains: primaryTerm } },
            { genericName: { contains: primaryTerm } },
            { barcode: { equals: q } },
            { searchKeywords: { contains: primaryTerm } },
          ],
          // Exclude startsWith results (they're already in phase 1)
          NOT: { brandName: { startsWith: primaryTerm } },
        },
        select: POS_SELECT,
        orderBy: { brandName: 'asc' },
      }),
    ])

    // Merge and deduplicate
    const seenIds = new Set<string>()
    const allResults: typeof startsWithResults = []

    for (const med of [...startsWithResults, ...containsResults]) {
      if (seenIds.has(med.id)) continue
      seenIds.add(med.id)

      // If multi-word query, filter by secondary terms (strength, generic, etc.)
      if (secondaryTerms.length > 0) {
        const searchable = `${med.brandName} ${med.strength} ${med.genericName} ${med.dosageForm}`.toLowerCase()
        const allMatch = secondaryTerms.every((t) => searchable.includes(t))
        if (!allMatch) continue
      }

      allResults.push(med)
    }

    // Relevance scoring for final sort
    const scored = allResults.map((med) => {
      let score = 0
      const bn = med.brandName.toLowerCase()

      // Exact brand name match — top priority
      if (bn === primaryTerm) score += 100
      // Brand starts with query
      else if (bn.startsWith(primaryTerm)) score += 50
      // Brand contains query
      else if (bn.includes(primaryTerm)) score += 20
      // Generic name match — lower priority
      else score += 5

      // Bonus: has MRP (priced items are more useful)
      if (med.mrp && med.mrp > 0) score += 3

      // Bonus: common dosage forms rank higher
      const df = med.dosageForm.toLowerCase()
      if (df === 'tablet' || df === 'capsule') score += 2
      else if (df === 'syrup' || df === 'suspension') score += 1

      return { med, score }
    })

    // Sort by score descending, then alphabetically
    scored.sort((a, b) => {
      if (b.score !== a.score) return b.score - a.score
      return a.med.brandName.localeCompare(b.med.brandName)
    })

    const medicines = scored.slice(0, limit).map((s) => s.med)

    return NextResponse.json({ medicines })
  } catch (err: any) {
    console.error('POS medicines error:', err)
    return NextResponse.json({ error: err.message || 'Internal server error' }, { status: 500 })
  }
}

