import { NextRequest, NextResponse } from 'next/server'
import { prisma } from '@/lib/prisma'
import { getCurrentUser } from '@/lib/auth'
import { shortageCreateSchema } from '@/lib/validations'
import { Role, ShortageStatus } from '@prisma/client'
import { getLocalDateString } from '@/lib/date-utils'

export async function GET(req: NextRequest) {
  try {
    const user = await getCurrentUser()
    if (!user) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
    }

    const { searchParams } = new URL(req.url)
    const todayStr = getLocalDateString()
    const dateParam = searchParams.get('date') || todayStr
    const modeParam = searchParams.get('mode')

    // EMPLOYEE or mode=my: Returns submissions by current user for selected date
    if (modeParam === 'my' || user.role === Role.EMPLOYEE) {
      const myReports = await prisma.shortage.findMany({
        where: {
          employeeId: user.userId,
          reportedDate: dateParam,
        },
        include: {
          medicine: {
            include: {
              manufacturer: {
                select: { id: true, name: true, shortName: true },
              },
            },
          },
        },
        orderBy: {
          reportedAt: 'desc',
        },
      })

      return NextResponse.json({
        role: user.role,
        date: dateParam,
        reports: myReports,
        rawReports: myReports,
        count: myReports.length,
      })
    }

    // ADMIN: Consolidated view and filtering
    const fromParam = searchParams.get('from')
    const toParam = searchParams.get('to')
    const statusParam = searchParams.get('status') as ShortageStatus | null

    const whereClause: {
      reportedDate?: string | { gte: string; lte: string }
      status?: ShortageStatus
    } = {}

    if (fromParam && toParam) {
      whereClause.reportedDate = { gte: fromParam, lte: toParam }
    } else {
      whereClause.reportedDate = dateParam
    }

    if (statusParam && Object.values(ShortageStatus).includes(statusParam)) {
      whereClause.status = statusParam
    }

    const allShortages = await prisma.shortage.findMany({
      where: whereClause,
      include: {
        medicine: {
          include: {
            manufacturer: {
              select: { id: true, name: true, shortName: true },
            },
          },
        },
        employee: {
          select: { id: true, employeeId: true, name: true },
        },
      },
      orderBy: {
        reportedAt: 'desc',
      },
    })

    // Group and consolidate duplicate medicine reports
    const map = new Map<
      string,
      {
        medicineId: string
        medicine: (typeof allShortages)[0]['medicine']
        reportCount: number
        totalQuantity: number
        units: Set<string>
        employees: Map<string, { id: string; employeeId: string; name: string; count: number }>
        reports: Array<{
          id: string
          employeeId: string
          employeeName: string
          quantity: number | null
          unit: string | null
          notes: string | null
          status: ShortageStatus
          reportedAt: Date
        }>
        hasPending: boolean
      }
    >()

    const uniqueEmployees = new Set<string>()

    for (const report of allShortages) {
      uniqueEmployees.add(report.employeeId)
      const medKey = report.medicineId

      if (!map.has(medKey)) {
        map.set(medKey, {
          medicineId: report.medicineId,
          medicine: report.medicine,
          reportCount: 0,
          totalQuantity: 0,
          units: new Set(),
          employees: new Map(),
          reports: [],
          hasPending: false,
        })
      }

      const entry = map.get(medKey)!
      entry.reportCount += 1
      if (report.quantity) {
        entry.totalQuantity += report.quantity
      }
      if (report.unit) {
        entry.units.add(report.unit)
      }
      if (report.status === ShortageStatus.REPORTED) {
        entry.hasPending = true
      }

      // Track reporting employees
      const empEntry = entry.employees.get(report.employeeId)
      if (empEntry) {
        empEntry.count += 1
      } else {
        entry.employees.set(report.employeeId, {
          id: report.employee.id,
          employeeId: report.employee.employeeId,
          name: report.employee.name,
          count: 1,
        })
      }

      entry.reports.push({
        id: report.id,
        employeeId: report.employee.id,
        employeeName: report.employee.name,
        quantity: report.quantity,
        unit: report.unit,
        notes: report.notes,
        status: report.status,
        reportedAt: report.reportedAt,
      })
    }

    const consolidated = Array.from(map.values())
      .map((item) => ({
        medicineId: item.medicineId,
        medicine: item.medicine,
        reportCount: item.reportCount,
        totalQuantity: item.totalQuantity,
        units: Array.from(item.units),
        employees: Array.from(item.employees.values()),
        reports: item.reports,
        hasPending: item.hasPending,
      }))
      .sort((a, b) => b.reportCount - a.reportCount || a.medicine.brandName.localeCompare(b.medicine.brandName))

    // Summary statistics
    const totalReports = allShortages.length
    const uniqueMedicinesCount = consolidated.length
    const employeesCount = uniqueEmployees.size
    const pendingCount = allShortages.filter((r) => r.status === ShortageStatus.REPORTED).length

    return NextResponse.json({
      role: 'ADMIN',
      filter: {
        date: dateParam,
        from: fromParam,
        to: toParam,
      },
      stats: {
        totalReports,
        uniqueMedicines: uniqueMedicinesCount,
        employeesReporting: employeesCount,
        pendingReview: pendingCount,
      },
      consolidated,
      reports: allShortages,
      rawReports: allShortages,
    })
  } catch (error) {
    console.error('Error fetching shortages:', error)
    return NextResponse.json({ error: 'Failed to fetch shortages' }, { status: 500 })
  }
}

export async function POST(req: NextRequest) {
  try {
    const user = await getCurrentUser()
    if (!user) {
      return NextResponse.json({ error: 'Unauthorized. Please login.' }, { status: 401 })
    }

    const body = await req.json()
    const validation = shortageCreateSchema.safeParse(body)

    if (!validation.success) {
      const firstIssue = validation.error.issues[0]
      return NextResponse.json({ error: firstIssue.message }, { status: 400 })
    }

    const { medicineId, quantity, unit, notes } = validation.data

    const medicine = await prisma.medicine.findUnique({
      where: { id: medicineId },
      include: {
        manufacturer: {
          select: { id: true, name: true, shortName: true },
        },
      },
    })

    if (!medicine || !medicine.isActive) {
      return NextResponse.json({ error: 'Selected medicine was not found or is inactive' }, { status: 404 })
    }

    const todayStr = (body.date as string) || getLocalDateString()

    const shortage = await prisma.shortage.create({
      data: {
        medicineId: medicine.id,
        employeeId: user.userId,
        quantity: quantity ?? null,
        unit: unit || medicine.purchaseUnit || 'Box',
        notes: notes ?? null,
        status: ShortageStatus.REPORTED,
        reportedDate: todayStr,
      },
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

    return NextResponse.json({
      success: true,
      message: `${medicine.brandName} ${medicine.strength} added to today's shortage list`,
      shortage,
    })
  } catch (error) {
    console.error('Error recording shortage:', error)
    return NextResponse.json({ error: 'Failed to record medicine shortage' }, { status: 500 })
  }
}
