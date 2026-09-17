import { NextRequest, NextResponse } from 'next/server'
import { prisma } from '@/lib/prisma'
import { getCurrentUser } from '@/lib/auth'
import { OrderStatus, PaymentStatus, PaymentMethod } from '@prisma/client'
import { getLocalDateString } from '@/lib/date-utils'

export async function GET(req: NextRequest) {
  try {
    const user = await getCurrentUser()
    if (!user) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
    }

    const { searchParams } = new URL(req.url)
    const status = searchParams.get('status') as OrderStatus | null
    const paymentStatus = searchParams.get('paymentStatus') as PaymentStatus | null
    const retailerId = searchParams.get('retailerId')
    const date = searchParams.get('date')
    const search = searchParams.get('search')?.trim()

    const where: any = {}
    if (status) where.status = status
    if (paymentStatus) where.paymentStatus = paymentStatus
    if (retailerId) where.retailerId = retailerId
    if (date) where.orderDate = date
    if (search) {
      where.OR = [
        { orderNumber: { contains: search } },
        { retailer: { storeName: { contains: search } } },
        { retailer: { phone: { contains: search } } },
      ]
    }

    const orders = await prisma.wholesaleOrder.findMany({
      where,
      include: {
        retailer: {
          select: {
            id: true,
            retailerCode: true,
            storeName: true,
            ownerName: true,
            phone: true,
            address: true,
            marketRoute: true,
            currentDue: true,
          },
        },
        items: {
          include: {
            medicine: {
              select: {
                id: true,
                brandName: true,
                genericName: true,
                strength: true,
                dosageForm: true,
              },
            },
          },
        },
      },
      orderBy: { createdAt: 'desc' },
      take: 100,
    })

    // Compute summary stats
    const totalOrdersCount = orders.length
    const totalRevenue = orders.reduce((sum, o) => sum + o.totalAmount, 0)
    const totalDues = orders.reduce((sum, o) => sum + o.dueAmount, 0)
    const pendingCount = orders.filter((o) => o.status === OrderStatus.PENDING).length

    return NextResponse.json({
      orders,
      stats: {
        totalOrdersCount,
        totalRevenue: Math.round(totalRevenue * 100) / 100,
        totalDues: Math.round(totalDues * 100) / 100,
        pendingCount,
      },
    })
  } catch (err: any) {
    console.error('Error fetching wholesale orders:', err)
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
      retailerId,
      items,
      paymentMethod = PaymentMethod.CASH,
      paidAmount = 0,
      notes,
      deliveryDate,
    } = body

    if (!retailerId) {
      return NextResponse.json({ error: 'Retailer is required.' }, { status: 400 })
    }
    if (!items || !Array.isArray(items) || items.length === 0) {
      return NextResponse.json({ error: 'Order must contain at least 1 medicine item.' }, { status: 400 })
    }

    const retailer = await prisma.retailer.findUnique({
      where: { id: retailerId },
    })
    if (!retailer) {
      return NextResponse.json({ error: 'Selected retailer not found.' }, { status: 404 })
    }

    const todayStr = getLocalDateString()
    const countToday = await prisma.wholesaleOrder.count({
      where: { orderDate: todayStr },
    })
    const orderNumber = `WHO-${todayStr.replace(/-/g, '')}-${String(countToday + 1).padStart(3, '0')}`

    let calculatedSubtotal = 0
    let calculatedDiscount = 0

    const formattedItems = items.map((item: any) => {
      const qty = parseFloat(item.quantity) || 1
      const unit = item.unit || 'Box'
      const unitPrice = parseFloat(item.unitPrice) || 0
      const discountPercent = item.discountPercent !== undefined
        ? parseFloat(item.discountPercent)
        : retailer.defaultDiscountPercent || 12.0
      const tradePrice =
        item.tradePrice !== undefined
          ? parseFloat(item.tradePrice)
          : Math.round(unitPrice * (1 - discountPercent / 100) * 100) / 100

      const lineSubtotal = unitPrice * qty
      const lineTotal = tradePrice * qty
      const lineDiscount = lineSubtotal - lineTotal

      calculatedSubtotal += lineSubtotal
      calculatedDiscount += lineDiscount

      return {
        medicineId: item.medicineId,
        quantity: qty,
        unit,
        unitPrice,
        tradePrice,
        discountPercent,
        total: Math.round(lineTotal * 100) / 100,
      }
    })

    const totalAmount = Math.round((calculatedSubtotal - calculatedDiscount) * 100) / 100
    const parsedPaid = parseFloat(paidAmount) || 0
    const dueAmount = Math.max(0, Math.round((totalAmount - parsedPaid) * 100) / 100)

    let paymentStatus: PaymentStatus = PaymentStatus.DUE
    if (parsedPaid >= totalAmount) {
      paymentStatus = PaymentStatus.PAID
    } else if (parsedPaid > 0) {
      paymentStatus = PaymentStatus.PARTIAL
    }

    // Execute order creation & retailer due balance update in transaction
    const createdOrder = await prisma.$transaction(async (tx) => {
      const newOrder = await tx.wholesaleOrder.create({
        data: {
          orderNumber,
          retailerId,
          orderDate: todayStr,
          deliveryDate: deliveryDate || null,
          status: OrderStatus.CONFIRMED,
          paymentStatus,
          paymentMethod,
          subtotal: Math.round(calculatedSubtotal * 100) / 100,
          discountAmount: Math.round(calculatedDiscount * 100) / 100,
          taxAmount: 0,
          totalAmount,
          paidAmount: parsedPaid,
          dueAmount,
          notes: notes?.trim() || null,
          items: {
            create: formattedItems,
          },
        },
        include: {
          retailer: true,
          items: {
            include: {
              medicine: true,
            },
          },
        },
      })

      // If there is any remaining due on this order, increase retailer's currentDue
      if (dueAmount > 0) {
        await tx.retailer.update({
          where: { id: retailerId },
          data: {
            currentDue: {
              increment: dueAmount,
            },
          },
        })
      }

      // If there was an immediate payment made, record payment in ledger
      if (parsedPaid > 0) {
        await tx.retailerPayment.create({
          data: {
            retailerId,
            orderId: newOrder.id,
            amount: parsedPaid,
            paymentMethod,
            notes: `Initial payment at order creation (${orderNumber})`,
            paymentDate: todayStr,
          },
        })
      }

      return newOrder
    })

    return NextResponse.json({ order: createdOrder }, { status: 201 })
  } catch (err: any) {
    console.error('Error creating wholesale order:', err)
    return NextResponse.json({ error: err.message || 'Internal error' }, { status: 500 })
  }
}
