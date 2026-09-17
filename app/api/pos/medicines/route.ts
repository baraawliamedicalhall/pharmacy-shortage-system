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
