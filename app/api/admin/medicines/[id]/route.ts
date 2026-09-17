import { NextRequest, NextResponse } from 'next/server'
import { prisma } from '@/lib/prisma'
import { getCurrentUser } from '@/lib/auth'
import { medicineSchema } from '@/lib/validations'
import { Role } from '@prisma/client'
import { createAuditLog } from '@/lib/audit'
import { invalidateMedicineIndex } from '@/lib/medicine-search'


export async function PUT(
  req: NextRequest,
  ctx: { params: Promise<{ id: string }> }
) {
  try {
    const user = await getCurrentUser()
    if (!user || user.role !== Role.ADMIN) {
      return NextResponse.json({ error: 'Admin access required' }, { status: 403 })
    }

    const { id } = await ctx.params
    const body = await req.json()
    const validation = medicineSchema.safeParse(body)

    if (!validation.success) {
      const issue = validation.error.issues[0]
      return NextResponse.json({ error: issue.message }, { status: 400 })
    }

    const data = validation.data

    const updated = await prisma.medicine.update({
      where: { id },
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
        mrp: data.mrp ?? null,
        stripPrice: data.stripPrice ?? null,
        boxPrice: data.boxPrice ?? null,
        tradePrice: data.tradePrice ?? null,
        tradeBoxPrice: data.tradeBoxPrice ?? null,
        unitsPerStrip: data.unitsPerStrip ?? 10,
        stripsPerBox: data.stripsPerBox ?? 10,
        unitsPerBox: (data.unitsPerStrip ?? 10) * (data.stripsPerBox ?? 10),
      },
      include: {
        manufacturer: true,
      },
    })

    await createAuditLog('MEDICINE_UPDATED', {
      userId: user.userId,
      details: `Updated medicine: ${updated.brandName} ${updated.strength}`,
    })

    invalidateMedicineIndex()
    return NextResponse.json({ success: true, medicine: updated })

  } catch (error) {
    console.error('Update medicine error:', error)
    return NextResponse.json({ error: 'Failed to update medicine' }, { status: 500 })
  }
}

export async function DELETE(
  _req: NextRequest,
  ctx: { params: Promise<{ id: string }> }
) {
  try {
    const user = await getCurrentUser()
    if (!user || user.role !== Role.ADMIN) {
      return NextResponse.json({ error: 'Admin access required' }, { status: 403 })
    }

    const { id } = await ctx.params

    const medicine = await prisma.medicine.findUnique({
      where: { id },
      include: { _count: { select: { shortages: true } } },
    })

    if (!medicine) {
      return NextResponse.json({ error: 'Medicine not found' }, { status: 404 })
    }

    // If medicine has shortage reports attached, soft delete / deactivate instead of breaking historical shortages
    if (medicine._count.shortages > 0) {
      await prisma.medicine.update({
        where: { id },
        data: { isActive: false },
      })
      return NextResponse.json({
        success: true,
        message: 'Medicine has existing shortage history; deactivated instead of deleted.',
      })
    }

    await prisma.medicine.delete({
      where: { id },
    })

    await createAuditLog('MEDICINE_DELETED', {
      userId: user.userId,
      details: `Deleted medicine: ${medicine.brandName} ${medicine.strength}`,
    })

    invalidateMedicineIndex()
    return NextResponse.json({ success: true, message: 'Medicine deleted successfully' })

  } catch (error) {
    console.error('Delete medicine error:', error)
    return NextResponse.json({ error: 'Failed to delete medicine' }, { status: 500 })
  }
}
