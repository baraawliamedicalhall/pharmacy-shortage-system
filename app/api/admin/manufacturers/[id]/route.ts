import { NextRequest, NextResponse } from 'next/server'
import { prisma } from '@/lib/prisma'
import { getCurrentUser } from '@/lib/auth'
import { manufacturerSchema } from '@/lib/validations'
import { Role } from '@prisma/client'
import { createAuditLog } from '@/lib/audit'

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
    const validation = manufacturerSchema.safeParse(body)

    if (!validation.success) {
      const issue = validation.error.issues[0]
      return NextResponse.json({ error: issue.message }, { status: 400 })
    }

    const data = validation.data

    const updated = await prisma.manufacturer.update({
      where: { id },
      data: {
        name: data.name,
        shortName: data.shortName || null,
        isActive: data.isActive,
      },
    })

    await createAuditLog('MANUFACTURER_UPDATED', {
      userId: user.userId,
      details: `Updated manufacturer: ${updated.name}`,
    })

    return NextResponse.json({ success: true, manufacturer: updated })
  } catch (error) {
    console.error('Update manufacturer error:', error)
    return NextResponse.json({ error: 'Failed to update manufacturer' }, { status: 500 })
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

    const mfg = await prisma.manufacturer.findUnique({
      where: { id },
      include: { _count: { select: { medicines: true } } },
    })

    if (!mfg) {
      return NextResponse.json({ error: 'Manufacturer not found' }, { status: 404 })
    }

    if (mfg._count.medicines > 0) {
      // Deactivate rather than cascading delete
      await prisma.manufacturer.update({
        where: { id },
        data: { isActive: false },
      })
      return NextResponse.json({
        success: true,
        message: 'Manufacturer has linked medicines; marked as inactive.',
      })
    }

    await prisma.manufacturer.delete({
      where: { id },
    })

    await createAuditLog('MANUFACTURER_DELETED', {
      userId: user.userId,
      details: `Deleted manufacturer: ${mfg.name}`,
    })

    return NextResponse.json({ success: true, message: 'Manufacturer deleted' })
  } catch (error) {
    console.error('Delete manufacturer error:', error)
    return NextResponse.json({ error: 'Failed to delete manufacturer' }, { status: 500 })
  }
}
