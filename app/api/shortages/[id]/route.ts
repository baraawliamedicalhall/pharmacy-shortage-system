import { NextRequest, NextResponse } from 'next/server'
import { prisma } from '@/lib/prisma'
import { getCurrentUser } from '@/lib/auth'
import { Role, ShortageStatus } from '@prisma/client'

export async function DELETE(
  _req: NextRequest,
  ctx: { params: Promise<{ id: string }> }
) {
  try {
    const user = await getCurrentUser()
    if (!user) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
    }

    const { id } = await ctx.params
    const shortage = await prisma.shortage.findUnique({
      where: { id },
    })

    if (!shortage) {
      return NextResponse.json({ error: 'Shortage record not found' }, { status: 404 })
    }

    // Role check: Employee can only delete their own record from today
    const todayStr = new Date().toISOString().slice(0, 10)
    if (user.role === Role.EMPLOYEE) {
      if (shortage.employeeId !== user.userId) {
        return NextResponse.json({ error: 'You can only delete your own reports' }, { status: 403 })
      }
      if (shortage.reportedDate !== todayStr) {
        return NextResponse.json({ error: 'Employees can only delete reports submitted today' }, { status: 403 })
      }
    }

    await prisma.shortage.delete({
      where: { id },
    })

    return NextResponse.json({ success: true, message: 'Report removed' })
  } catch (error) {
    console.error('Delete shortage error:', error)
    return NextResponse.json({ error: 'Failed to delete shortage record' }, { status: 500 })
  }
}

export async function PATCH(
  req: NextRequest,
  ctx: { params: Promise<{ id: string }> }
) {
  try {
    const user = await getCurrentUser()
    if (!user) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
    }

    const { id } = await ctx.params
    const body = await req.json()

    const shortage = await prisma.shortage.findUnique({
      where: { id },
    })

    if (!shortage) {
      return NextResponse.json({ error: 'Shortage record not found' }, { status: 404 })
    }

    // Role restrictions: Only admin can change status; employee can only update their own notes/quantity
    const updateData: {
      quantity?: number | null
      unit?: string
      notes?: string | null
      status?: ShortageStatus
      reviewedAt?: Date
      reviewedBy?: string
      orderedAt?: Date
      orderedBy?: string
    } = {}

    if (user.role === Role.ADMIN) {
      if (body.status && Object.values(ShortageStatus).includes(body.status)) {
        updateData.status = body.status
        if (body.status === ShortageStatus.REVIEWED) {
          updateData.reviewedAt = new Date()
          updateData.reviewedBy = user.name
        } else if (body.status === ShortageStatus.ORDERED) {
          updateData.orderedAt = new Date()
          updateData.orderedBy = user.name
        }
      }
    }

    if (body.quantity !== undefined) {
      updateData.quantity = body.quantity ? Number(body.quantity) : null
    }
    if (body.unit !== undefined) {
      updateData.unit = String(body.unit)
    }
    if (body.notes !== undefined) {
      updateData.notes = body.notes ? String(body.notes).trim() : null
    }

    const updated = await prisma.shortage.update({
      where: { id },
      data: updateData,
      include: {
        medicine: {
          include: {
            manufacturer: {
              select: { id: true, name: true, shortName: true },
            },
          },
        },
      },
    })

    return NextResponse.json({ success: true, shortage: updated })
  } catch (error) {
    console.error('Update shortage error:', error)
    return NextResponse.json({ error: 'Failed to update shortage record' }, { status: 500 })
  }
}
