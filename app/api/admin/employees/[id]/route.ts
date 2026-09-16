import { NextRequest, NextResponse } from 'next/server'
import { prisma } from '@/lib/prisma'
import { getCurrentUser, hashPassword } from '@/lib/auth'
import { userUpdateSchema } from '@/lib/validations'
import { Role } from '@prisma/client'
import { createAuditLog } from '@/lib/audit'

export async function PUT(
  req: NextRequest,
  ctx: { params: Promise<{ id: string }> }
) {
  try {
    const currentUser = await getCurrentUser()
    if (!currentUser || currentUser.role !== Role.ADMIN) {
      return NextResponse.json({ error: 'Admin access required' }, { status: 403 })
    }

    const { id } = await ctx.params
    const body = await req.json()
    const validation = userUpdateSchema.safeParse(body)

    if (!validation.success) {
      const issue = validation.error.issues[0]
      return NextResponse.json({ error: issue.message }, { status: 400 })
    }

    const data = validation.data
    const updateData: any = {
      name: data.name,
      role: data.role as Role,
      isActive: data.isActive,
    }

    if (data.password && data.password.trim().length >= 4) {
      updateData.passwordHash = await hashPassword(data.password.trim())
    }

    const updated = await prisma.user.update({
      where: { id },
      data: updateData,
      select: {
        id: true,
        employeeId: true,
        name: true,
        role: true,
        isActive: true,
      },
    })

    await createAuditLog('EMPLOYEE_UPDATED', {
      userId: currentUser.userId,
      details: `Updated employee ${updated.employeeId} (${updated.name})`,
    })

    return NextResponse.json({ success: true, employee: updated })
  } catch (error) {
    console.error('Update employee error:', error)
    return NextResponse.json({ error: 'Failed to update employee' }, { status: 500 })
  }
}

export async function DELETE(
  _req: NextRequest,
  ctx: { params: Promise<{ id: string }> }
) {
  try {
    const currentUser = await getCurrentUser()
    if (!currentUser || currentUser.role !== Role.ADMIN) {
      return NextResponse.json({ error: 'Admin access required' }, { status: 403 })
    }

    const { id } = await ctx.params

    if (currentUser.userId === id) {
      return NextResponse.json({ error: 'You cannot delete your own admin account' }, { status: 400 })
    }

    const user = await prisma.user.findUnique({
      where: { id },
      include: { _count: { select: { shortages: true } } },
    })

    if (!user) {
      return NextResponse.json({ error: 'User not found' }, { status: 404 })
    }

    if (user._count.shortages > 0) {
      // Deactivate rather than deleting to preserve shortage history
      await prisma.user.update({
        where: { id },
        data: { isActive: false },
      })
      return NextResponse.json({
        success: true,
        message: 'Employee has shortage records; account has been deactivated.',
      })
    }

    await prisma.user.delete({
      where: { id },
    })

    await createAuditLog('EMPLOYEE_DELETED', {
      userId: currentUser.userId,
      details: `Deleted employee ${user.employeeId} (${user.name})`,
    })

    return NextResponse.json({ success: true, message: 'Employee deleted' })
  } catch (error) {
    console.error('Delete employee error:', error)
    return NextResponse.json({ error: 'Failed to delete employee' }, { status: 500 })
  }
}
