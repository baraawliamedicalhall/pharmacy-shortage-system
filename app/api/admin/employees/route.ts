import { NextRequest, NextResponse } from 'next/server'
import { prisma } from '@/lib/prisma'
import { getCurrentUser, hashPassword } from '@/lib/auth'
import { userCreateSchema } from '@/lib/validations'
import { Role } from '@prisma/client'
import { createAuditLog } from '@/lib/audit'
import { getLocalDateString } from '@/lib/date-utils'

export async function GET() {
  try {
    const user = await getCurrentUser()
    if (!user || user.role !== Role.ADMIN) {
      return NextResponse.json({ error: 'Admin access required' }, { status: 403 })
    }

    const todayStr = getLocalDateString()

    const employees = await prisma.user.findMany({
      select: {
        id: true,
        employeeId: true,
        name: true,
        role: true,
        isActive: true,
        createdAt: true,
        _count: {
          select: {
            shortages: true,
          },
        },
        shortages: {
          where: {
            reportedDate: todayStr,
          },
          select: {
            id: true,
          },
        },
      },
      orderBy: { employeeId: 'asc' },
    })

    const formatted = employees.map((emp) => ({
      id: emp.id,
      employeeId: emp.employeeId,
      name: emp.name,
      role: emp.role,
      isActive: emp.isActive,
      createdAt: emp.createdAt,
      totalReports: emp._count.shortages,
      reportsToday: emp.shortages.length,
    }))

    return NextResponse.json({ employees: formatted })
  } catch (error) {
    console.error('Admin employees GET error:', error)
    return NextResponse.json({ error: 'Failed to fetch employees' }, { status: 500 })
  }
}

export async function POST(req: NextRequest) {
  try {
    const user = await getCurrentUser()
    if (!user || user.role !== Role.ADMIN) {
      return NextResponse.json({ error: 'Admin access required' }, { status: 403 })
    }

    const body = await req.json()
    const validation = userCreateSchema.safeParse(body)

    if (!validation.success) {
      const issue = validation.error.issues[0]
      return NextResponse.json({ error: issue.message }, { status: 400 })
    }

    const data = validation.data

    const existing = await prisma.user.findUnique({
      where: { employeeId: data.employeeId },
    })

    if (existing) {
      return NextResponse.json({ error: 'An employee with this Employee ID already exists' }, { status: 409 })
    }

    const passwordHash = await hashPassword(data.password)

    const created = await prisma.user.create({
      data: {
        employeeId: data.employeeId,
        name: data.name,
        passwordHash,
        role: data.role as Role,
        isActive: data.isActive,
      },
      select: {
        id: true,
        employeeId: true,
        name: true,
        role: true,
        isActive: true,
        createdAt: true,
      },
    })

    await createAuditLog('EMPLOYEE_CREATED', {
      userId: user.userId,
      details: `Created user ${created.employeeId} (${created.name}, ${created.role})`,
    })

    return NextResponse.json({ success: true, employee: created })
  } catch (error) {
    console.error('Create employee error:', error)
    return NextResponse.json({ error: 'Failed to create employee' }, { status: 500 })
  }
}
