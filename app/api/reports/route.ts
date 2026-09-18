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
    const from = searchParams.get('from') || todayStr
    const to = searchParams.get('to') || todayStr

    // Fetch all sales in the date range
    const sales = await prisma.sale.findMany({
      where: {
        saleDate: { gte: from, lte: to },
      },
      include: {
        soldBy: { select: { id: true, name: true, employeeId: true } },
        items: {
          include: {
            medicine: {
              select: {
                id: true,
                brandName: true,
                strength: true,
                dosageForm: true,
                genericName: true,
                mrp: true,
                tradePrice: true,
                manufacturer: { select: { name: true, shortName: true } },
              },
            },
          },
        },
      },
      orderBy: { createdAt: 'desc' },
    })

    // ——— Summary Stats ———
    const totalSales = sales.length
    const totalRevenue = sales.reduce((s, sale) => s + sale.totalAmount, 0)
    const totalDiscount = sales.reduce((s, sale) => s + sale.discountAmount, 0)
    const totalItemsSold = sales.reduce((s, sale) => s + sale.items.length, 0)
    const avgSaleValue = totalSales > 0 ? totalRevenue / totalSales : 0

    // Estimated profit (revenue - trade cost)
    let totalCost = 0
    for (const sale of sales) {
      for (const item of sale.items) {
        const tradeCost = item.medicine.tradePrice || (item.medicine.mrp ? item.medicine.mrp * 0.88 : 0)
        totalCost += tradeCost * item.quantity
      }
    }
    const estimatedProfit = totalRevenue - totalCost

    // ——— Payment Method Breakdown ———
    const paymentBreakdown: Record<string, { count: number; total: number }> = {}
    for (const sale of sales) {
      const pm = sale.paymentMethod
      if (!paymentBreakdown[pm]) paymentBreakdown[pm] = { count: 0, total: 0 }
      paymentBreakdown[pm].count += 1
      paymentBreakdown[pm].total += sale.totalAmount
    }

    // ——— Daily Revenue Trend ———
    const dailyTrend: Record<string, { date: string; sales: number; revenue: number; items: number }> = {}
    for (const sale of sales) {
      const d = sale.saleDate
      if (!dailyTrend[d]) dailyTrend[d] = { date: d, sales: 0, revenue: 0, items: 0 }
      dailyTrend[d].sales += 1
      dailyTrend[d].revenue += sale.totalAmount
      dailyTrend[d].items += sale.items.length
    }
    const dailyTrendArr = Object.values(dailyTrend).sort((a, b) => a.date.localeCompare(b.date))

    // ——— Hourly Sales Pattern ———
    const hourlyPattern: Record<number, { hour: number; sales: number; revenue: number }> = {}
    for (let h = 0; h < 24; h++) {
      hourlyPattern[h] = { hour: h, sales: 0, revenue: 0 }
    }
    for (const sale of sales) {
      const hour = new Date(sale.createdAt).getHours()
      hourlyPattern[hour].sales += 1
      hourlyPattern[hour].revenue += sale.totalAmount
    }
    const hourlyPatternArr = Object.values(hourlyPattern)

    // ——— Top Selling Medicines (by revenue) ———
    const medMap: Record<string, {
      medicineId: string
      brandName: string
      strength: string
      dosageForm: string
      genericName: string
      manufacturer: string
      totalQty: number
      totalRevenue: number
      totalCost: number
      salesCount: number
    }> = {}

    for (const sale of sales) {
      for (const item of sale.items) {
        const mid = item.medicineId
        if (!medMap[mid]) {
          medMap[mid] = {
            medicineId: mid,
            brandName: item.medicine.brandName,
            strength: item.medicine.strength,
            dosageForm: item.medicine.dosageForm,
            genericName: item.medicine.genericName,
            manufacturer: item.medicine.manufacturer?.name || '',
            totalQty: 0,
            totalRevenue: 0,
            totalCost: 0,
            salesCount: 0,
          }
        }
        medMap[mid].totalQty += item.quantity
        medMap[mid].totalRevenue += item.total
        const tc = item.medicine.tradePrice || (item.medicine.mrp ? item.medicine.mrp * 0.88 : 0)
        medMap[mid].totalCost += tc * item.quantity
        medMap[mid].salesCount += 1
      }
    }

    const topMedicines = Object.values(medMap)
      .sort((a, b) => b.totalRevenue - a.totalRevenue)
      .slice(0, 30)

    // ——— Employee Performance ———
    const empMap: Record<string, {
      id: string
      name: string
      employeeId: string
      salesCount: number
      totalRevenue: number
      totalItems: number
    }> = {}

    for (const sale of sales) {
      const emp = sale.soldBy
      if (!emp) continue
      if (!empMap[emp.id]) {
        empMap[emp.id] = {
          id: emp.id,
          name: emp.name,
          employeeId: emp.employeeId,
          salesCount: 0,
          totalRevenue: 0,
          totalItems: 0,
        }
      }
      empMap[emp.id].salesCount += 1
      empMap[emp.id].totalRevenue += sale.totalAmount
      empMap[emp.id].totalItems += sale.items.length
    }

    const employeePerformance = Object.values(empMap).sort((a, b) => b.totalRevenue - a.totalRevenue)

    // ——— Top Manufacturers ———
    const mfgMap: Record<string, { name: string; revenue: number; itemsSold: number }> = {}
    for (const sale of sales) {
      for (const item of sale.items) {
        const mfg = item.medicine.manufacturer?.name || 'Unknown'
        if (!mfgMap[mfg]) mfgMap[mfg] = { name: mfg, revenue: 0, itemsSold: 0 }
        mfgMap[mfg].revenue += item.total
        mfgMap[mfg].itemsSold += item.quantity
      }
    }
    const topManufacturers = Object.values(mfgMap).sort((a, b) => b.revenue - a.revenue).slice(0, 15)

    return NextResponse.json({
      summary: {
        totalSales,
        totalRevenue: Math.round(totalRevenue * 100) / 100,
        totalDiscount: Math.round(totalDiscount * 100) / 100,
        totalItemsSold,
        avgSaleValue: Math.round(avgSaleValue * 100) / 100,
        estimatedProfit: Math.round(estimatedProfit * 100) / 100,
        totalCost: Math.round(totalCost * 100) / 100,
        dateRange: { from, to },
      },
      paymentBreakdown,
      dailyTrend: dailyTrendArr,
      hourlyPattern: hourlyPatternArr,
      topMedicines,
      employeePerformance,
      topManufacturers,
    })
  } catch (err: any) {
    console.error('Reports API error:', err)
    return NextResponse.json({ error: err.message || 'Internal error' }, { status: 500 })
  }
}
