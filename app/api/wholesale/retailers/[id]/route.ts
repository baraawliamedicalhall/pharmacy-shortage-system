import { NextRequest, NextResponse } from 'next/server'
import { prisma } from '@/lib/prisma'
import { getCurrentUser } from '@/lib/auth'
import { Role } from '@prisma/client'

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
    const retailer = await prisma.retailer.findUnique({
      where: { id },
      include: {
        orders: {
          take: 10,
          orderBy: { createdAt: 'desc' },
        },
        payments: {
          take: 10,
          orderBy: { createdAt: 'desc' },
        },
        _count: {
          select: { orders: true, payments: true },
        },
      },
    })

    if (!retailer) {
      return NextResponse.json({ error: 'Retailer not found' }, { status: 404 })
    }

    return NextResponse.json({ retailer })
  } catch (err: any) {
    return NextResponse.json({ error: err.message || 'Internal error' }, { status: 500 })
  }
}

export async function PUT(
  req: NextRequest,
  context: { params: Promise<{ id: string }> }
) {
  try {
    const user = await getCurrentUser()
    if (!user || user.role !== Role.ADMIN) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
    }

    const { id } = await context.params
    const body = await req.json()

    const updated = await prisma.retailer.update({
      where: { id },
      data: {
        storeName: body.storeName?.trim(),
        ownerName: body.ownerName?.trim(),
        phone: body.phone?.trim(),
        email: body.email?.trim() || null,
        address: body.address?.trim(),
        marketRoute: body.marketRoute?.trim() || null,
        defaultDiscountPercent:
          body.defaultDiscountPercent !== undefined ? parseFloat(body.defaultDiscountPercent) : undefined,
        creditLimit: body.creditLimit !== undefined ? parseFloat(body.creditLimit) : undefined,
        pinCode: body.pinCode?.trim() || null,
        isActive: body.isActive !== undefined ? Boolean(body.isActive) : undefined,
      },
    })

    return NextResponse.json({ retailer: updated })
  } catch (err: any) {
    return NextResponse.json({ error: err.message || 'Internal error' }, { status: 500 })
  }
}

export async function DELETE(
  req: NextRequest,
  context: { params: Promise<{ id: string }> }
) {
  try {
    const user = await getCurrentUser()
    if (!user || user.role !== Role.ADMIN) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
    }

    const { id } = await context.params

    // Soft deactivate to protect historical orders
    const deactivated = await prisma.retailer.update({
      where: { id },
      data: { isActive: false },
    })

    return NextResponse.json({ success: true, retailer: deactivated })
  } catch (err: any) {
    return NextResponse.json({ error: err.message || 'Internal error' }, { status: 500 })
  }
}
