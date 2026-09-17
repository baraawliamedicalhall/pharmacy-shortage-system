import { NextRequest, NextResponse } from 'next/server'
import { prisma } from '@/lib/prisma'
import { getCurrentUser } from '@/lib/auth'
import { PaymentMethod, Role } from '@prisma/client'
import { getLocalDateString } from '@/lib/date-utils'

export async function GET(req: NextRequest) {
  try {
    const user = await getCurrentUser()
    if (!user) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
    }

    const { searchParams } = new URL(req.url)
    const retailerId = searchParams.get('retailerId')
    const limit = parseInt(searchParams.get('limit') || '50', 10)

    const where: any = {}
    if (retailerId) where.retailerId = retailerId

    const payments = await prisma.retailerPayment.findMany({
      where,
      include: {
        retailer: {
          select: {
            id: true,
            retailerCode: true,
            storeName: true,
            ownerName: true,
            phone: true,
            currentDue: true,
          },
        },
      },
      orderBy: { createdAt: 'desc' },
      take: limit,
    })

    const totalCollected = payments.reduce((sum, p) => sum + p.amount, 0)

    return NextResponse.json({
      payments,
      totalCollected: Math.round(totalCollected * 100) / 100,
    })
  } catch (err: any) {
    console.error('Error fetching payments:', err)
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
      retailerId,
      orderId,
      amount,
      paymentMethod = PaymentMethod.CASH,
      referenceNo,
      notes,
      paymentDate,
    } = body

    const parsedAmount = parseFloat(amount)
    if (!retailerId || isNaN(parsedAmount) || parsedAmount <= 0) {
      return NextResponse.json({ error: 'Retailer and a valid positive amount are required.' }, { status: 400 })
    }

    const retailer = await prisma.retailer.findUnique({
      where: { id: retailerId },
    })
    if (!retailer) {
      return NextResponse.json({ error: 'Retailer not found.' }, { status: 404 })
    }

    const dateStr = paymentDate || getLocalDateString()

    // Transaction to create payment record and reduce retailer currentDue
    const result = await prisma.$transaction(async (tx) => {
      const payment = await tx.retailerPayment.create({
        data: {
          retailerId,
          orderId: orderId || null,
          amount: parsedAmount,
          paymentMethod,
          referenceNo: referenceNo?.trim() || null,
          notes: notes?.trim() || null,
          paymentDate: dateStr,
        },
        include: {
          retailer: true,
        },
      })

      // Decrement retailer due
      const updatedRetailer = await tx.retailer.update({
        where: { id: retailerId },
        data: {
          currentDue: {
            decrement: parsedAmount,
          },
        },
      })

      // If tied to a specific order, update order paid/due amount as well
      if (orderId) {
        const order = await tx.wholesaleOrder.findUnique({ where: { id: orderId } })
        if (order) {
          const newPaid = Math.min(order.totalAmount, order.paidAmount + parsedAmount)
          const newDue = Math.max(0, order.totalAmount - newPaid)
          await tx.wholesaleOrder.update({
            where: { id: orderId },
            data: {
              paidAmount: newPaid,
              dueAmount: newDue,
              paymentStatus: newDue === 0 ? 'PAID' : 'PARTIAL',
            },
          })
        }
      }

      return { payment, retailer: updatedRetailer }
    })

    return NextResponse.json(result, { status: 201 })
  } catch (err: any) {
    console.error('Error recording payment:', err)
    return NextResponse.json({ error: err.message || 'Internal error' }, { status: 500 })
  }
}
