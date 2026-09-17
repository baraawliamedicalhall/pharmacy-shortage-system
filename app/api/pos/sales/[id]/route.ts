import { NextRequest, NextResponse } from 'next/server'
import { prisma } from '@/lib/prisma'
import { getCurrentUser } from '@/lib/auth'

export async function GET(
  req: NextRequest,
  context: { params: Promise<{ id: string }> }
) {
  try {
    const user = await getCurrentUser()
    if (!user) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
    }

    const { id } = await context.params
    const sale = await prisma.sale.findUnique({
      where: { id },
      include: {
        soldBy: {
          select: { name: true, employeeId: true },
        },
        items: {
          include: {
            medicine: {
              select: {
                brandName: true,
                strength: true,
                dosageForm: true,
                manufacturer: { select: { name: true, shortName: true } },
              },
            },
          },
        },
      },
    })

    if (!sale) {
      return NextResponse.json({ error: 'Sale record not found' }, { status: 404 })
    }

    return NextResponse.json({ sale })
  } catch (err: any) {
    return NextResponse.json({ error: err.message || 'Internal error' }, { status: 500 })
  }
}
