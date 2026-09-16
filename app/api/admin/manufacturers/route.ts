import { NextRequest, NextResponse } from 'next/server'
import { prisma } from '@/lib/prisma'
import { getCurrentUser } from '@/lib/auth'
import { manufacturerSchema } from '@/lib/validations'
import { Role } from '@prisma/client'
import { createAuditLog } from '@/lib/audit'

export async function GET() {
  try {
    const user = await getCurrentUser()
    if (!user || user.role !== Role.ADMIN) {
      return NextResponse.json({ error: 'Admin access required' }, { status: 403 })
    }

    const manufacturers = await prisma.manufacturer.findMany({
      include: {
        _count: {
          select: { medicines: true },
        },
      },
      orderBy: { name: 'asc' },
    })

    return NextResponse.json({ manufacturers })
  } catch (error) {
    console.error('Admin manufacturers GET error:', error)
    return NextResponse.json({ error: 'Failed to fetch manufacturers' }, { status: 500 })
  }
}

export async function POST(req: NextRequest) {
  try {
    const user = await getCurrentUser()
    if (!user || user.role !== Role.ADMIN) {
      return NextResponse.json({ error: 'Admin access required' }, { status: 403 })
    }

    const body = await req.json()
    const validation = manufacturerSchema.safeParse(body)

    if (!validation.success) {
      const issue = validation.error.issues[0]
      return NextResponse.json({ error: issue.message }, { status: 400 })
    }

    const data = validation.data

    const existing = await prisma.manufacturer.findUnique({
      where: { name: data.name },
    })

    if (existing) {
      return NextResponse.json({ error: 'A manufacturer with this name already exists' }, { status: 409 })
    }

    const created = await prisma.manufacturer.create({
      data: {
        name: data.name,
        shortName: data.shortName || null,
        isActive: data.isActive,
      },
    })

    await createAuditLog('MANUFACTURER_CREATED', {
      userId: user.userId,
      details: `Created manufacturer: ${created.name}`,
    })

    return NextResponse.json({ success: true, manufacturer: created })
  } catch (error) {
    console.error('Create manufacturer error:', error)
    return NextResponse.json({ error: 'Failed to create manufacturer' }, { status: 500 })
  }
}
