'use client'

import React, { useState, useEffect, useMemo } from 'react'
import {
  Store,
  DollarSign,
  TrendingUp,
  AlertTriangle,
  CheckCircle2,
  Calendar,
  Download,
  RefreshCw,
  Search,
  Filter,
  MapPin,
  CreditCard,
  FileText,
  Clock,
  ArrowUpRight,
  Package,
  ChevronRight,
  X,
  Printer,
  ShieldAlert,
  Percent,
} from 'lucide-react'
import { getLocalDateString } from '@/lib/date-utils'
import { ToastContainer, ToastMessage } from '@/components/Toast'

interface RetailerReportItem {
  id: string
  retailerCode: string
  storeName: string
  ownerName: string
  phone: string
  email?: string
  address: string
  marketRoute: string
  defaultDiscountPercent: number
  creditLimit: number
  currentDue: number
  creditUtilization: number
  riskLevel: 'CRITICAL' | 'WARNING' | 'NORMAL' | 'CLEAR'
  periodOrdersCount: number
  periodBilled: number
  periodDiscount: number
  periodPaid: number
  periodDueAdded: number
  lifetimeOrdersCount: number
  lifetimeBilled: number
  lifetimePaid: number
  lastOrderDate?: string | null
  lastPaymentDate?: string | null
}

interface RouteBreakdown {
  route: string
  retailersCount: number
  ordersCount: number
  totalBilled: number
  totalCollected: number
  totalOutstandingDue: number
  overdueCount: number
}

interface TopProduct {
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

interface RecentPayment {
  id: string
  amount: number
  paymentMethod: string
  referenceNo?: string
  notes?: string
  paymentDate: string
  retailer: {
    id: string
    retailerCode: string
    storeName: string
    marketRoute?: string
  }
}

interface ReportData {
  summary: {
    totalRetailers: number
    activeOrderingRetailers: number
    totalOrders: number
    totalBilledAmount: number
    totalDiscountGiven: number
    totalCollected: number
    totalOutstandingDue: number
    totalCreditExtended: number
    overCreditLimitCount: number
    nearCreditLimitCount: number
    fullyPaidCount: number
    collectionEfficiency: number
    dateRange: { from: string; to: string }
  }
  retailers: RetailerReportItem[]
  routeBreakdown: RouteBreakdown[]
  topWholesaleProducts: TopProduct[]
  recentPayments: RecentPayment[]
  availableRoutes: string[]
}

function formatTaka(val: number) {
  return `৳${val.toLocaleString('en-US', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}`
}

export default function RetailerAdvanceReportsPage() {
  const todayStr = getLocalDateString()
  const defaultFrom = useMemo(() => {
    const d = new Date()
    d.setDate(d.getDate() - 30)
    return getLocalDateString(d)
  }, [])

  const [fromDate, setFromDate] = useState(defaultFrom)
  const [toDate, setToDate] = useState(todayStr)
  const [selectedRoute, setSelectedRoute] = useState('')
  const [selectedRisk, setSelectedRisk] = useState('')
  const [searchQuery, setSearchQuery] = useState('')
  const [sortBy, setSortBy] = useState<'due' | 'billed' | 'utilization' | 'name'>('due')
  const [activeTab, setActiveTab] = useState<'retailers' | 'routes' | 'products' | 'payments'>('retailers')

  const [loading, setLoading] = useState(true)
  const [data, setData] = useState<ReportData | null>(null)
  const [toasts, setToasts] = useState<ToastMessage[]>([])

  // Drilldown modal state
  const [drillRetailerId, setDrillRetailerId] = useState<string | null>(null)
  const [drillLoading, setDrillLoading] = useState(false)
  const [drillData, setDrillData] = useState<any>(null)

  const addToast = (type: 'success' | 'error' | 'info', text: string) => {
    const id = Date.now().toString()
    setToasts((prev) => [...prev, { id, type, text }])
  }

  const dismissToast = (id: string) => {
    setToasts((prev) => prev.filter((t) => t.id !== id))
  }

  const fetchReports = async () => {
    setLoading(true)
    try {
      const params = new URLSearchParams()
      if (fromDate) params.append('from', fromDate)
      if (toDate) params.append('to', toDate)
      if (selectedRoute) params.append('route', selectedRoute)

      const res = await fetch(`/api/wholesale/reports?${params.toString()}`)
      if (!res.ok) throw new Error('Failed to load retailer reports')
      const json = await res.json()
      setData(json)
    } catch (err: any) {
      addToast('error', err.message || 'Error loading report data')
    } finally {
      setLoading(false)
    }
  }

  useEffect(() => {
    fetchReports()
  }, [fromDate, toDate, selectedRoute])

  // Quick Preset Date Ranges
  const applyPreset = (preset: 'today' | '7d' | '30d' | 'thisMonth' | 'all') => {
    const now = new Date()
    const today = getLocalDateString(now)
    if (preset === 'today') {
      setFromDate(today)
      setToDate(today)
    } else if (preset === '7d') {
      const past = new Date(now)
      past.setDate(past.getDate() - 7)
      setFromDate(getLocalDateString(past))
      setToDate(today)
    } else if (preset === '30d') {
      const past = new Date(now)
      past.setDate(past.getDate() - 30)
      setFromDate(getLocalDateString(past))
      setToDate(today)
    } else if (preset === 'thisMonth') {
      const firstDay = new Date(now.getFullYear(), now.getMonth(), 1)
      setFromDate(getLocalDateString(firstDay))
      setToDate(today)
    } else if (preset === 'all') {
      setFromDate('2024-01-01')
      setToDate(today)
    }
  }

  // Drilldown statement fetch
  const openRetailerDrilldown = async (retailerId: string) => {
    setDrillRetailerId(retailerId)
    setDrillLoading(true)
    try {
      const res = await fetch(`/api/wholesale/reports?retailerId=${retailerId}`)
      if (!res.ok) throw new Error('Failed to load statement')
      const json = await res.json()
      setDrillData(json.retailerStatement)
    } catch (err: any) {
      addToast('error', err.message || 'Error loading retailer statement')
    } finally {
      setDrillLoading(false)
    }
  }

  // Filtered & Sorted Retailers
  const filteredRetailers = useMemo(() => {
    if (!data?.retailers) return []
    return data.retailers
      .filter((r) => {
        if (selectedRisk && r.riskLevel !== selectedRisk) return false
        if (searchQuery.trim()) {
          const q = searchQuery.toLowerCase()
          const matchStore = r.storeName.toLowerCase().includes(q)
          const matchCode = r.retailerCode.toLowerCase().includes(q)
          const matchOwner = r.ownerName.toLowerCase().includes(q)
          const matchPhone = r.phone.toLowerCase().includes(q)
          const matchRoute = r.marketRoute.toLowerCase().includes(q)
          if (!matchStore && !matchCode && !matchOwner && !matchPhone && !matchRoute) return false
        }
        return true
      })
      .sort((a, b) => {
        if (sortBy === 'due') return b.currentDue - a.currentDue
        if (sortBy === 'billed') return b.periodBilled - a.periodBilled
        if (sortBy === 'utilization') return b.creditUtilization - a.creditUtilization
        return a.storeName.localeCompare(b.storeName)
      })
  }, [data?.retailers, selectedRisk, searchQuery, sortBy])

  // Export CSV Handler
  const handleExportCSV = () => {
    if (!data?.retailers || data.retailers.length === 0) {
      addToast('info', 'No retailer data to export')
      return
    }

    const headers = [
      'Retailer Code',
      'Store Name',
      'Owner Name',
      'Phone',
      'Market Route',
      'Credit Limit (BDT)',
      'Current Due (BDT)',
      'Credit Utilization %',
      'Risk Status',
      'Period Orders Count',
      'Period Billed (BDT)',
      'Period Discount (BDT)',
      'Period Paid (BDT)',
      'Lifetime Billed (BDT)',
      'Lifetime Paid (BDT)',
      'Last Order Date',
      'Last Payment Date',
    ]

    const rows = filteredRetailers.map((r) => [
      `"${r.retailerCode}"`,
      `"${r.storeName.replace(/"/g, '""')}"`,
      `"${r.ownerName.replace(/"/g, '""')}"`,
      `"${r.phone}"`,
      `"${r.marketRoute}"`,
      r.creditLimit,
      r.currentDue,
      `${r.creditUtilization}%`,
      r.riskLevel,
      r.periodOrdersCount,
      r.periodBilled,
      r.periodDiscount,
      r.periodPaid,
      r.lifetimeBilled,
      r.lifetimePaid,
      r.lastOrderDate || 'N/A',
      r.lastPaymentDate || 'N/A',
    ])

    const csv = [headers.join(','), ...rows.map((r) => r.join(','))].join('\n')
    const blob = new Blob([csv], { type: 'text/csv;charset=utf-8;' })
    const url = URL.createObjectURL(blob)
    const link = document.createElement('a')
    link.href = url
    link.setAttribute('download', `retailer-advance-report-${fromDate}-to-${toDate}.csv`)
    document.body.appendChild(link)
    link.click()
    document.body.removeChild(link)
    addToast('success', 'Retailer report exported as CSV')
  }

  const s = data?.summary

  return (
    <div className="p-4 sm:p-6 space-y-6 max-w-[1600px] mx-auto min-h-screen text-slate-800">
      <ToastContainer toasts={toasts} onDismiss={dismissToast} />

      {/* Header */}
      <div className="flex flex-col lg:flex-row lg:items-center justify-between gap-4 bg-white p-5 rounded-2xl border border-slate-200 shadow-xs">
        <div>
          <div className="flex items-center gap-2">
            <div className="p-2 rounded-xl bg-sky-500/10 border border-sky-500/20 text-sky-600">
              <Store className="w-5 h-5" />
            </div>
            <div>
              <h1 className="text-xl sm:text-2xl font-black text-slate-900 tracking-tight">
                Retailer Advance Reports &amp; Ledger
              </h1>
              <p className="text-xs text-slate-500 font-medium">
                B2B wholesale performance, credit limits, route receivables &amp; retailer analytics
              </p>
            </div>
          </div>
        </div>

        {/* Action Controls */}
        <div className="flex flex-wrap items-center gap-2">
          <button
            onClick={fetchReports}
            disabled={loading}
            className="flex items-center gap-1.5 px-3 py-2 text-xs font-bold text-slate-700 bg-slate-100 hover:bg-slate-200 rounded-xl transition-colors disabled:opacity-50"
          >
            <RefreshCw className={`w-3.5 h-3.5 ${loading ? 'animate-spin' : ''}`} />
            <span>Refresh</span>
          </button>

          <button
            onClick={handleExportCSV}
            className="flex items-center gap-1.5 px-3.5 py-2 text-xs font-bold text-white bg-emerald-600 hover:bg-emerald-500 rounded-xl shadow-xs transition-colors"
          >
            <Download className="w-3.5 h-3.5" />
            <span>Export CSV</span>
          </button>
        </div>
      </div>

      {/* Date & Filter Bar */}
      <div className="bg-white p-4 rounded-2xl border border-slate-200 shadow-xs space-y-3">
        <div className="flex flex-wrap items-center justify-between gap-3">
          {/* Preset Buttons */}
          <div className="flex flex-wrap items-center gap-1.5">
            <span className="text-xs font-bold text-slate-500 mr-1 flex items-center gap-1">
              <Calendar className="w-3.5 h-3.5 text-slate-400" /> Range:
            </span>
            {[
              { id: 'today', label: 'Today' },
              { id: '7d', label: 'Last 7 Days' },
              { id: '30d', label: 'Last 30 Days' },
              { id: 'thisMonth', label: 'This Month' },
              { id: 'all', label: 'All Time' },
            ].map((p) => (
              <button
                key={p.id}
                onClick={() => applyPreset(p.id as any)}
                className="px-2.5 py-1 text-xs font-semibold rounded-lg bg-slate-100 hover:bg-slate-200 text-slate-700 transition-colors"
              >
                {p.label}
              </button>
            ))}
          </div>

          {/* Custom Date Pickers */}
          <div className="flex items-center gap-2 text-xs">
            <input
              type="date"
              value={fromDate}
              onChange={(e) => setFromDate(e.target.value)}
              className="px-2.5 py-1.5 border border-slate-300 rounded-lg text-xs font-medium focus:ring-2 focus:ring-sky-500 outline-none"
            />
            <span className="text-slate-400 font-bold">to</span>
            <input
              type="date"
              value={toDate}
              onChange={(e) => setToDate(e.target.value)}
              className="px-2.5 py-1.5 border border-slate-300 rounded-lg text-xs font-medium focus:ring-2 focus:ring-sky-500 outline-none"
            />
          </div>
        </div>

        {/* Filters & Search Row */}
        <div className="pt-2 border-t border-slate-100 grid grid-cols-1 sm:grid-cols-2 md:grid-cols-4 gap-3">
          {/* Search Box */}
          <div className="relative">
            <Search className="w-3.5 h-3.5 absolute left-3 top-1/2 -translate-y-1/2 text-slate-400" />
            <input
              type="text"
              placeholder="Search store, code, owner, route..."
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              className="w-full pl-8 pr-3 py-1.5 text-xs bg-slate-50 border border-slate-200 rounded-xl focus:bg-white focus:ring-2 focus:ring-sky-500 outline-none"
            />
          </div>

          {/* Route Filter */}
          <div>
            <select
              value={selectedRoute}
              onChange={(e) => setSelectedRoute(e.target.value)}
              className="w-full px-3 py-1.5 text-xs bg-slate-50 border border-slate-200 rounded-xl focus:bg-white focus:ring-2 focus:ring-sky-500 outline-none font-medium text-slate-700"
            >
              <option value="">All Market Routes</option>
              {data?.availableRoutes.map((rt) => (
                <option key={rt} value={rt}>
                  Route: {rt}
                </option>
              ))}
            </select>
          </div>

          {/* Risk Filter */}
          <div>
            <select
              value={selectedRisk}
              onChange={(e) => setSelectedRisk(e.target.value)}
              className="w-full px-3 py-1.5 text-xs bg-slate-50 border border-slate-200 rounded-xl focus:bg-white focus:ring-2 focus:ring-sky-500 outline-none font-medium text-slate-700"
            >
              <option value="">All Credit Statuses</option>
              <option value="CRITICAL">🚨 Exceeded Credit Limit</option>
              <option value="WARNING">⚠️ Near Credit Limit (&gt;80%)</option>
              <option value="NORMAL">Normal Dues (&lt;80%)</option>
              <option value="CLEAR">Fully Paid / Zero Due</option>
            </select>
          </div>

          {/* Sort By */}
          <div>
            <select
              value={sortBy}
              onChange={(e) => setSortBy(e.target.value as any)}
              className="w-full px-3 py-1.5 text-xs bg-slate-50 border border-slate-200 rounded-xl focus:bg-white focus:ring-2 focus:ring-sky-500 outline-none font-medium text-slate-700"
            >
              <option value="due">Sort: Highest Outstanding Due</option>
              <option value="billed">Sort: Highest Period Billed</option>
              <option value="utilization">Sort: Highest Credit Utilization %</option>
              <option value="name">Sort: Store Name (A-Z)</option>
            </select>
          </div>
        </div>
      </div>

      {loading && !data && (
        <div className="py-20 text-center space-y-3">
          <RefreshCw className="w-8 h-8 text-sky-500 animate-spin mx-auto" />
          <p className="text-sm font-semibold text-slate-500">Calculating retailer reports and ledger...</p>
        </div>
      )}

      {data && s && (
        <>
          {/* KPI Cards Grid */}
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
            {/* Card 1: Total Billed */}
            <div className="bg-white rounded-2xl p-5 border border-slate-200 shadow-xs relative overflow-hidden">
              <div className="flex items-center justify-between">
                <span className="text-xs font-bold text-slate-500 uppercase tracking-wider">
                  Wholesale Billed
                </span>
                <div className="p-2 rounded-xl bg-sky-50 text-sky-600">
                  <TrendingUp className="w-4 h-4" />
                </div>
              </div>
              <div className="mt-2 text-2xl font-black font-mono text-slate-900">
                {formatTaka(s.totalBilledAmount)}
              </div>
              <div className="mt-1 flex items-center justify-between text-[11px] text-slate-500">
                <span>{s.totalOrders} wholesale orders</span>
                <span className="text-amber-600 font-semibold">
                  Discounts: {formatTaka(s.totalDiscountGiven)}
                </span>
              </div>
            </div>

            {/* Card 2: Total Collected */}
            <div className="bg-white rounded-2xl p-5 border border-slate-200 shadow-xs relative overflow-hidden">
              <div className="flex items-center justify-between">
                <span className="text-xs font-bold text-slate-500 uppercase tracking-wider">
                  Total Collected
                </span>
                <div className="p-2 rounded-xl bg-emerald-50 text-emerald-600">
                  <CheckCircle2 className="w-4 h-4" />
                </div>
              </div>
              <div className="mt-2 text-2xl font-black font-mono text-emerald-700">
                {formatTaka(s.totalCollected)}
              </div>
              <div className="mt-1 flex items-center justify-between text-[11px]">
                <span className="text-slate-500">Recovery Efficiency</span>
                <span className="font-bold text-emerald-700 bg-emerald-50 px-1.5 py-0.5 rounded">
                  {s.collectionEfficiency}%
                </span>
              </div>
            </div>

            {/* Card 3: Total Outstanding Due */}
            <div className="bg-white rounded-2xl p-5 border border-slate-200 shadow-xs relative overflow-hidden">
              <div className="flex items-center justify-between">
                <span className="text-xs font-bold text-slate-500 uppercase tracking-wider">
                  Total Outstanding Due
                </span>
                <div className="p-2 rounded-xl bg-rose-50 text-rose-600">
                  <AlertTriangle className="w-4 h-4" />
                </div>
              </div>
              <div className="mt-2 text-2xl font-black font-mono text-rose-700">
                {formatTaka(s.totalOutstandingDue)}
              </div>
              <div className="mt-1 flex items-center justify-between text-[11px] text-slate-500">
                <span>Across {s.totalRetailers} retailers</span>
                <span>Limit: {formatTaka(s.totalCreditExtended)}</span>
              </div>
            </div>

            {/* Card 4: Credit Risk Health */}
            <div className="bg-white rounded-2xl p-5 border border-slate-200 shadow-xs relative overflow-hidden">
              <div className="flex items-center justify-between">
                <span className="text-xs font-bold text-slate-500 uppercase tracking-wider">
                  Credit Risk Monitor
                </span>
                <div className="p-2 rounded-xl bg-amber-50 text-amber-600">
                  <ShieldAlert className="w-4 h-4" />
                </div>
              </div>
              <div className="mt-2 flex items-baseline gap-2">
                <span className="text-2xl font-black text-rose-600 font-mono">
                  {s.overCreditLimitCount}
                </span>
                <span className="text-xs font-bold text-slate-500">over limit</span>
                <span className="text-sm font-bold text-amber-600 font-mono ml-auto">
                  +{s.nearCreditLimitCount}
                </span>
                <span className="text-xs text-slate-400">warning</span>
              </div>
              <div className="mt-1 flex items-center justify-between text-[11px] text-slate-500">
                <span className="text-emerald-700 font-semibold">{s.fullyPaidCount} zero debt</span>
                <span>{s.activeOrderingRetailers} active this period</span>
              </div>
            </div>
          </div>

          {/* Navigation Tabs */}
          <div className="flex items-center gap-2 border-b border-slate-200 pb-1">
            <button
              onClick={() => setActiveTab('retailers')}
              className={`flex items-center gap-1.5 px-4 py-2 text-xs font-bold rounded-xl transition-all ${
                activeTab === 'retailers'
                  ? 'bg-sky-600 text-white shadow-xs'
                  : 'text-slate-600 hover:bg-slate-100'
              }`}
            >
              <Store className="w-3.5 h-3.5" />
              <span>Retailer Ledger ({filteredRetailers.length})</span>
            </button>
            <button
              onClick={() => setActiveTab('routes')}
              className={`flex items-center gap-1.5 px-4 py-2 text-xs font-bold rounded-xl transition-all ${
                activeTab === 'routes'
                  ? 'bg-sky-600 text-white shadow-xs'
                  : 'text-slate-600 hover:bg-slate-100'
              }`}
            >
              <MapPin className="w-3.5 h-3.5" />
              <span>Route Analytics ({data.routeBreakdown.length})</span>
            </button>
            <button
              onClick={() => setActiveTab('products')}
              className={`flex items-center gap-1.5 px-4 py-2 text-xs font-bold rounded-xl transition-all ${
                activeTab === 'products'
                  ? 'bg-sky-600 text-white shadow-xs'
                  : 'text-slate-600 hover:bg-slate-100'
              }`}
            >
              <Package className="w-3.5 h-3.5" />
              <span>Top Wholesale Medicines ({data.topWholesaleProducts.length})</span>
            </button>
            <button
              onClick={() => setActiveTab('payments')}
              className={`flex items-center gap-1.5 px-4 py-2 text-xs font-bold rounded-xl transition-all ${
                activeTab === 'payments'
                  ? 'bg-sky-600 text-white shadow-xs'
                  : 'text-slate-600 hover:bg-slate-100'
              }`}
            >
              <CreditCard className="w-3.5 h-3.5" />
              <span>Recent Collections Stream</span>
            </button>
          </div>

          {/* TAB 1: RETAILER LEDGER & PERFORMANCE TABLE */}
          {activeTab === 'retailers' && (
            <div className="bg-white rounded-2xl border border-slate-200 shadow-xs overflow-hidden">
              <div className="overflow-x-auto">
                <table className="w-full text-left text-xs border-collapse">
                  <thead>
                    <tr className="bg-slate-50/80 border-b border-slate-200 text-slate-500 font-bold uppercase tracking-wider text-[10px]">
                      <th className="py-3 px-4">Retailer &amp; Owner</th>
                      <th className="py-3 px-3">Route / Area</th>
                      <th className="py-3 px-3 text-right">Period Billed</th>
                      <th className="py-3 px-3 text-right">Period Paid</th>
                      <th className="py-3 px-4 text-right">Outstanding Due</th>
                      <th className="py-3 px-4">Credit Utilization</th>
                      <th className="py-3 px-3">Status</th>
                      <th className="py-3 px-3">Last Active</th>
                      <th className="py-3 px-4 text-center">Action</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-slate-100">
                    {filteredRetailers.map((r) => {
                      const utilColor =
                        r.riskLevel === 'CRITICAL'
                          ? 'bg-rose-500'
                          : r.riskLevel === 'WARNING'
                          ? 'bg-amber-500'
                          : r.riskLevel === 'NORMAL'
                          ? 'bg-sky-500'
                          : 'bg-emerald-500'

                      return (
                        <tr key={r.id} className="hover:bg-slate-50/80 transition-colors">
                          <td className="py-3 px-4">
                            <div className="font-bold text-slate-900 text-xs flex items-center gap-1.5">
                              <span>{r.storeName}</span>
                              <span className="text-[10px] font-mono text-slate-400 bg-slate-100 px-1 py-0.5 rounded">
                                {r.retailerCode}
                              </span>
                            </div>
                            <div className="text-[11px] text-slate-500">
                              {r.ownerName} &bull; <span className="font-mono">{r.phone}</span>
                            </div>
                          </td>

                          <td className="py-3 px-3">
                            <span className="inline-flex items-center gap-1 text-[11px] font-medium text-slate-700 bg-slate-100 px-2 py-0.5 rounded-md">
                              <MapPin className="w-3 h-3 text-slate-400" />
                              {r.marketRoute}
                            </span>
                          </td>

                          <td className="py-3 px-3 text-right">
                            <div className="font-bold font-mono text-slate-900">
                              {formatTaka(r.periodBilled)}
                            </div>
                            <div className="text-[10px] text-slate-400">
                              {r.periodOrdersCount} orders
                            </div>
                          </td>

                          <td className="py-3 px-3 text-right">
                            <div className="font-bold font-mono text-emerald-700">
                              {formatTaka(r.periodPaid)}
                            </div>
                            {r.periodDiscount > 0 && (
                              <div className="text-[10px] text-amber-600">
                                -{formatTaka(r.periodDiscount)} disc
                              </div>
                            )}
                          </td>

                          <td className="py-3 px-4 text-right">
                            <div
                              className={`font-black font-mono text-sm ${
                                r.currentDue > 0 ? 'text-rose-700' : 'text-emerald-700'
                              }`}
                            >
                              {formatTaka(r.currentDue)}
                            </div>
                            <div className="text-[10px] text-slate-400">
                              Limit: {formatTaka(r.creditLimit)}
                            </div>
                          </td>

                          <td className="py-3 px-4 min-w-[140px]">
                            <div className="flex items-center justify-between text-[11px] font-bold mb-1">
                              <span
                                className={
                                  r.creditUtilization > 100
                                    ? 'text-rose-600'
                                    : r.creditUtilization > 80
                                    ? 'text-amber-600'
                                    : 'text-slate-600'
                                }
                              >
                                {r.creditUtilization}%
                              </span>
                            </div>
                            <div className="w-full h-1.5 bg-slate-100 rounded-full overflow-hidden">
                              <div
                                className={`h-full rounded-full ${utilColor}`}
                                style={{ width: `${Math.min(100, r.creditUtilization)}%` }}
                              />
                            </div>
                          </td>

                          <td className="py-3 px-3">
                            {r.riskLevel === 'CRITICAL' && (
                              <span className="inline-flex items-center gap-1 text-[10px] font-bold text-rose-700 bg-rose-50 border border-rose-200 px-2 py-0.5 rounded-md">
                                <AlertTriangle className="w-3 h-3" /> Exceeded
                              </span>
                            )}
                            {r.riskLevel === 'WARNING' && (
                              <span className="inline-flex items-center gap-1 text-[10px] font-bold text-amber-700 bg-amber-50 border border-amber-200 px-2 py-0.5 rounded-md">
                                ⚠️ Near Limit
                              </span>
                            )}
                            {r.riskLevel === 'NORMAL' && (
                              <span className="inline-flex items-center gap-1 text-[10px] font-bold text-sky-700 bg-sky-50 border border-sky-200 px-2 py-0.5 rounded-md">
                                Normal Due
                              </span>
                            )}
                            {r.riskLevel === 'CLEAR' && (
                              <span className="inline-flex items-center gap-1 text-[10px] font-bold text-emerald-700 bg-emerald-50 border border-emerald-200 px-2 py-0.5 rounded-md">
                                <CheckCircle2 className="w-3 h-3" /> Zero Due
                              </span>
                            )}
                          </td>

                          <td className="py-3 px-3 text-[11px] text-slate-500">
                            <div>Ord: {r.lastOrderDate || '—'}</div>
                            <div>Paid: {r.lastPaymentDate || '—'}</div>
                          </td>

                          <td className="py-3 px-4 text-center">
                            <button
                              onClick={() => openRetailerDrilldown(r.id)}
                              className="inline-flex items-center gap-1 px-2.5 py-1 text-xs font-bold text-sky-700 bg-sky-50 hover:bg-sky-100 rounded-lg transition-colors border border-sky-200"
                            >
                              <FileText className="w-3 h-3" />
                              <span>Statement</span>
                            </button>
                          </td>
                        </tr>
                      )
                    })}

                    {filteredRetailers.length === 0 && (
                      <tr>
                        <td colSpan={9} className="py-12 text-center text-slate-400">
                          No retailers match the selected criteria.
                        </td>
                      </tr>
                    )}
                  </tbody>
                </table>
              </div>
            </div>
          )}

          {/* TAB 2: ROUTE ANALYTICS */}
          {activeTab === 'routes' && (
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
              {data.routeBreakdown.map((rt) => {
                const collRate =
                  rt.totalBilled > 0
                    ? Math.round((rt.totalCollected / rt.totalBilled) * 100)
                    : 100

                return (
                  <div
                    key={rt.route}
                    className="bg-white rounded-2xl p-5 border border-slate-200 shadow-xs space-y-3"
                  >
                    <div className="flex items-center justify-between">
                      <div className="flex items-center gap-2">
                        <div className="p-2 rounded-xl bg-sky-50 text-sky-600">
                          <MapPin className="w-4 h-4" />
                        </div>
                        <div>
                          <h3 className="text-sm font-bold text-slate-900">{rt.route}</h3>
                          <p className="text-[11px] text-slate-500">
                            {rt.retailersCount} retailers &bull; {rt.ordersCount} orders
                          </p>
                        </div>
                      </div>
                      {rt.overdueCount > 0 && (
                        <span className="text-[10px] font-bold text-rose-700 bg-rose-50 border border-rose-200 px-2 py-0.5 rounded-full">
                          {rt.overdueCount} in alert
                        </span>
                      )}
                    </div>

                    <div className="pt-2 border-t border-slate-100 grid grid-cols-2 gap-2 text-xs">
                      <div>
                        <div className="text-[10px] text-slate-400 font-bold uppercase">Billed</div>
                        <div className="font-mono font-bold text-slate-800">
                          {formatTaka(rt.totalBilled)}
                        </div>
                      </div>
                      <div>
                        <div className="text-[10px] text-slate-400 font-bold uppercase">Collected</div>
                        <div className="font-mono font-bold text-emerald-700">
                          {formatTaka(rt.totalCollected)}
                        </div>
                      </div>
                    </div>

                    <div className="p-3 bg-rose-50/60 rounded-xl border border-rose-100 flex items-center justify-between">
                      <span className="text-xs font-bold text-rose-900">Outstanding Due:</span>
                      <span className="text-sm font-black font-mono text-rose-700">
                        {formatTaka(rt.totalOutstandingDue)}
                      </span>
                    </div>

                    <div>
                      <div className="flex justify-between text-[11px] font-semibold text-slate-500 mb-1">
                        <span>Recovery Rate</span>
                        <span>{collRate}%</span>
                      </div>
                      <div className="w-full h-2 bg-slate-100 rounded-full overflow-hidden">
                        <div
                          className="h-full bg-emerald-500 rounded-full transition-all duration-500"
                          style={{ width: `${Math.min(100, collRate)}%` }}
                        />
                      </div>
                    </div>
                  </div>
                )
              })}
            </div>
          )}

          {/* TAB 3: TOP WHOLESALE MEDICINES */}
          {activeTab === 'products' && (
            <div className="bg-white rounded-2xl border border-slate-200 shadow-xs overflow-hidden">
              <div className="px-5 py-4 border-b border-slate-100 flex items-center gap-2">
                <Package className="w-4 h-4 text-sky-600" />
                <h2 className="text-sm font-bold text-slate-900">
                  Most Purchased Medicines by Wholesale Retailers
                </h2>
              </div>
              <div className="overflow-x-auto">
                <table className="w-full text-left text-xs border-collapse">
                  <thead>
                    <tr className="bg-slate-50 border-b border-slate-200 text-slate-500 font-bold uppercase text-[10px]">
                      <th className="py-3 px-4">#</th>
                      <th className="py-3 px-4">Medicine &amp; Strength</th>
                      <th className="py-3 px-4">Generic</th>
                      <th className="py-3 px-4">Manufacturer</th>
                      <th className="py-3 px-4 text-right">Quantity Sold</th>
                      <th className="py-3 px-4 text-right">Orders</th>
                      <th className="py-3 px-4 text-right">Total Revenue</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-slate-100">
                    {data.topWholesaleProducts.map((p, idx) => (
                      <tr key={p.medicineId} className="hover:bg-slate-50">
                        <td className="py-3 px-4 font-mono font-bold text-slate-400">{idx + 1}</td>
                        <td className="py-3 px-4">
                          <div className="font-bold text-slate-900">{p.brandName}</div>
                          <div className="text-[10px] text-slate-500">
                            {p.dosageForm} &bull; {p.strength}
                          </div>
                        </td>
                        <td className="py-3 px-4 text-slate-600">{p.genericName}</td>
                        <td className="py-3 px-4 text-slate-600">{p.manufacturer}</td>
                        <td className="py-3 px-4 text-right font-mono font-bold text-slate-800">
                          {p.totalQuantity} {p.unit}s
                        </td>
                        <td className="py-3 px-4 text-right font-mono text-slate-500">{p.ordersCount}</td>
                        <td className="py-3 px-4 text-right font-mono font-bold text-emerald-700">
                          {formatTaka(p.totalRevenue)}
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            </div>
          )}

          {/* TAB 4: RECENT COLLECTIONS STREAM */}
          {activeTab === 'payments' && (
            <div className="bg-white rounded-2xl border border-slate-200 shadow-xs overflow-hidden">
              <div className="px-5 py-4 border-b border-slate-100 flex items-center gap-2">
                <CreditCard className="w-4 h-4 text-emerald-600" />
                <h2 className="text-sm font-bold text-slate-900">
                  Recent Retailer Payment Receipts
                </h2>
              </div>
              <div className="overflow-x-auto">
                <table className="w-full text-left text-xs border-collapse">
                  <thead>
                    <tr className="bg-slate-50 border-b border-slate-200 text-slate-500 font-bold uppercase text-[10px]">
                      <th className="py-3 px-4">Date</th>
                      <th className="py-3 px-4">Retailer</th>
                      <th className="py-3 px-4">Route</th>
                      <th className="py-3 px-4">Method &amp; Ref</th>
                      <th className="py-3 px-4 text-right">Amount Paid</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-slate-100">
                    {data.recentPayments.map((pmt) => (
                      <tr key={pmt.id} className="hover:bg-slate-50">
                        <td className="py-3 px-4 font-mono font-medium text-slate-600">
                          {pmt.paymentDate}
                        </td>
                        <td className="py-3 px-4 font-bold text-slate-900">
                          {pmt.retailer.storeName}{' '}
                          <span className="text-[10px] font-mono text-slate-400">
                            ({pmt.retailer.retailerCode})
                          </span>
                        </td>
                        <td className="py-3 px-4 text-slate-600">{pmt.retailer.marketRoute || '—'}</td>
                        <td className="py-3 px-4">
                          <span className="font-bold text-slate-700">{pmt.paymentMethod}</span>
                          {pmt.referenceNo && (
                            <span className="text-[10px] font-mono text-slate-400 block">
                              Ref: {pmt.referenceNo}
                            </span>
                          )}
                        </td>
                        <td className="py-3 px-4 text-right font-mono font-bold text-emerald-700 text-sm">
                          {formatTaka(pmt.amount)}
                        </td>
                      </tr>
                    ))}
                    {data.recentPayments.length === 0 && (
                      <tr>
                        <td colSpan={5} className="py-8 text-center text-slate-400">
                          No payment receipts recorded in this period.
                        </td>
                      </tr>
                    )}
                  </tbody>
                </table>
              </div>
            </div>
          )}
        </>
      )}

      {/* DRILLDOWN MODAL: RETAILER STATEMENT */}
      {drillRetailerId && (
        <div className="fixed inset-0 bg-black/60 backdrop-blur-xs flex items-center justify-center p-4 z-50">
          <div className="bg-white rounded-3xl w-full max-w-4xl max-h-[90vh] flex flex-col shadow-2xl overflow-hidden animate-in fade-in zoom-in-95 duration-200">
            {/* Modal Header */}
            <div className="px-6 py-4 border-b border-slate-200 flex items-center justify-between bg-slate-50">
              <div className="flex items-center gap-2">
                <Store className="w-5 h-5 text-sky-600" />
                <div>
                  <h3 className="text-base font-black text-slate-900">
                    {drillData?.retailer.storeName || 'Retailer Statement'}
                  </h3>
                  <p className="text-xs text-slate-500">
                    Proprietor: {drillData?.retailer.ownerName} &bull; Phone:{' '}
                    <span className="font-mono">{drillData?.retailer.phone}</span>
                  </p>
                </div>
              </div>
              <button
                onClick={() => {
                  setDrillRetailerId(null)
                  setDrillData(null)
                }}
                className="p-1.5 rounded-lg hover:bg-slate-200 text-slate-500 transition-colors"
              >
                <X className="w-5 h-5" />
              </button>
            </div>

            {/* Modal Body */}
            <div className="p-6 overflow-y-auto space-y-6 flex-1 text-xs">
              {drillLoading && (
                <div className="py-12 text-center">
                  <RefreshCw className="w-6 h-6 text-sky-500 animate-spin mx-auto" />
                  <p className="text-xs text-slate-400 mt-2">Loading statement history...</p>
                </div>
              )}

              {drillData && (
                <>
                  {/* Summary Box */}
                  <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
                    <div className="p-4 bg-slate-50 rounded-2xl border border-slate-200">
                      <div className="text-[10px] font-bold text-slate-400 uppercase">
                        Current Outstanding Due
                      </div>
                      <div className="text-xl font-black font-mono text-rose-700 mt-1">
                        {formatTaka(drillData.retailer.currentDue)}
                      </div>
                      <div className="text-[10px] text-slate-500 mt-0.5">
                        Credit Limit: {formatTaka(drillData.retailer.creditLimit)}
                      </div>
                    </div>

                    <div className="p-4 bg-slate-50 rounded-2xl border border-slate-200">
                      <div className="text-[10px] font-bold text-slate-400 uppercase">
                        Total Orders
                      </div>
                      <div className="text-xl font-black font-mono text-slate-900 mt-1">
                        {drillData.orders.length}
                      </div>
                      <div className="text-[10px] text-slate-500 mt-0.5">
                        Default Discount: {drillData.retailer.defaultDiscountPercent}%
                      </div>
                    </div>

                    <div className="p-4 bg-slate-50 rounded-2xl border border-slate-200">
                      <div className="text-[10px] font-bold text-slate-400 uppercase">
                        Market Route
                      </div>
                      <div className="text-base font-bold text-slate-800 mt-1 truncate">
                        {drillData.retailer.marketRoute || 'Unassigned'}
                      </div>
                      <div className="text-[10px] text-slate-500 mt-0.5 truncate">
                        {drillData.retailer.address}
                      </div>
                    </div>
                  </div>

                  {/* Order History */}
                  <div>
                    <h4 className="text-xs font-bold text-slate-800 uppercase tracking-wider mb-2 flex items-center gap-1.5">
                      <Package className="w-3.5 h-3.5 text-sky-600" />
                      Order History ({drillData.orders.length})
                    </h4>
                    <div className="border border-slate-200 rounded-xl overflow-hidden">
                      <table className="w-full text-left text-xs border-collapse">
                        <thead>
                          <tr className="bg-slate-50 border-b border-slate-200 text-slate-500 font-bold text-[10px]">
                            <th className="py-2.5 px-3">Order #</th>
                            <th className="py-2.5 px-3">Date</th>
                            <th className="py-2.5 px-3">Status</th>
                            <th className="py-2.5 px-3 text-right">Items</th>
                            <th className="py-2.5 px-3 text-right">Total</th>
                            <th className="py-2.5 px-3 text-right">Paid</th>
                            <th className="py-2.5 px-3 text-right">Due</th>
                          </tr>
                        </thead>
                        <tbody className="divide-y divide-slate-100">
                          {drillData.orders.map((o: any) => (
                            <tr key={o.id}>
                              <td className="py-2 px-3 font-mono font-bold text-slate-800">
                                {o.orderNumber}
                              </td>
                              <td className="py-2 px-3 text-slate-600">{o.orderDate}</td>
                              <td className="py-2 px-3">
                                <span className="text-[10px] font-bold px-1.5 py-0.5 rounded bg-slate-100 text-slate-700">
                                  {o.status}
                                </span>
                              </td>
                              <td className="py-2 px-3 text-right font-mono">{o.items.length}</td>
                              <td className="py-2 px-3 text-right font-mono font-bold text-slate-900">
                                {formatTaka(o.totalAmount)}
                              </td>
                              <td className="py-2 px-3 text-right font-mono text-emerald-700">
                                {formatTaka(o.paidAmount)}
                              </td>
                              <td className="py-2 px-3 text-right font-mono font-bold text-rose-700">
                                {formatTaka(o.dueAmount)}
                              </td>
                            </tr>
                          ))}
                          {drillData.orders.length === 0 && (
                            <tr>
                              <td colSpan={7} className="py-4 text-center text-slate-400">
                                No wholesale orders found.
                              </td>
                            </tr>
                          )}
                        </tbody>
                      </table>
                    </div>
                  </div>

                  {/* Payment History */}
                  <div>
                    <h4 className="text-xs font-bold text-slate-800 uppercase tracking-wider mb-2 flex items-center gap-1.5">
                      <CreditCard className="w-3.5 h-3.5 text-emerald-600" />
                      Payment &amp; Collection History ({drillData.payments.length})
                    </h4>
                    <div className="border border-slate-200 rounded-xl overflow-hidden">
                      <table className="w-full text-left text-xs border-collapse">
                        <thead>
                          <tr className="bg-slate-50 border-b border-slate-200 text-slate-500 font-bold text-[10px]">
                            <th className="py-2.5 px-3">Date</th>
                            <th className="py-2.5 px-3">Method</th>
                            <th className="py-2.5 px-3">Reference No</th>
                            <th className="py-2.5 px-3 text-right">Amount Paid</th>
                          </tr>
                        </thead>
                        <tbody className="divide-y divide-slate-100">
                          {drillData.payments.map((pmt: any) => (
                            <tr key={pmt.id}>
                              <td className="py-2 px-3 font-mono text-slate-600">{pmt.paymentDate}</td>
                              <td className="py-2 px-3 font-bold text-slate-700">{pmt.paymentMethod}</td>
                              <td className="py-2 px-3 font-mono text-slate-500">
                                {pmt.referenceNo || '—'}
                              </td>
                              <td className="py-2 px-3 text-right font-mono font-bold text-emerald-700">
                                {formatTaka(pmt.amount)}
                              </td>
                            </tr>
                          ))}
                          {drillData.payments.length === 0 && (
                            <tr>
                              <td colSpan={4} className="py-4 text-center text-slate-400">
                                No payment records found.
                              </td>
                            </tr>
                          )}
                        </tbody>
                      </table>
                    </div>
                  </div>
                </>
              )}
            </div>

            {/* Modal Footer */}
            <div className="px-6 py-3.5 border-t border-slate-200 bg-slate-50 flex items-center justify-between">
              <button
                onClick={() => window.print()}
                className="flex items-center gap-1.5 px-3 py-1.5 text-xs font-bold text-slate-700 bg-white border border-slate-300 rounded-xl hover:bg-slate-100 transition-colors"
              >
                <Printer className="w-3.5 h-3.5" />
                <span>Print Statement</span>
              </button>
              <button
                onClick={() => {
                  setDrillRetailerId(null)
                  setDrillData(null)
                }}
                className="px-4 py-1.5 text-xs font-bold text-white bg-slate-800 hover:bg-slate-700 rounded-xl transition-colors"
              >
                Close
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  )
}
