import { NextRequest, NextResponse } from 'next/server'
import { prisma } from '@/lib/prisma'
import { getCurrentUser } from '@/lib/auth'
import { PaymentMethod } from '@prisma/client'
import { getLocalDateString } from '@/lib/date-utils'

export async function GET(req: NextRequest) {
  try {
    const user = await getCurrentUser()
    if (!user) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
    }

    const { searchParams } = new URL(req.url)
    const todayStr = getLocalDateString()
    const date = searchParams.get('date') || todayStr
    const limit = parseInt(searchParams.get('limit') || '50', 10)

    const sales = await prisma.sale.findMany({
      where: { saleDate: date },
      include: {
        soldBy: {
          select: { name: true, employeeId: true },
        },
        items: {
          include: {
            medicine: {
              select: { brandName: true, strength: true, dosageForm: true },
            },
          },
        },
      },
      orderBy: { createdAt: 'desc' },
      take: limit,
    })

    const totalSalesCount = sales.length
    const totalRevenue = sales.reduce((sum, s) => sum + s.totalAmount, 0)
    const totalCash = sales
      .filter((s) => s.paymentMethod === PaymentMethod.CASH)
      .reduce((sum, s) => sum + s.totalAmount, 0)
    const totalBkash = sales
      .filter((s) => s.paymentMethod === PaymentMethod.BKASH)
      .reduce((sum, s) => sum + s.totalAmount, 0)

    return NextResponse.json({
      sales,
      stats: {
        date,
        totalSalesCount,
        totalRevenue: Math.round(totalRevenue * 100) / 100,
        totalCash: Math.round(totalCash * 100) / 100,
        totalBkash: Math.round(totalBkash * 100) / 100,
      },
    })
  } catch (err: any) {
    console.error('POS sales GET error:', err)
    return NextResponse.json({ error: err.message || 'Internal error' }, { status: 500 })
  }
}

export async function POST(req: NextRequest) {
  try {
    const user = await getCurrentUser()
    if (!user) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
    }

    const body = await req.json()
    const {
      customerName = 'Walk-in Customer',
      customerPhone,
      items,
      discountAmount = 0,
      paidAmount = 0,
      paymentMethod = PaymentMethod.CASH,
    } = body

    if (!items || !Array.isArray(items) || items.length === 0) {
      return NextResponse.json({ error: 'Cart is empty. Add at least one medicine.' }, { status: 400 })
    }

    const todayStr = getLocalDateString()
    const countToday = await prisma.sale.count({
      where: { saleDate: todayStr },
    })

    const invoiceNumber = `POS-${todayStr.replace(/-/g, '')}-${String(countToday + 1).padStart(4, '0')}`

    let subtotal = 0

    const formattedItems = items.map((item: any) => {
      const qty = parseFloat(item.quantity) || 1
      const unitPrice = parseFloat(item.unitPrice) || 0
      const lineDisc = parseFloat(item.discountAmount) || 0
      const lineTotal = Math.max(0, Math.round((unitPrice * qty - lineDisc) * 100) / 100)

      subtotal += unitPrice * qty

      return {
        medicineId: item.medicineId,
        quantity: qty,
        unit: item.unit || 'Tablet',
        unitPrice,
        discountAmount: lineDisc,
        total: lineTotal,
      }
    })

    const parsedDiscount = parseFloat(discountAmount) || 0
    const totalAmount = Math.max(0, Math.round((subtotal - parsedDiscount) * 100) / 100)
    const parsedPaid = parseFloat(paidAmount) || totalAmount
    const changeAmount = Math.max(0, Math.round((parsedPaid - totalAmount) * 100) / 100)

    const sale = await prisma.sale.create({
      data: {
        invoiceNumber,
        customerName: customerName?.trim() || 'Walk-in Customer',
        customerPhone: customerPhone?.trim() || null,
        soldById: user.userId,
        subtotal: Math.round(subtotal * 100) / 100,
        discountAmount: parsedDiscount,
        taxAmount: 0,
        totalAmount,
        paidAmount: parsedPaid,
        changeAmount,
        paymentMethod,
        saleDate: todayStr,
        items: {
          create: formattedItems,
        },
      },
      include: {
        soldBy: {
          select: { name: true, employeeId: true },
        },
        items: {
          include: {
            medicine: {
              select: { brandName: true, strength: true, dosageForm: true },
            },
          },
        },
      },
    })

    return NextResponse.json({ sale }, { status: 201 })
  } catch (err: any) {
    console.error('POS sales POST error:', err)
    return NextResponse.json({ error: err.message || 'Internal error' }, { status: 500 })
  }
}
