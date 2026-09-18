'use client'

import React, { useState, useEffect, useMemo } from 'react'
import {
  TrendingUp,
  TrendingDown,
  DollarSign,
  ShoppingCart,
  Package,
  Users,
  Clock,
  Calendar,
  Download,
  RefreshCw,
  Banknote,
  Smartphone,
  Landmark,
  BarChart3,
  PieChart,
  ArrowUpRight,
  Pill,
  Building2,
  Receipt,
  Percent,
  Target,
} from 'lucide-react'
import { getLocalDateString } from '@/lib/date-utils'
import { ToastContainer, ToastMessage } from '@/components/Toast'

interface ReportData {
  summary: {
    totalSales: number
    totalRevenue: number
    totalDiscount: number
    totalItemsSold: number
    avgSaleValue: number
    estimatedProfit: number
    totalCost: number
    dateRange: { from: string; to: string }
  }
  paymentBreakdown: Record<string, { count: number; total: number }>
  dailyTrend: Array<{ date: string; sales: number; revenue: number; items: number }>
  hourlyPattern: Array<{ hour: number; sales: number; revenue: number }>
  topMedicines: Array<{
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
  }>
  employeePerformance: Array<{
    id: string
    name: string
    employeeId: string
    salesCount: number
    totalRevenue: number
    totalItems: number
  }>
  topManufacturers: Array<{ name: string; revenue: number; itemsSold: number }>
}

// Simple bar chart using pure CSS
function MiniBar({ value, max, color = 'sky' }: { value: number; max: number; color?: string }) {
  const pct = max > 0 ? Math.min(100, (value / max) * 100) : 0
  const colorMap: Record<string, string> = {
    sky: 'bg-sky-500',
    emerald: 'bg-emerald-500',
    amber: 'bg-amber-500',
    pink: 'bg-pink-500',
    indigo: 'bg-indigo-500',
    violet: 'bg-violet-500',
  }
  return (
    <div className="w-full h-2 bg-slate-100 rounded-full overflow-hidden">
      <div
        className={`h-full rounded-full ${colorMap[color] || 'bg-sky-500'} transition-all duration-500`}
        style={{ width: `${pct}%` }}
      />
    </div>
  )
}

function formatTaka(val: number) {
  return `৳${val.toLocaleString('en-US', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}`
}

function formatHour(h: number) {
  if (h === 0) return '12AM'
  if (h < 12) return `${h}AM`
  if (h === 12) return '12PM'
  return `${h - 12}PM`
}

export default function AdvancedReportsPage() {
  const todayStr = getLocalDateString()

  // Quick presets
  const getDateRange = (preset: string) => {
    const today = new Date()
    switch (preset) {
      case 'today':
        return { from: todayStr, to: todayStr }
      case 'yesterday': {
        const y = new Date(today)
        y.setDate(y.getDate() - 1)
        return { from: getLocalDateString(y), to: getLocalDateString(y) }
      }
      case 'week': {
        const w = new Date(today)
        w.setDate(w.getDate() - 6)
        return { from: getLocalDateString(w), to: todayStr }
      }
      case 'month': {
        const m = new Date(today)
        m.setDate(m.getDate() - 29)
        return { from: getLocalDateString(m), to: todayStr }
      }
      default:
        return { from: todayStr, to: todayStr }
    }
  }

  const [fromDate, setFromDate] = useState(todayStr)
  const [toDate, setToDate] = useState(todayStr)
  const [activePreset, setActivePreset] = useState('today')
  const [data, setData] = useState<ReportData | null>(null)
  const [loading, setLoading] = useState(true)
  const [toasts, setToasts] = useState<ToastMessage[]>([])

  const addToast = (type: 'success' | 'error' | 'info', text: string) => {
    setToasts((prev) => [...prev, { id: Date.now().toString(), type, text }])
  }

  const loadReport = async (from: string, to: string) => {
    setLoading(true)
    try {
      const res = await fetch(`/api/reports?from=${from}&to=${to}`)
      const json = await res.json()
      if (res.ok) {
        setData(json)
      } else {
        addToast('error', json.error || 'Failed to load report')
      }
    } catch {
      addToast('error', 'Network error loading report')
    } finally {
      setLoading(false)
    }
  }

  useEffect(() => {
    loadReport(fromDate, toDate)
  }, [])

  const applyPreset = (preset: string) => {
    setActivePreset(preset)
    const { from, to } = getDateRange(preset)
    setFromDate(from)
    setToDate(to)
    loadReport(from, to)
  }

  const handleCustomSearch = () => {
    setActivePreset('custom')
    loadReport(fromDate, toDate)
  }

  // Derived data
  const peakHour = useMemo(() => {
    if (!data?.hourlyPattern) return null
    return data.hourlyPattern.reduce((best, h) => (h.sales > best.sales ? h : best), data.hourlyPattern[0])
  }, [data])

  const maxHourlySales = useMemo(() => {
    if (!data?.hourlyPattern) return 1
    return Math.max(...data.hourlyPattern.map((h) => h.sales), 1)
  }, [data])

  const maxMedRevenue = useMemo(() => {
    if (!data?.topMedicines?.length) return 1
    return data.topMedicines[0]?.totalRevenue || 1
  }, [data])

  const profitMargin = useMemo(() => {
    if (!data?.summary?.totalRevenue) return 0
    return (data.summary.estimatedProfit / data.summary.totalRevenue) * 100
  }, [data])

  // CSV Export
  const handleExport = () => {
    if (!data) return
    const rows = [
      ['POS Sales Report'],
      [`Date Range: ${fromDate} to ${toDate}`],
      [],
      ['SUMMARY'],
      ['Total Sales', data.summary.totalSales],
      ['Total Revenue', data.summary.totalRevenue],
      ['Total Discount', data.summary.totalDiscount],
      ['Estimated Profit', data.summary.estimatedProfit],
      ['Avg Sale Value', data.summary.avgSaleValue],
      [],
      ['TOP MEDICINES'],
      ['Brand', 'Strength', 'Form', 'Generic', 'Manufacturer', 'Qty Sold', 'Revenue', 'Profit'],
      ...data.topMedicines.map((m) => [
        m.brandName,
        m.strength,
        m.dosageForm,
        m.genericName,
        m.manufacturer,
        m.totalQty,
        m.totalRevenue.toFixed(2),
        (m.totalRevenue - m.totalCost).toFixed(2),
      ]),
      [],
      ['EMPLOYEE PERFORMANCE'],
      ['Name', 'ID', 'Sales Count', 'Revenue', 'Items Sold'],
      ...data.employeePerformance.map((e) => [e.name, e.employeeId, e.salesCount, e.totalRevenue.toFixed(2), e.totalItems]),
    ]

    const csv = rows.map((r) => (Array.isArray(r) ? r.map((c) => `"${c}"`).join(',') : `"${r}"`)).join('\n')
    const blob = new Blob([csv], { type: 'text/csv;charset=utf-8;' })
    const url = URL.createObjectURL(blob)
    const link = document.createElement('a')
    link.href = url
    link.setAttribute('download', `sales-report-${fromDate}-to-${toDate}.csv`)
    document.body.appendChild(link)
    link.click()
    document.body.removeChild(link)
    addToast('success', 'Report exported as CSV')
  }

  const paymentIcons: Record<string, React.ReactNode> = {
    CASH: <Banknote className="w-4 h-4 text-emerald-600" />,
    BKASH: <Smartphone className="w-4 h-4 text-pink-600" />,
    BANK: <Landmark className="w-4 h-4 text-sky-600" />,
    CREDIT: <Receipt className="w-4 h-4 text-amber-600" />,
  }

  const paymentLabels: Record<string, string> = {
    CASH: 'Cash',
    BKASH: 'bKash',
    BANK: 'Card/Bank',
    CREDIT: 'Credit',
  }

  const paymentColors: Record<string, string> = {
    CASH: 'emerald',
    BKASH: 'pink',
    BANK: 'sky',
    CREDIT: 'amber',
  }

  const s = data?.summary

  return (
    <div className="space-y-6">
      <ToastContainer toasts={toasts} onDismiss={(id) => setToasts((prev) => prev.filter((t) => t.id !== id))} />

      {/* Header */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3">
        <div>
          <h1 className="text-2xl font-black text-slate-900 tracking-tight flex items-center gap-2">
            <BarChart3 className="w-6 h-6 text-sky-600" />
            Sales Analytics
          </h1>
          <p className="text-xs text-slate-500 mt-0.5">
            Revenue, profit margins, top products, employee performance &amp; trends
          </p>
        </div>
        <button
          onClick={handleExport}
          disabled={!data || loading}
          className="px-4 py-2 bg-slate-800 hover:bg-slate-900 text-white font-bold rounded-xl text-xs shadow-xs flex items-center gap-1.5 transition-colors cursor-pointer disabled:opacity-40"
        >
          <Download className="w-4 h-4" />
          <span>Export CSV</span>
        </button>
      </div>

      {/* Date Range Controls */}
      <div className="bg-white rounded-2xl p-4 shadow-xs border border-slate-200">
        <div className="flex flex-wrap items-center gap-2 mb-3">
          {[
            { key: 'today', label: 'Today' },
            { key: 'yesterday', label: 'Yesterday' },
            { key: 'week', label: 'Last 7 Days' },
            { key: 'month', label: 'Last 30 Days' },
          ].map(({ key, label }) => (
            <button
              key={key}
              onClick={() => applyPreset(key)}
              className={`px-3 py-1.5 rounded-lg text-xs font-bold transition-colors cursor-pointer ${
                activePreset === key
                  ? 'bg-sky-600 text-white shadow-sm'
                  : 'bg-slate-100 text-slate-600 hover:bg-slate-200'
              }`}
            >
              {label}
            </button>
          ))}
        </div>

        <div className="flex flex-wrap items-end gap-3">
          <div>
            <label className="text-[10px] font-bold text-slate-500 uppercase tracking-wider block mb-1">From</label>
            <input
              type="date"
              value={fromDate}
              onChange={(e) => setFromDate(e.target.value)}
              className="h-9 px-3 bg-slate-50 border border-slate-300 rounded-lg text-xs font-bold text-slate-800"
            />
          </div>
          <div>
            <label className="text-[10px] font-bold text-slate-500 uppercase tracking-wider block mb-1">To</label>
            <input
              type="date"
              value={toDate}
              onChange={(e) => setToDate(e.target.value)}
              className="h-9 px-3 bg-slate-50 border border-slate-300 rounded-lg text-xs font-bold text-slate-800"
            />
          </div>
          <button
            onClick={handleCustomSearch}
            disabled={loading}
            className="h-9 px-4 bg-sky-600 hover:bg-sky-700 text-white font-bold rounded-lg text-xs flex items-center gap-1.5 transition-colors cursor-pointer disabled:opacity-40"
          >
            {loading ? <RefreshCw className="w-3.5 h-3.5 animate-spin" /> : <BarChart3 className="w-3.5 h-3.5" />}
            <span>Generate</span>
          </button>
        </div>
      </div>

      {loading ? (
        <div className="py-24 text-center text-sm text-slate-400">
          <RefreshCw className="w-6 h-6 animate-spin mx-auto mb-2 text-sky-500" />
          Analyzing sales data...
        </div>
      ) : !data || !s ? (
        <div className="py-24 text-center text-sm text-slate-400">No data available.</div>
      ) : (
        <>
          {/* KPI Cards */}
          <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-6 gap-3">
            {[
              { label: 'Revenue', value: formatTaka(s.totalRevenue), icon: DollarSign, color: 'text-emerald-600', bg: 'bg-emerald-50' },
              { label: 'Profit', value: formatTaka(s.estimatedProfit), icon: TrendingUp, color: 'text-sky-600', bg: 'bg-sky-50' },
              { label: 'Sales', value: String(s.totalSales), icon: ShoppingCart, color: 'text-violet-600', bg: 'bg-violet-50' },
              { label: 'Items Sold', value: String(s.totalItemsSold), icon: Package, color: 'text-amber-600', bg: 'bg-amber-50' },
              { label: 'Avg Sale', value: formatTaka(s.avgSaleValue), icon: Target, color: 'text-pink-600', bg: 'bg-pink-50' },
              { label: 'Margin', value: `${profitMargin.toFixed(1)}%`, icon: Percent, color: 'text-indigo-600', bg: 'bg-indigo-50' },
            ].map(({ label, value, icon: Icon, color, bg }) => (
              <div key={label} className="bg-white rounded-xl p-3.5 shadow-xs border border-slate-200">
                <div className="flex items-center gap-2 mb-2">
                  <div className={`p-1.5 rounded-lg ${bg}`}>
                    <Icon className={`w-3.5 h-3.5 ${color}`} />
                  </div>
                  <span className="text-[10px] font-bold text-slate-500 uppercase tracking-wider">{label}</span>
                </div>
                <div className="text-lg font-black text-slate-900 leading-none font-mono">{value}</div>
              </div>
            ))}
          </div>

          {/* Payment Breakdown + Hourly Pattern Row */}
          <div className="grid grid-cols-1 lg:grid-cols-2 gap-4">
            {/* Payment Breakdown */}
            <div className="bg-white rounded-2xl shadow-xs border border-slate-200 overflow-hidden">
              <div className="px-4 py-3 border-b border-slate-100 flex items-center gap-2">
                <PieChart className="w-4 h-4 text-sky-600" />
                <h2 className="text-sm font-bold text-slate-900">Payment Methods</h2>
              </div>
              <div className="p-4 space-y-3">
                {Object.entries(data.paymentBreakdown).map(([method, info]) => {
                  const pct = s.totalRevenue > 0 ? (info.total / s.totalRevenue) * 100 : 0
                  return (
                    <div key={method} className="flex items-center gap-3">
                      <div className="shrink-0">{paymentIcons[method] || <Banknote className="w-4 h-4 text-slate-400" />}</div>
                      <div className="flex-1 min-w-0">
                        <div className="flex items-center justify-between mb-1">
                          <span className="text-xs font-bold text-slate-800">{paymentLabels[method] || method}</span>
                          <span className="text-xs font-mono font-bold text-slate-600">{formatTaka(info.total)}</span>
                        </div>
                        <MiniBar value={info.total} max={s.totalRevenue} color={paymentColors[method] || 'sky'} />
                        <div className="flex justify-between mt-0.5 text-[10px] text-slate-400">
                          <span>{info.count} sales</span>
                          <span>{pct.toFixed(1)}%</span>
                        </div>
                      </div>
                    </div>
                  )
                })}
                {Object.keys(data.paymentBreakdown).length === 0 && (
                  <div className="text-xs text-slate-400 text-center py-4">No payment data</div>
                )}
              </div>
            </div>

            {/* Hourly Sales Pattern */}
            <div className="bg-white rounded-2xl shadow-xs border border-slate-200 overflow-hidden">
              <div className="px-4 py-3 border-b border-slate-100 flex items-center justify-between">
                <div className="flex items-center gap-2">
                  <Clock className="w-4 h-4 text-sky-600" />
                  <h2 className="text-sm font-bold text-slate-900">Hourly Sales</h2>
                </div>
                {peakHour && peakHour.sales > 0 && (
                  <span className="text-[10px] px-2 py-0.5 rounded-full bg-amber-50 text-amber-700 border border-amber-200 font-bold">
                    Peak: {formatHour(peakHour.hour)} ({peakHour.sales} sales)
                  </span>
                )}
              </div>
              <div className="p-4">
                <div className="flex items-end gap-[2px] h-32">
                  {data.hourlyPattern
                    .filter((h) => h.hour >= 6 && h.hour <= 23)
                    .map((h) => {
                      const pct = maxHourlySales > 0 ? (h.sales / maxHourlySales) * 100 : 0
                      const isPeak = peakHour && h.hour === peakHour.hour && h.sales > 0
                      return (
                        <div
                          key={h.hour}
                          className="flex-1 flex flex-col items-center justify-end group relative"
                        >
                          <div
                            className={`w-full rounded-t transition-all ${
                              isPeak ? 'bg-amber-400' : h.sales > 0 ? 'bg-sky-400' : 'bg-slate-100'
                            } group-hover:opacity-80`}
                            style={{ height: `${Math.max(pct, h.sales > 0 ? 4 : 0)}%`, minHeight: h.sales > 0 ? '4px' : '0px' }}
                            title={`${formatHour(h.hour)}: ${h.sales} sales, ${formatTaka(h.revenue)}`}
                          />
                          <span className="text-[8px] text-slate-400 mt-1 leading-none">
                            {h.hour % 3 === 0 ? formatHour(h.hour) : ''}
                          </span>
                        </div>
                      )
                    })}
                </div>
              </div>
            </div>
          </div>

          {/* Daily Revenue Trend */}
          {data.dailyTrend.length > 1 && (
            <div className="bg-white rounded-2xl shadow-xs border border-slate-200 overflow-hidden">
              <div className="px-4 py-3 border-b border-slate-100 flex items-center gap-2">
                <TrendingUp className="w-4 h-4 text-sky-600" />
                <h2 className="text-sm font-bold text-slate-900">Daily Revenue Trend</h2>
              </div>
              <div className="p-4 overflow-x-auto">
                <table className="w-full text-xs">
                  <thead>
                    <tr className="text-slate-500 border-b border-slate-100 text-[10px] font-bold uppercase tracking-wider">
                      <th className="py-2 px-3 text-left">Date</th>
                      <th className="py-2 px-3 text-right">Sales</th>
                      <th className="py-2 px-3 text-right">Revenue</th>
                      <th className="py-2 px-3 text-right">Items</th>
                      <th className="py-2 px-3 w-48"></th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-slate-50">
                    {data.dailyTrend.map((d) => {
                      const maxRev = Math.max(...data.dailyTrend.map((x) => x.revenue), 1)
                      return (
                        <tr key={d.date} className="hover:bg-slate-50/50">
                          <td className="py-2 px-3 font-mono font-bold text-slate-700">{d.date}</td>
                          <td className="py-2 px-3 text-right font-bold text-slate-600">{d.sales}</td>
                          <td className="py-2 px-3 text-right font-mono font-bold text-emerald-700">{formatTaka(d.revenue)}</td>
                          <td className="py-2 px-3 text-right text-slate-500">{d.items}</td>
                          <td className="py-2 px-3">
                            <MiniBar value={d.revenue} max={maxRev} color="emerald" />
                          </td>
                        </tr>
                      )
                    })}
                  </tbody>
                </table>
              </div>
            </div>
          )}

          {/* Top Selling Medicines */}
          <div className="bg-white rounded-2xl shadow-xs border border-slate-200 overflow-hidden">
            <div className="px-4 py-3 border-b border-slate-100 flex items-center justify-between">
              <div className="flex items-center gap-2">
                <Pill className="w-4 h-4 text-sky-600" />
                <h2 className="text-sm font-bold text-slate-900">Top Selling Medicines</h2>
              </div>
              <span className="text-[10px] text-slate-400 font-medium">By revenue</span>
            </div>
            <div className="overflow-x-auto">
              <table className="w-full text-xs">
                <thead>
                  <tr className="bg-slate-50 text-slate-500 border-b border-slate-200 text-[10px] font-bold uppercase tracking-wider">
                    <th className="py-2.5 px-3 w-10 text-center">#</th>
                    <th className="py-2.5 px-3 text-left">Medicine</th>
                    <th className="py-2.5 px-3 text-left">Manufacturer</th>
                    <th className="py-2.5 px-3 text-right">Qty</th>
                    <th className="py-2.5 px-3 text-right">Revenue</th>
                    <th className="py-2.5 px-3 text-right">Profit</th>
                    <th className="py-2.5 px-3 w-32"></th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-slate-100">
                  {data.topMedicines.map((med, idx) => {
                    const profit = med.totalRevenue - med.totalCost
                    const margin = med.totalRevenue > 0 ? (profit / med.totalRevenue) * 100 : 0
                    return (
                      <tr key={med.medicineId} className="hover:bg-slate-50/50">
                        <td className="py-2.5 px-3 text-center font-bold text-slate-400">{idx + 1}</td>
                        <td className="py-2.5 px-3">
                          <div className="font-bold text-slate-900">
                            {med.brandName} <span className="text-sky-600 font-normal">{med.strength}</span>
                          </div>
                          <div className="text-[10px] text-slate-400">{med.genericName} &bull; {med.dosageForm}</div>
                        </td>
                        <td className="py-2.5 px-3 text-slate-600 font-medium">{med.manufacturer}</td>
                        <td className="py-2.5 px-3 text-right font-mono font-bold text-slate-700">{med.totalQty}</td>
                        <td className="py-2.5 px-3 text-right font-mono font-bold text-emerald-700">{formatTaka(med.totalRevenue)}</td>
                        <td className={`py-2.5 px-3 text-right font-mono font-bold ${profit >= 0 ? 'text-sky-700' : 'text-rose-600'}`}>
                          {formatTaka(profit)}
                          <span className="text-[9px] text-slate-400 ml-1">({margin.toFixed(0)}%)</span>
                        </td>
                        <td className="py-2.5 px-3">
                          <MiniBar value={med.totalRevenue} max={maxMedRevenue} color="sky" />
                        </td>
                      </tr>
                    )
                  })}
                  {data.topMedicines.length === 0 && (
                    <tr>
                      <td colSpan={7} className="text-center py-8 text-slate-400 text-xs">
                        No medicine sales data for this period
                      </td>
                    </tr>
                  )}
                </tbody>
              </table>
            </div>
          </div>

          {/* Employee Performance + Top Manufacturers Row */}
          <div className="grid grid-cols-1 lg:grid-cols-2 gap-4">
            {/* Employee Performance */}
            <div className="bg-white rounded-2xl shadow-xs border border-slate-200 overflow-hidden">
              <div className="px-4 py-3 border-b border-slate-100 flex items-center gap-2">
                <Users className="w-4 h-4 text-sky-600" />
                <h2 className="text-sm font-bold text-slate-900">Cashier Performance</h2>
              </div>
              <div className="p-4 space-y-3">
                {data.employeePerformance.map((emp, idx) => {
                  const maxEmpRev = data.employeePerformance[0]?.totalRevenue || 1
                  return (
                    <div key={emp.id} className="flex items-center gap-3">
                      <div className="w-7 h-7 rounded-lg bg-slate-100 flex items-center justify-center text-xs font-black text-slate-500 shrink-0">
                        {idx + 1}
                      </div>
                      <div className="flex-1 min-w-0">
                        <div className="flex items-center justify-between mb-0.5">
                          <span className="text-xs font-bold text-slate-800 truncate">{emp.name}</span>
                          <span className="text-xs font-mono font-bold text-emerald-700 shrink-0">{formatTaka(emp.totalRevenue)}</span>
                        </div>
                        <MiniBar value={emp.totalRevenue} max={maxEmpRev} color="violet" />
                        <div className="flex justify-between mt-0.5 text-[10px] text-slate-400">
                          <span>{emp.salesCount} sales &bull; {emp.totalItems} items</span>
                          <span className="font-mono">{emp.employeeId}</span>
                        </div>
                      </div>
                    </div>
                  )
                })}
                {data.employeePerformance.length === 0 && (
                  <div className="text-xs text-slate-400 text-center py-4">No employee data</div>
                )}
              </div>
            </div>

            {/* Top Manufacturers */}
            <div className="bg-white rounded-2xl shadow-xs border border-slate-200 overflow-hidden">
              <div className="px-4 py-3 border-b border-slate-100 flex items-center gap-2">
                <Building2 className="w-4 h-4 text-sky-600" />
                <h2 className="text-sm font-bold text-slate-900">Top Manufacturers</h2>
              </div>
              <div className="p-4 space-y-3">
                {data.topManufacturers.map((mfg, idx) => {
                  const maxMfgRev = data.topManufacturers[0]?.revenue || 1
                  return (
                    <div key={mfg.name} className="flex items-center gap-3">
                      <div className="w-7 h-7 rounded-lg bg-slate-100 flex items-center justify-center text-xs font-black text-slate-500 shrink-0">
                        {idx + 1}
                      </div>
                      <div className="flex-1 min-w-0">
                        <div className="flex items-center justify-between mb-0.5">
                          <span className="text-xs font-bold text-slate-800 truncate">{mfg.name}</span>
                          <span className="text-xs font-mono font-bold text-emerald-700 shrink-0">{formatTaka(mfg.revenue)}</span>
                        </div>
                        <MiniBar value={mfg.revenue} max={maxMfgRev} color="indigo" />
                        <div className="text-[10px] text-slate-400 mt-0.5">
                          {mfg.itemsSold} items sold
                        </div>
                      </div>
                    </div>
                  )
                })}
                {data.topManufacturers.length === 0 && (
                  <div className="text-xs text-slate-400 text-center py-4">No manufacturer data</div>
                )}
              </div>
            </div>
          </div>

          {/* Discount Summary */}
          {s.totalDiscount > 0 && (
            <div className="bg-gradient-to-r from-amber-50 to-orange-50 rounded-2xl p-4 border border-amber-200 flex items-center justify-between">
              <div className="flex items-center gap-3">
                <div className="p-2 rounded-lg bg-amber-100">
                  <Percent className="w-4 h-4 text-amber-700" />
                </div>
                <div>
                  <div className="text-xs font-bold text-amber-900">Total Discounts Given</div>
                  <div className="text-[10px] text-amber-700">
                    Across {s.totalSales} sales in this period
                  </div>
                </div>
              </div>
              <div className="text-xl font-black font-mono text-amber-800">
                {formatTaka(s.totalDiscount)}
              </div>
            </div>
          )}
        </>
      )}
    </div>
  )
}
