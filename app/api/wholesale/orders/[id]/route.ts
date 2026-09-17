import { NextRequest, NextResponse } from 'next/server'
import { prisma } from '@/lib/prisma'
import { getCurrentUser } from '@/lib/auth'
import { OrderStatus, PaymentStatus, Role } from '@prisma/client'

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
    const order = await prisma.wholesaleOrder.findUnique({
      where: { id },
      include: {
        retailer: true,
        items: {
          include: {
            medicine: {
              include: {
                manufacturer: true,
              },
            },
          },
        },
        payments: {
          orderBy: { createdAt: 'desc' },
        },
      },
    })

    if (!order) {
      return NextResponse.json({ error: 'Order not found' }, { status: 404 })
    }

    return NextResponse.json({ order })
  } catch (err: any) {
    return NextResponse.json({ error: err.message || 'Internal error' }, { status: 500 })
  }
}

export async function PATCH(
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
    const { status, paymentStatus, paidAmount, notes } = body

    const existing = await prisma.wholesaleOrder.findUnique({
      where: { id },
    })
    if (!existing) {
      return NextResponse.json({ error: 'Order not found' }, { status: 404 })
    }

    const updateData: any = {}
    if (status) updateData.status = status as OrderStatus
    if (notes !== undefined) updateData.notes = notes

    if (paidAmount !== undefined) {
      const newPaid = parseFloat(paidAmount)
      const newDue = Math.max(0, Math.round((existing.totalAmount - newPaid) * 100) / 100)
      updateData.paidAmount = newPaid
      updateData.dueAmount = newDue

      if (newPaid >= existing.totalAmount) {
        updateData.paymentStatus = PaymentStatus.PAID
      } else if (newPaid > 0) {
        updateData.paymentStatus = PaymentStatus.PARTIAL
      } else {
        updateData.paymentStatus = PaymentStatus.DUE
      }

      // Adjust retailer's currentDue difference
      const dueDiff = newDue - existing.dueAmount
      if (dueDiff !== 0) {
        await prisma.retailer.update({
          where: { id: existing.retailerId },
          data: {
            currentDue: {
              increment: dueDiff,
            },
          },
        })
      }
    } else if (paymentStatus) {
      updateData.paymentStatus = paymentStatus as PaymentStatus
    }

    const updated = await prisma.wholesaleOrder.update({
      where: { id },
      data: updateData,
      include: {
        retailer: true,
        items: true,
      },
    })

    return NextResponse.json({ order: updated })
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
    const order = await prisma.wholesaleOrder.findUnique({
      where: { id },
    })

    if (!order) {
      return NextResponse.json({ error: 'Order not found' }, { status: 404 })
    }

    // If order has due amount, decrement retailer's current due
    if (order.dueAmount > 0) {
      await prisma.retailer.update({
        where: { id: order.retailerId },
        data: {
          currentDue: {
            decrement: order.dueAmount,
          },
        },
      })
    }

    await prisma.wholesaleOrder.delete({
      where: { id },
    })

    return NextResponse.json({ success: true })
  } catch (err: any) {
    return NextResponse.json({ error: err.message || 'Internal error' }, { status: 500 })
  }
}
