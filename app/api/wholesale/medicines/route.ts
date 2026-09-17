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
    const limit = Math.min(parseInt(searchParams.get('limit') || '30', 10), 100)

    if (!q || q.length < 2) {
      // Return popular medicines as default
      const defaultMeds = await prisma.medicine.findMany({
        take: limit,
        where: { isActive: true },
        include: {
          manufacturer: {
            select: { id: true, name: true, shortName: true },
          },
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
          { searchKeywords: { contains: q } },
        ],
      },
      include: {
        manufacturer: {
          select: { id: true, name: true, shortName: true },
        },
      },
      orderBy: { brandName: 'asc' },
    })

    return NextResponse.json({ medicines })
  } catch (err: any) {
    console.error('Wholesale medicine search error:', err)
    return NextResponse.json({ error: err.message || 'Internal error' }, { status: 500 })
  }
}
