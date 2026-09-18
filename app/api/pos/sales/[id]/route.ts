import { NextRequest, NextResponse } from 'next/server'
import { prisma } from '@/lib/prisma'
import { getCurrentUser } from '@/lib/auth'

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
    const sale = await prisma.sale.findUnique({
      where: { id },
      include: {
        soldBy: {
          select: { name: true, employeeId: true },
        },
        items: {
          include: {
            medicine: {
              select: {
                brandName: true,
                strength: true,
                dosageForm: true,
                manufacturer: { select: { name: true, shortName: true } },
              },
            },
          },
        },
      },
    })

    if (!sale) {
      return NextResponse.json({ error: 'Sale record not found' }, { status: 404 })
    }

    return NextResponse.json({ sale })
  } catch (err: any) {
    return NextResponse.json({ error: err.message || 'Internal error' }, { status: 500 })
  }
}

// Admin-only: Update a completed sale
export async function PUT(
  req: NextRequest,
  context: { params: Promise<{ id: string }> }
) {
  try {
    const user = await getCurrentUser()
    if (!user) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
    }

    // Only ADMIN can edit sales
    const dbUser = await prisma.user.findUnique({
      where: { id: user.userId },
      select: { role: true },
    })
    if (!dbUser || dbUser.role !== 'ADMIN') {
      return NextResponse.json({ error: 'Only admin can edit sales' }, { status: 403 })
    }

    const { id } = await context.params
    const body = await req.json()
    const {
      customerName,
      customerPhone,
      items,
      discountAmount = 0,
      paidAmount = 0,
      paymentMethod,
    } = body

    // Validate sale exists
    const existing = await prisma.sale.findUnique({ where: { id } })
    if (!existing) {
      return NextResponse.json({ error: 'Sale not found' }, { status: 404 })
    }

    if (!items || !Array.isArray(items) || items.length === 0) {
      return NextResponse.json({ error: 'Sale must have at least one item' }, { status: 400 })
    }

    // Build new items and calculate totals
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

    // Transaction: delete old items, update sale, create new items
    const updatedSale = await prisma.$transaction(async (tx) => {
      // Delete existing sale items
      await tx.saleItem.deleteMany({ where: { saleId: id } })

      // Update sale header + create new items
      return tx.sale.update({
        where: { id },
        data: {
          customerName: customerName?.trim() || 'Walk-in Customer',
          customerPhone: customerPhone?.trim() || null,
          subtotal: Math.round(subtotal * 100) / 100,
          discountAmount: parsedDiscount,
          totalAmount,
          paidAmount: parsedPaid,
          changeAmount,
          paymentMethod: paymentMethod || existing.paymentMethod,
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
    })

    return NextResponse.json({ sale: updatedSale })
  } catch (err: any) {
    console.error('POS sale PUT error:', err)
    return NextResponse.json({ error: err.message || 'Internal error' }, { status: 500 })
  }
}

