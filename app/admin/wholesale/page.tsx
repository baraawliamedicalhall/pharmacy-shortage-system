import React from 'react'
import Link from 'next/link'
import { prisma } from '@/lib/prisma'
import { getLocalDateString } from '@/lib/date-utils'
import {
  Package,
  Store,
  ShoppingCart,
  PlusCircle,
  CreditCard,
  CheckCircle2,
  Clock,
  ArrowUpRight,
  Printer,
  ChevronRight,
  TrendingUp,
} from 'lucide-react'

export const dynamic = 'force-dynamic'

export default async function WholesaleDashboardPage() {
  const todayStr = getLocalDateString()

  // 1. Fetch metrics
  const totalRetailersCount = await prisma.retailer.count({ where: { isActive: true } })
  const allRetailers = await prisma.retailer.findMany({
    where: { isActive: true },
    select: { currentDue: true, creditLimit: true },
  })
  const totalOutstandingDues = allRetailers.reduce((sum, r) => sum + r.currentDue, 0)

  // Today's orders
  const todayOrders = await prisma.wholesaleOrder.findMany({
    where: { orderDate: todayStr },
    select: { totalAmount: true, paidAmount: true, dueAmount: true },
  })
  const todayRevenue = todayOrders.reduce((sum, o) => sum + o.totalAmount, 0)

  const pendingOrdersCount = await prisma.wholesaleOrder.count({
    where: { status: 'PENDING' },
  })

  // Recent 8 Orders
  const recentOrders = await prisma.wholesaleOrder.findMany({
    take: 8,
    orderBy: { createdAt: 'desc' },
    include: {
      retailer: {
        select: { storeName: true, phone: true, marketRoute: true },
      },
      items: {
        select: { id: true, quantity: true, unit: true },
      },
    },
  })

  // Top 5 Retailers with highest due balance
  const topDueRetailers = await prisma.retailer.findMany({
    where: { isActive: true, currentDue: { gt: 0 } },
    orderBy: { currentDue: 'desc' },
    take: 5,
  })

  // Group by Market Routes
  const marketRoutes = await prisma.retailer.groupBy({
    by: ['marketRoute'],
    _count: { id: true },
    _sum: { currentDue: true },
    where: { isActive: true, marketRoute: { not: null } },
    orderBy: { _count: { id: 'desc' } },
  })

  return (
    <div className="p-4 sm:p-6 lg:p-8 space-y-6 max-w-7xl mx-auto">
      {/* Header */}
      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
        <div>
          <div className="flex items-center gap-2">
            <span className="px-2.5 py-0.5 rounded-full text-xs font-semibold bg-sky-100 text-sky-800 border border-sky-200">
              Wholesale &amp; Distribution
            </span>
            <span className="text-xs text-slate-500 font-medium">B2B Network</span>
          </div>
          <h1 className="text-2xl font-black text-slate-900 tracking-tight mt-1">
            Wholesale Management Hub
          </h1>
          <p className="text-sm text-slate-500">
            Supplying pharmacy retailers with order fulfillment, invoices, and credit tracking.
          </p>
        </div>

        <div className="flex items-center gap-3">
          <Link
            href="/admin/wholesale/orders/new"
            className="inline-flex items-center gap-2 px-4 py-2.5 rounded-xl bg-sky-600 hover:bg-sky-500 text-white font-bold text-sm shadow-md transition-colors"
          >
            <PlusCircle className="w-4 h-4" />
            <span>New Wholesale Order</span>
          </Link>
          <Link
            href="/admin/wholesale/payments"
            className="inline-flex items-center gap-2 px-3.5 py-2.5 rounded-xl bg-slate-900 hover:bg-slate-800 text-white font-bold text-sm shadow-sm transition-colors"
          >
            <CreditCard className="w-4 h-4" />
            <span>Collect Payment</span>
          </Link>
        </div>
      </div>

      {/* KPI Cards */}
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
        {/* Total Retailers */}
        <div className="bg-white rounded-2xl p-5 border border-slate-200 shadow-sm flex flex-col justify-between">
          <div className="flex items-center justify-between">
            <span className="text-xs font-bold uppercase tracking-wider text-slate-500">Active Retailers</span>
            <div className="w-9 h-9 rounded-xl bg-blue-50 text-blue-600 flex items-center justify-center">
              <Store className="w-5 h-5" />
            </div>
          </div>
          <div className="mt-4">
            <div className="text-3xl font-black text-slate-900">{totalRetailersCount} Stores</div>
            <div className="text-xs text-slate-500 mt-1 flex items-center gap-1">
              <span className="text-emerald-600 font-semibold">100% Active</span> across Dhaka &amp; nearby routes
            </div>
          </div>
        </div>

        {/* Today's Wholesale Revenue */}
        <div className="bg-white rounded-2xl p-5 border border-slate-200 shadow-sm flex flex-col justify-between">
          <div className="flex items-center justify-between">
            <span className="text-xs font-bold uppercase tracking-wider text-slate-500">Today&apos;s Wholesale Sales</span>
            <div className="w-9 h-9 rounded-xl bg-emerald-50 text-emerald-600 flex items-center justify-center">
              <TrendingUp className="w-5 h-5" />
            </div>
          </div>
          <div className="mt-4">
            <div className="text-3xl font-black text-slate-900">
              ৳ {todayRevenue.toLocaleString('en-US', { minimumFractionDigits: 2 })}
            </div>
            <div className="text-xs text-slate-500 mt-1">
              {todayOrders.length} orders billed today
            </div>
          </div>
        </div>

        {/* Outstanding Dues */}
        <div className="bg-white rounded-2xl p-5 border border-slate-200 shadow-sm flex flex-col justify-between">
          <div className="flex items-center justify-between">
            <span className="text-xs font-bold uppercase tracking-wider text-slate-500">Total Outstanding Dues</span>
            <div className="w-9 h-9 rounded-xl bg-amber-50 text-amber-600 flex items-center justify-center">
              <CreditCard className="w-5 h-5" />
            </div>
          </div>
          <div className="mt-4">
            <div className="text-3xl font-black text-amber-600">
              ৳ {totalOutstandingDues.toLocaleString('en-US', { minimumFractionDigits: 2 })}
            </div>
            <div className="text-xs text-slate-500 mt-1">
              Receivable across retailer credit accounts
            </div>
          </div>
        </div>

        {/* Pending Deliveries */}
        <div className="bg-white rounded-2xl p-5 border border-slate-200 shadow-sm flex flex-col justify-between">
          <div className="flex items-center justify-between">
            <span className="text-xs font-bold uppercase tracking-wider text-slate-500">Pending Orders</span>
            <div className="w-9 h-9 rounded-xl bg-rose-50 text-rose-600 flex items-center justify-center">
              <Clock className="w-5 h-5" />
            </div>
          </div>
          <div className="mt-4">
            <div className="text-3xl font-black text-slate-900">{pendingOrdersCount} Orders</div>
            <div className="text-xs text-slate-500 mt-1">
              Awaiting packing &amp; delivery chalan
            </div>
          </div>
        </div>
      </div>

      {/* Main Grid: Recent Orders & Retailer Due Tracking */}
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        {/* Left 2 Cols: Recent Wholesale Orders */}
        <div className="lg:col-span-2 bg-white rounded-2xl border border-slate-200 shadow-sm overflow-hidden flex flex-col">
          <div className="px-5 py-4 border-b border-slate-100 flex items-center justify-between">
            <div>
              <h2 className="text-base font-bold text-slate-900">Recent Wholesale Orders</h2>
              <p className="text-xs text-slate-500">Latest invoices and delivery dispatches</p>
            </div>
            <Link
              href="/admin/wholesale/orders"
              className="text-xs font-bold text-sky-600 hover:text-sky-700 flex items-center gap-1"
            >
              <span>View All</span>
              <ArrowUpRight className="w-3.5 h-3.5" />
            </Link>
          </div>

          <div className="overflow-x-auto flex-1">
            <table className="w-full text-left border-collapse text-xs">
              <thead>
                <tr className="bg-slate-50 text-slate-500 border-b border-slate-100 font-bold uppercase tracking-wider">
                  <th className="py-3 px-4">Order #</th>
                  <th className="py-3 px-4">Retailer / Store</th>
                  <th className="py-3 px-4">Items</th>
                  <th className="py-3 px-4 text-right">Total Amount</th>
                  <th className="py-3 px-4 text-center">Status</th>
                  <th className="py-3 px-4 text-center">Action</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-100 font-medium text-slate-700">
                {recentOrders.length === 0 ? (
                  <tr>
                    <td colSpan={6} className="text-center py-8 text-slate-400">
                      No wholesale orders placed yet.
                    </td>
                  </tr>
                ) : (
                  recentOrders.map((order) => {
                    const statusColors: any = {
                      PENDING: 'bg-amber-100 text-amber-800 border-amber-200',
                      CONFIRMED: 'bg-blue-100 text-blue-800 border-blue-200',
                      PACKED: 'bg-purple-100 text-purple-800 border-purple-200',
                      DELIVERED: 'bg-emerald-100 text-emerald-800 border-emerald-200',
                      CANCELLED: 'bg-slate-100 text-slate-600 border-slate-200',
                    }

                    return (
                      <tr key={order.id} className="hover:bg-slate-50/80 transition-colors">
                        <td className="py-3 px-4 font-mono font-bold text-slate-900">
                          {order.orderNumber}
                        </td>
                        <td className="py-3 px-4">
                          <div className="font-bold text-slate-900">{order.retailer.storeName}</div>
                          <div className="text-[11px] text-slate-400">{order.retailer.marketRoute}</div>
                        </td>
                        <td className="py-3 px-4 text-slate-600">
                          {order.items.length} items ({order.items.reduce((s, i) => s + i.quantity, 0)} units)
                        </td>
                        <td className="py-3 px-4 text-right font-mono font-bold text-slate-900">
                          ৳ {order.totalAmount.toLocaleString('en-US', { minimumFractionDigits: 2 })}
                          {order.dueAmount > 0 && (
                            <div className="text-[10px] text-amber-600 font-normal">
                              Due: ৳ {order.dueAmount.toLocaleString()}
                            </div>
                          )}
                        </td>
                        <td className="py-3 px-4 text-center">
                          <span
                            className={`inline-block px-2 py-0.5 rounded-full text-[10px] font-bold border ${
                              statusColors[order.status] || 'bg-slate-100 text-slate-700'
                            }`}
                          >
                            {order.status}
                          </span>
                        </td>
                        <td className="py-3 px-4 text-center">
                          <Link
                            href={`/admin/wholesale/invoices/${order.id}`}
                            className="inline-flex items-center gap-1 px-2.5 py-1 rounded-lg text-xs font-semibold bg-slate-100 hover:bg-slate-200 text-slate-700 transition-colors"
                          >
                            <Printer className="w-3.5 h-3.5" />
                            <span>Invoice</span>
                          </Link>
                        </td>
                      </tr>
                    )
                  })
                )}
              </tbody>
            </table>
          </div>
        </div>

        {/* Right 1 Col: Top Retailer Dues & Quick Actions */}
        <div className="space-y-6">
          {/* Top Due Accounts */}
          <div className="bg-white rounded-2xl border border-slate-200 shadow-sm p-5">
            <div className="flex items-center justify-between mb-4">
              <div>
                <h3 className="text-sm font-bold text-slate-900">Top Outstanding Receivables</h3>
                <p className="text-xs text-slate-500">Retailers with highest credit dues</p>
              </div>
              <Link
                href="/admin/wholesale/retailers"
                className="text-xs font-bold text-sky-600 hover:underline"
              >
                All (35)
              </Link>
            </div>

            <div className="space-y-3.5">
              {topDueRetailers.map((ret) => {
                const ratio = Math.min(100, Math.round((ret.currentDue / (ret.creditLimit || 50000)) * 100))
                const isOverLimit = ret.currentDue > ret.creditLimit

                return (
                  <div key={ret.id} className="p-3 rounded-xl bg-slate-50 border border-slate-100 space-y-1.5">
                    <div className="flex items-center justify-between text-xs">
                      <div className="font-bold text-slate-900 truncate">{ret.storeName}</div>
                      <div className="font-mono font-bold text-amber-700">
                        ৳ {ret.currentDue.toLocaleString()}
                      </div>
                    </div>
                    <div className="flex items-center justify-between text-[11px] text-slate-500">
                      <span>Route: {ret.marketRoute || 'N/A'}</span>
                      <span>Limit: ৳ {ret.creditLimit.toLocaleString()}</span>
                    </div>
                    <div className="w-full bg-slate-200 rounded-full h-1.5 overflow-hidden">
                      <div
                        className={`h-1.5 rounded-full ${
                          isOverLimit ? 'bg-rose-500' : ratio > 75 ? 'bg-amber-500' : 'bg-emerald-500'
                        }`}
                        style={{ width: `${ratio}%` }}
                      />
                    </div>
                  </div>
                )
              })}
            </div>
          </div>

          {/* Market Routes Coverage */}
          <div className="bg-white rounded-2xl border border-slate-200 shadow-sm p-5">
            <h3 className="text-sm font-bold text-slate-900 mb-1">Market Route Distribution</h3>
            <p className="text-xs text-slate-500 mb-4">Retailer coverage by geographical territories</p>

            <div className="space-y-2.5">
              {marketRoutes.slice(0, 5).map((route) => (
                <div
                  key={route.marketRoute || 'Other'}
                  className="flex items-center justify-between py-1.5 border-b border-slate-100 last:border-0 text-xs"
                >
                  <span className="font-medium text-slate-700">{route.marketRoute || 'Unassigned'}</span>
                  <div className="flex items-center gap-2">
                    <span className="px-2 py-0.5 rounded-md bg-slate-100 text-slate-600 font-bold text-[11px]">
                      {route._count.id} Stores
                    </span>
                    <span className="font-mono text-slate-500 font-semibold text-[11px]">
                      ৳ {((route._sum.currentDue || 0) / 1000).toFixed(1)}k due
                    </span>
                  </div>
                </div>
              ))}
            </div>
          </div>
        </div>
      </div>
    </div>
  )
}
