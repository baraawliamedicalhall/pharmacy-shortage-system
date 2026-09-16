import { NextRequest, NextResponse } from 'next/server'
import { prisma } from '@/lib/prisma'
import { getCurrentUser } from '@/lib/auth'
import { medicineSchema } from '@/lib/validations'
import { Role } from '@prisma/client'
import { createAuditLog } from '@/lib/audit'
import { invalidateMedicineIndex } from '@/lib/medicine-search'


export async function GET(req: NextRequest) {
  try {
    const user = await getCurrentUser()
    if (!user || user.role !== Role.ADMIN) {
      return NextResponse.json({ error: 'Admin access required' }, { status: 403 })
    }

    const { searchParams } = new URL(req.url)
    const q = (searchParams.get('q') || '').trim()
    const mfgId = searchParams.get('mfgId')
    const page = Math.max(1, parseInt(searchParams.get('page') || '1', 10))
    const limit = Math.max(1, Math.min(250, parseInt(searchParams.get('limit') || '50', 10)))
    const skip = (page - 1) * limit

    const where: any = {}

    if (mfgId) {
      where.manufacturerId = mfgId
    }

    if (q) {
      where.OR = [
        { brandName: { contains: q } },
        { genericName: { contains: q } },
        { strength: { contains: q } },
        { searchKeywords: { contains: q } },
      ]
    }

    const [totalOverall, total, medicines] = await Promise.all([
      prisma.medicine.count(),
      prisma.medicine.count({ where }),
      prisma.medicine.findMany({
        where,
        include: {
          manufacturer: {
            select: { id: true, name: true, shortName: true },
          },
        },
        orderBy: [{ brandName: 'asc' }, { strength: 'asc' }],
        skip,
        take: limit,
      }),
    ])

    return NextResponse.json({
      medicines,
      pagination: {
        page,
        limit,
        total,
        totalOverall,
        totalPages: Math.ceil(total / limit),
      },
    })
  } catch (error) {
    console.error('Admin medicines GET error:', error)
    return NextResponse.json({ error: 'Failed to fetch medicines' }, { status: 500 })
  }
}

export async function POST(req: NextRequest) {
  try {
    const user = await getCurrentUser()
    if (!user || user.role !== Role.ADMIN) {
      return NextResponse.json({ error: 'Admin access required' }, { status: 403 })
    }

    const body = await req.json()
    const validation = medicineSchema.safeParse(body)

    if (!validation.success) {
      const issue = validation.error.issues[0]
      return NextResponse.json({ error: issue.message }, { status: 400 })
    }

    const data = validation.data

    const created = await prisma.medicine.create({
      data: {
        brandName: data.brandName,
        genericName: data.genericName,
        strength: data.strength,
        dosageForm: data.dosageForm,
        manufacturerId: data.manufacturerId,
        packDescription: data.packDescription ?? null,
        purchaseUnit: data.purchaseUnit || 'Box',
        retailUnit: data.retailUnit || 'Tablet',
        searchKeywords: data.searchKeywords ?? null,
        barcode: data.barcode ?? null,
        isActive: data.isActive,
      },
      include: {
        manufacturer: true,
      },
    })

    invalidateMedicineIndex()

    await createAuditLog('MEDICINE_CREATED', {

      userId: user.userId,
      details: `Created medicine: ${created.brandName} ${created.strength} (${created.dosageForm})`,
    })

    return NextResponse.json({ success: true, medicine: created })
  } catch (error) {
    console.error('Admin medicine POST error:', error)
    return NextResponse.json({ error: 'Failed to create medicine' }, { status: 500 })
  }
}
