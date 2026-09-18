import { NextRequest, NextResponse } from 'next/server'
import { prisma } from '@/lib/prisma'
import { getCurrentUser } from '@/lib/auth'

export async function GET(req: NextRequest) {
  try {
    const user = await getCurrentUser()
    if (!user) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
    }

    const { searchParams } = new URL(req.url)
    const q = searchParams.get('q')?.trim().toLowerCase() || ''
    const barcode = searchParams.get('barcode')?.trim()
    const limit = Math.min(parseInt(searchParams.get('limit') || '25', 10), 50)

    // Exact barcode match first
    if (barcode) {
      const match = await prisma.medicine.findFirst({
        where: { barcode, isActive: true },
        include: {
          manufacturer: { select: { name: true, shortName: true } },
        },
      })
      if (match) {
        return NextResponse.json({ medicines: [match] })
      }
    }

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
        include: {
          manufacturer: { select: { name: true, shortName: true } },
        },
        orderBy: [{ brandName: 'asc' }, { mrp: 'desc' }],
      })

      // Deduplicate so each distinct brand & strength gets 1 primary record
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
        include: {
          manufacturer: { select: { name: true, shortName: true } },
        },
        orderBy: { brandName: 'asc' },
      })
      return NextResponse.json({ medicines: defaultMeds })
    }

    const medicines = await prisma.medicine.findMany({
      take: limit,
      where: {
        isActive: true,
        OR: [
          { brandName: { contains: q } },
          { genericName: { contains: q } },
          { barcode: { equals: q } },
          { searchKeywords: { contains: q } },
        ],
      },
      include: {
        manufacturer: { select: { name: true, shortName: true } },
      },
      orderBy: { brandName: 'asc' },
    })

    return NextResponse.json({ medicines })
  } catch (err: any) {
    console.error('POS medicines error:', err)
    return NextResponse.json({ error: err.message || 'Internal server error' }, { status: 500 })
  }
}
