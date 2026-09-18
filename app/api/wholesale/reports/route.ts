import { NextRequest, NextResponse } from 'next/server'
import { prisma } from '@/lib/prisma'
import { getCurrentUser } from '@/lib/auth'
import { getLocalDateString } from '@/lib/date-utils'

export async function GET(req: NextRequest) {
  try {
    const user = await getCurrentUser()
    if (!user) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
    }

    const { searchParams } = new URL(req.url)
    const todayStr = getLocalDateString()
    
    // Default to last 30 days or custom range
    const to = searchParams.get('to') || todayStr
    const defaultFrom = new Date(Date.now() - 30 * 24 * 60 * 60 * 1000)
    const from = searchParams.get('from') || getLocalDateString(defaultFrom)
    const routeFilter = searchParams.get('route') || ''
    const retailerId = searchParams.get('retailerId') || ''

    // 1. Fetch all retailers (with optional route/id filter)
    const retailerWhere: any = { isActive: true }
    if (routeFilter) retailerWhere.marketRoute = routeFilter
    if (retailerId) retailerWhere.id = retailerId

    const allRetailers = await prisma.retailer.findMany({
      where: retailerWhere,
      orderBy: [{ currentDue: 'desc' }, { storeName: 'asc' }],
    })

    const retailerIds = allRetailers.map((r) => r.id)

    // 2. Fetch all orders in date range for these retailers
    const ordersInPeriod = await prisma.wholesaleOrder.findMany({
      where: {
        retailerId: { in: retailerIds },
        orderDate: { gte: from, lte: to },
        status: { not: 'CANCELLED' },
      },
      include: {
        items: {
          include: {
            medicine: {
              select: {
                id: true,
                brandName: true,
                strength: true,
                dosageForm: true,
                genericName: true,
                manufacturer: { select: { name: true } },
              },
            },
          },
        },
      },
      orderBy: { orderDate: 'desc' },
    })

    // 3. Fetch all payments in date range for these retailers
    const paymentsInPeriod = await prisma.retailerPayment.findMany({
      where: {
        retailerId: { in: retailerIds },
        paymentDate: { gte: from, lte: to },
      },
      include: {
        retailer: {
          select: {
            id: true,
            retailerCode: true,
            storeName: true,
            marketRoute: true,
          },
        },
      },
      orderBy: { paymentDate: 'desc' },
    })

    // 4. Fetch lifetime stats per retailer (total orders ever & latest dates)
    const allOrdersGrouped = await prisma.wholesaleOrder.groupBy({
      by: ['retailerId'],
      where: {
        retailerId: { in: retailerIds },
        status: { not: 'CANCELLED' },
      },
      _count: { id: true },
      _sum: { totalAmount: true },
      _max: { orderDate: true },
    })

    const allPaymentsGrouped = await prisma.retailerPayment.groupBy({
      by: ['retailerId'],
      where: {
        retailerId: { in: retailerIds },
      },
      _count: { id: true },
      _sum: { amount: true },
      _max: { paymentDate: true },
    })

    const lifetimeOrdersMap = new Map<string, { count: number; total: number; lastDate?: string | null }>()
    for (const g of allOrdersGrouped) {
      lifetimeOrdersMap.set(g.retailerId, {
        count: g._count.id,
        total: g._sum.totalAmount || 0,
        lastDate: g._max.orderDate,
      })
    }

    const lifetimePaymentsMap = new Map<string, { count: number; total: number; lastDate?: string | null }>()
    for (const g of allPaymentsGrouped) {
      lifetimePaymentsMap.set(g.retailerId, {
        count: g._count.id,
        total: g._sum.amount || 0,
        lastDate: g._max.paymentDate,
      })
    }

    // 5. Aggregate period metrics per retailer
    const periodOrdersByRetailer: Record<string, { count: number; billed: number; discount: number }> = {}
    for (const o of ordersInPeriod) {
      if (!periodOrdersByRetailer[o.retailerId]) {
        periodOrdersByRetailer[o.retailerId] = { count: 0, billed: 0, discount: 0 }
      }
      periodOrdersByRetailer[o.retailerId].count += 1
      periodOrdersByRetailer[o.retailerId].billed += o.totalAmount
      periodOrdersByRetailer[o.retailerId].discount += o.discountAmount
    }

    const periodPaymentsByRetailer: Record<string, number> = {}
    for (const p of paymentsInPeriod) {
      periodPaymentsByRetailer[p.retailerId] = (periodPaymentsByRetailer[p.retailerId] || 0) + p.amount
    }

    // 6. Build Retailers Table Model
    const retailersReport = allRetailers.map((r) => {
      const pOrders = periodOrdersByRetailer[r.id] || { count: 0, billed: 0, discount: 0 }
      const pPaid = periodPaymentsByRetailer[r.id] || 0
      const ltOrders = lifetimeOrdersMap.get(r.id) || { count: 0, total: 0, lastDate: null }
      const ltPayments = lifetimePaymentsMap.get(r.id) || { count: 0, total: 0, lastDate: null }

      const creditLimit = r.creditLimit || 50000
      const currentDue = r.currentDue || 0
      const creditUtilization = creditLimit > 0 ? Math.round((currentDue / creditLimit) * 100) : 0

      let riskLevel: 'CRITICAL' | 'WARNING' | 'NORMAL' | 'CLEAR' = 'CLEAR'
      if (currentDue > creditLimit) {
        riskLevel = 'CRITICAL'
      } else if (currentDue >= creditLimit * 0.8) {
        riskLevel = 'WARNING'
      } else if (currentDue > 0) {
        riskLevel = 'NORMAL'
      } else {
        riskLevel = 'CLEAR'
      }

      return {
        id: r.id,
        retailerCode: r.retailerCode,
        storeName: r.storeName,
        ownerName: r.ownerName,
        phone: r.phone,
        email: r.email,
        address: r.address,
        marketRoute: r.marketRoute || 'Unassigned',
        defaultDiscountPercent: r.defaultDiscountPercent,
        creditLimit,
        currentDue: Math.round(currentDue * 100) / 100,
        creditUtilization,
        riskLevel,
        periodOrdersCount: pOrders.count,
        periodBilled: Math.round(pOrders.billed * 100) / 100,
        periodDiscount: Math.round(pOrders.discount * 100) / 100,
        periodPaid: Math.round(pPaid * 100) / 100,
        periodDueAdded: Math.round((pOrders.billed - pPaid) * 100) / 100,
        lifetimeOrdersCount: ltOrders.count,
        lifetimeBilled: Math.round(ltOrders.total * 100) / 100,
        lifetimePaid: Math.round(ltPayments.total * 100) / 100,
        lastOrderDate: ltOrders.lastDate,
        lastPaymentDate: ltPayments.lastDate,
      }
    })

    // 7. Executive Summary
    const totalRetailers = allRetailers.length
    const activeOrderingRetailers = Object.keys(periodOrdersByRetailer).length
    const totalOrders = ordersInPeriod.length
    const totalBilledAmount = ordersInPeriod.reduce((s, o) => s + o.totalAmount, 0)
    const totalDiscountGiven = ordersInPeriod.reduce((s, o) => s + o.discountAmount, 0)
    const totalCollected = paymentsInPeriod.reduce((s, p) => s + p.amount, 0)
    const totalOutstandingDue = allRetailers.reduce((s, r) => s + (r.currentDue || 0), 0)
    const totalCreditExtended = allRetailers.reduce((s, r) => s + (r.creditLimit || 0), 0)

    const overCreditLimitCount = retailersReport.filter((r) => r.riskLevel === 'CRITICAL').length
    const nearCreditLimitCount = retailersReport.filter((r) => r.riskLevel === 'WARNING').length
    const fullyPaidCount = retailersReport.filter((r) => r.riskLevel === 'CLEAR').length

    const collectionEfficiency =
      totalBilledAmount > 0 ? Math.round((totalCollected / totalBilledAmount) * 1000) / 10 : 0

    // 8. Route-wise Breakdown
    const routeMap: Record<
      string,
      {
        route: string
        retailersCount: number
        ordersCount: number
        totalBilled: number
        totalCollected: number
        totalOutstandingDue: number
        overdueCount: number
      }
    > = {}

    for (const r of retailersReport) {
      const rt = r.marketRoute || 'Unassigned'
      if (!routeMap[rt]) {
        routeMap[rt] = {
          route: rt,
          retailersCount: 0,
          ordersCount: 0,
          totalBilled: 0,
          totalCollected: 0,
          totalOutstandingDue: 0,
          overdueCount: 0,
        }
      }
      routeMap[rt].retailersCount += 1
      routeMap[rt].ordersCount += r.periodOrdersCount
      routeMap[rt].totalBilled += r.periodBilled
      routeMap[rt].totalCollected += r.periodPaid
      routeMap[rt].totalOutstandingDue += r.currentDue
      if (r.riskLevel === 'CRITICAL' || r.riskLevel === 'WARNING') {
        routeMap[rt].overdueCount += 1
      }
    }

    const routeBreakdown = Object.values(routeMap).sort((a, b) => b.totalOutstandingDue - a.totalOutstandingDue)

    // 9. Top Wholesale Products Sold to Retailers
    const productMap: Record<
      string,
      {
        medicineId: string
        brandName: string
        strength: string
        dosageForm: string
        genericName: string
        manufacturer: string
        totalQuantity: number
        unit: string
        ordersCount: number
        totalRevenue: number
      }
    > = {}

    for (const o of ordersInPeriod) {
      for (const item of o.items) {
        const mid = item.medicineId
        if (!productMap[mid]) {
          productMap[mid] = {
            medicineId: mid,
            brandName: item.medicine?.brandName || 'Unknown',
            strength: item.medicine?.strength || '',
            dosageForm: item.medicine?.dosageForm || '',
            genericName: item.medicine?.genericName || '',
            manufacturer: item.medicine?.manufacturer?.name || '',
            totalQuantity: 0,
            unit: item.unit,
            ordersCount: 0,
            totalRevenue: 0,
          }
        }
        productMap[mid].totalQuantity += item.quantity
        productMap[mid].ordersCount += 1
        productMap[mid].totalRevenue += item.total
      }
    }

    const topWholesaleProducts = Object.values(productMap)
      .sort((a, b) => b.totalRevenue - a.totalRevenue)
      .slice(0, 25)

    // 10. Distinct market routes for filter dropdown
    const availableRoutes = Array.from(
      new Set(allRetailers.map((r) => r.marketRoute).filter(Boolean))
    ) as string[]

    // 11. Individual Retailer Statement (if retailerId requested)
    let retailerStatement: any = null
    if (retailerId && allRetailers.length > 0) {
      const targetRetailer = allRetailers[0]
      const retailerOrders = await prisma.wholesaleOrder.findMany({
        where: { retailerId: targetRetailer.id },
        include: {
          items: {
            include: {
              medicine: {
                select: { brandName: true, strength: true, dosageForm: true },
              },
            },
          },
        },
        orderBy: { orderDate: 'desc' },
      })

      const retailerPayments = await prisma.retailerPayment.findMany({
        where: { retailerId: targetRetailer.id },
        orderBy: { paymentDate: 'desc' },
      })

      retailerStatement = {
        retailer: targetRetailer,
        orders: retailerOrders,
        payments: retailerPayments,
      }
    }

    return NextResponse.json({
      summary: {
        totalRetailers,
        activeOrderingRetailers,
        totalOrders,
        totalBilledAmount: Math.round(totalBilledAmount * 100) / 100,
        totalDiscountGiven: Math.round(totalDiscountGiven * 100) / 100,
        totalCollected: Math.round(totalCollected * 100) / 100,
        totalOutstandingDue: Math.round(totalOutstandingDue * 100) / 100,
        totalCreditExtended: Math.round(totalCreditExtended * 100) / 100,
        overCreditLimitCount,
        nearCreditLimitCount,
        fullyPaidCount,
        collectionEfficiency,
        dateRange: { from, to },
      },
      retailers: retailersReport,
      routeBreakdown,
      topWholesaleProducts,
      recentPayments: paymentsInPeriod.slice(0, 20),
      availableRoutes,
      retailerStatement,
    })
  } catch (err: any) {
    console.error('Retailer Reports API error:', err)
    return NextResponse.json({ error: err.message || 'Internal error' }, { status: 500 })
  }
}
