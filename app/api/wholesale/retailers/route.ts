import { NextRequest, NextResponse } from 'next/server'
import { prisma } from '@/lib/prisma'
import { getCurrentUser } from '@/lib/auth'
import { Role } from '@prisma/client'

export async function GET(req: NextRequest) {
  try {
    const user = await getCurrentUser()
    if (!user) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
    }

    const { searchParams } = new URL(req.url)
    const q = searchParams.get('q')?.trim() || ''
    const route = searchParams.get('route')?.trim() || ''
    const activeOnly = searchParams.get('active') !== 'false'

    const where: any = {}
    if (activeOnly) {
      where.isActive = true
    }
    if (route) {
      where.marketRoute = route
    }
    if (q) {
      where.OR = [
        { storeName: { contains: q } },
        { ownerName: { contains: q } },
        { phone: { contains: q } },
        { retailerCode: { contains: q } },
        { address: { contains: q } },
      ]
    }

    const retailers = await prisma.retailer.findMany({
      where,
      orderBy: [
        { storeName: 'asc' },
      ],
      include: {
        _count: {
          select: { orders: true, payments: true },
        },
      },
    })

    // Gather unique market routes
    const routes = await prisma.retailer.findMany({
      where: { marketRoute: { not: null } },
      select: { marketRoute: true },
      distinct: ['marketRoute'],
    })

    return NextResponse.json({
      retailers,
      routes: routes.map((r) => r.marketRoute).filter(Boolean),
    })
  } catch (err: any) {
    console.error('Error fetching retailers:', err)
    return NextResponse.json({ error: err.message || 'Internal error' }, { status: 500 })
  }
}

export async function POST(req: NextRequest) {
  try {
    const user = await getCurrentUser()
    if (!user || user.role !== Role.ADMIN) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
    }

    const body = await req.json()
    const {
      storeName,
      ownerName,
      phone,
      email,
      address,
      marketRoute,
      defaultDiscountPercent,
      creditLimit,
      pinCode,
    } = body

    if (!storeName || !ownerName || !phone || !address) {
      return NextResponse.json(
        { error: 'Store Name, Owner Name, Phone and Address are required.' },
        { status: 400 }
      )
    }

    // Auto-generate code if not provided
    let retailerCode = body.retailerCode
    if (!retailerCode) {
      const count = await prisma.retailer.count()
      retailerCode = `RET-${String(count + 1).padStart(3, '0')}`
    }

    const retailer = await prisma.retailer.create({
      data: {
        retailerCode,
        storeName: storeName.trim(),
        ownerName: ownerName.trim(),
        phone: phone.trim(),
        email: email?.trim() || null,
        address: address.trim(),
        marketRoute: marketRoute?.trim() || null,
        defaultDiscountPercent: defaultDiscountPercent ? parseFloat(defaultDiscountPercent) : 12.0,
        creditLimit: creditLimit ? parseFloat(creditLimit) : 50000.0,
        pinCode: pinCode?.trim() || null,
      },
    })

    return NextResponse.json({ retailer }, { status: 201 })
  } catch (err: any) {
    console.error('Error creating retailer:', err)
    return NextResponse.json({ error: err.message || 'Internal error' }, { status: 500 })
  }
}
