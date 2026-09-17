'use client'

import React, { useState, useEffect } from 'react'
import {
  Calendar,
  Search,
  Download,
  Printer,
  Pill,
  TrendingUp,
  FileText,
  Clock,
  RefreshCw,
} from 'lucide-react'
import Link from 'next/link'
import { ToastContainer, ToastMessage } from '@/components/Toast'
import { getLocalDateString } from '@/lib/date-utils'

export default function AdminReportsPage() {
  const todayStr = getLocalDateString()
  const [mode, setMode] = useState<'single' | 'range'>('single')
  const [singleDate, setSingleDate] = useState(todayStr)
  const [fromDate, setFromDate] = useState(todayStr)
  const [toDate, setToDate] = useState(todayStr)

  const [stats, setStats] = useState({
    totalReports: 0,
    uniqueMedicines: 0,
    employeesReporting: 0,
  })
  const [consolidated, setConsolidated] = useState<any[]>([])
  const [loading, setLoading] = useState(true)
  const [toasts, setToasts] = useState<ToastMessage[]>([])

  const addToast = (type: 'success' | 'error' | 'info', text: string) => {
    setToasts((prev) => [...prev, { id: Date.now().toString(), type, text }])
  }

  const loadReport = async () => {
    try {
      setLoading(true)
      const params = new URLSearchParams()
      if (mode === 'single') {
        params.set('date', singleDate)
      } else {
        params.set('from', fromDate)
        params.set('to', toDate)
      }

      const res = await fetch(`/api/shortages?${params.toString()}`)
      if (res.ok) {
        const data = await res.json()
        setStats(data.stats || { totalReports: 0, uniqueMedicines: 0, employeesReporting: 0 })
        setConsolidated(data.consolidated || [])
      }
    } catch (err) {
      console.error('Report load error:', err)
      addToast('error', 'Failed to fetch historical report')
    } finally {
      setLoading(false)
    }
  }

  useEffect(() => {
    loadReport()
  }, [])

  const handleExportCSV = () => {
    if (consolidated.length === 0) {
      addToast('info', 'No records to export')
      return
    }

    const headers = [
      'No',
      'Brand Name',
      'Strength',
      'Dosage Form',
      'Generic Name',
      'Manufacturer',
      'Total Reports',
      'Total Quantity',
      'Units',
      'Reported By',
    ]

    const rows = consolidated.map((item, idx) => [
      idx + 1,
      `"${item.medicine.brandName}"`,
      `"${item.medicine.strength}"`,
      `"${item.medicine.dosageForm}"`,
      `"${item.medicine.genericName}"`,
      `"${item.medicine.manufacturer?.name || ''}"`,
      item.reportCount,
      item.totalQuantity || '',
      `"${item.units.join(', ') || ''}"`,
      `"${item.employees.map((e: any) => `${e.name} (${e.count})`).join('; ')}"`,
    ])

    const csvContent = [headers.join(','), ...rows.map((r) => r.join(','))].join('\n')
    const blob = new Blob([csvContent], { type: 'text/csv;charset=utf-8;' })
    const url = URL.createObjectURL(blob)
    const link = document.createElement('a')
    link.href = url
    link.setAttribute('download', `shortage-report-${mode === 'single' ? singleDate : `${fromDate}_to_${toDate}`}.csv`)
    document.body.appendChild(link)
    link.click()
    document.body.removeChild(link)
    addToast('success', 'Report CSV exported')
  }

  return (
    <div className="space-y-6">
      <ToastContainer toasts={toasts} onDismiss={(id) => setToasts((prev) => prev.filter((t) => t.id !== id))} />

      {/* Header */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div>
          <h1 className="text-2xl font-black text-slate-900 tracking-tight">History & Reports</h1>
          <p className="text-xs text-slate-500 mt-0.5">
            Query past pharmacy shortage lists, view trends, and export records
          </p>
        </div>

        <div className="flex items-center gap-2">
          <Link
            href={`/admin/print?date=${mode === 'single' ? singleDate : fromDate}`}
            className="px-3.5 py-2 bg-sky-600 hover:bg-sky-700 text-white font-bold rounded-xl text-xs shadow-xs flex items-center gap-1.5 transition-colors"
          >
            <Printer className="w-4 h-4" />
            <span>Print Report</span>
          </Link>
          <button
            onClick={handleExportCSV}
            className="px-3.5 py-2 bg-slate-800 hover:bg-slate-900 text-white font-bold rounded-xl text-xs shadow-xs flex items-center gap-1.5 transition-colors cursor-pointer"
          >
            <Download className="w-4 h-4" />
            <span>Export CSV</span>
          </button>
        </div>
      </div>

      {/* Filter Control Box */}
      <div className="bg-white rounded-2xl p-5 shadow-xs border border-slate-200 space-y-4">
        <div className="flex items-center gap-4 border-b border-slate-100 pb-3">
          <button
            onClick={() => setMode('single')}
            className={`text-xs font-bold px-3 py-1.5 rounded-lg transition-colors cursor-pointer ${
              mode === 'single'
                ? 'bg-sky-600 text-white shadow-xs'
                : 'bg-slate-100 text-slate-600 hover:bg-slate-200'
            }`}
          >
            Single Date
          </button>
          <button
            onClick={() => setMode('range')}
            className={`text-xs font-bold px-3 py-1.5 rounded-lg transition-colors cursor-pointer ${
              mode === 'range'
                ? 'bg-sky-600 text-white shadow-xs'
                : 'bg-slate-100 text-slate-600 hover:bg-slate-200'
            }`}
          >
            Date Range
          </button>
        </div>

        <form
          onSubmit={(e) => {
            e.preventDefault()
            loadReport()
          }}
          className="flex flex-wrap items-end gap-3"
        >
          {mode === 'single' ? (
            <div>
              <label className="text-xs font-bold text-slate-700 block mb-1">Select Date</label>
              <input
                type="date"
                value={singleDate}
                onChange={(e) => setSingleDate(e.target.value)}
                className="h-10 px-3 bg-slate-50 border border-slate-300 rounded-xl text-xs font-bold"
              />
            </div>
          ) : (
            <>
              <div>
                <label className="text-xs font-bold text-slate-700 block mb-1">From Date</label>
                <input
                  type="date"
                  value={fromDate}
                  onChange={(e) => setFromDate(e.target.value)}
                  className="h-10 px-3 bg-slate-50 border border-slate-300 rounded-xl text-xs font-bold"
                />
              </div>
              <div>
                <label className="text-xs font-bold text-slate-700 block mb-1">To Date</label>
                <input
                  type="date"
                  value={toDate}
                  onChange={(e) => setToDate(e.target.value)}
                  className="h-10 px-3 bg-slate-50 border border-slate-300 rounded-xl text-xs font-bold"
                />
              </div>
            </>
          )}

          <button
            type="submit"
            disabled={loading}
            className="h-10 px-5 bg-sky-600 hover:bg-sky-700 text-white font-bold rounded-xl text-xs flex items-center gap-1.5 transition-colors cursor-pointer"
          >
            <Search className="w-4 h-4" />
            <span>Search History</span>
          </button>
        </form>
      </div>

      {/* Summary Cards */}
      <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
        <div className="bg-white rounded-2xl p-4 shadow-xs border border-slate-200">
          <div className="text-2xl font-black text-slate-900 leading-none">{stats.totalReports}</div>
          <div className="text-xs font-semibold text-slate-500 uppercase tracking-wide mt-1">
            Total Shortage Reports
          </div>
        </div>

        <div className="bg-white rounded-2xl p-4 shadow-xs border border-slate-200">
          <div className="text-2xl font-black text-slate-900 leading-none">{stats.uniqueMedicines}</div>
          <div className="text-xs font-semibold text-slate-500 uppercase tracking-wide mt-1">
            Unique Short Medicines
          </div>
        </div>

        <div className="bg-white rounded-2xl p-4 shadow-xs border border-slate-200">
          <div className="text-2xl font-black text-slate-900 leading-none">{stats.employeesReporting}</div>
          <div className="text-xs font-semibold text-slate-500 uppercase tracking-wide mt-1">
            Staff Members Reporting
          </div>
        </div>
      </div>

      {/* Most Frequently Reported Medicines */}
      <div className="bg-white rounded-2xl shadow-xs border border-slate-200 overflow-hidden">
        <div className="p-4 border-b border-slate-200 flex items-center justify-between">
          <div className="flex items-center gap-2">
            <TrendingUp className="w-4 h-4 text-sky-600" />
            <h2 className="text-sm font-bold text-slate-900">
              Ranked Medicine Shortages ({consolidated.length})
            </h2>
          </div>
          <span className="text-xs font-medium text-slate-400">Sorted by report frequency</span>
        </div>

        {loading ? (
          <div className="p-8 text-center text-xs text-slate-400">Loading historical data...</div>
        ) : consolidated.length === 0 ? (
          <div className="p-12 text-center text-slate-400">
            <FileText className="w-10 h-10 mx-auto mb-2 text-slate-300" />
            <p className="text-sm font-semibold text-slate-700">No shortage data for this period</p>
            <p className="text-xs text-slate-400 mt-1">Try choosing a different date or date range.</p>
          </div>
        ) : (
          <div className="overflow-x-auto">
            <table className="w-full text-left border-collapse text-xs">
              <thead>
                <tr className="bg-slate-50 text-slate-600 border-b border-slate-200 font-bold uppercase tracking-wider text-[11px]">
                  <th className="p-3.5 w-12 text-center">Rank</th>
                  <th className="p-3.5">Medicine</th>
                  <th className="p-3.5">Manufacturer</th>
                  <th className="p-3.5 text-center">Reports</th>
                  <th className="p-3.5">Total Requested Qty</th>
                  <th className="p-3.5">Employees Involved</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-100 text-slate-800">
                {consolidated.map((item, idx) => (
                  <tr key={item.medicineId} className="hover:bg-slate-50/80 transition-colors">
                    <td className="p-3.5 text-center font-bold text-slate-400">{idx + 1}</td>

                    <td className="p-3.5">
                      <div className="font-bold text-slate-900 text-sm">
                        {item.medicine.brandName} <span className="text-sky-700">{item.medicine.strength}</span>
                      </div>
                      <div className="text-[11px] text-slate-500">
                        {item.medicine.genericName} ({item.medicine.dosageForm})
                      </div>
                    </td>

                    <td className="p-3.5 font-medium text-slate-700">
                      {item.medicine.manufacturer?.name}
                    </td>

                    <td className="p-3.5 text-center">
                      <span className="inline-block px-2.5 py-1 rounded-full bg-rose-50 text-rose-700 border border-rose-200 font-bold text-xs">
                        {item.reportCount} {item.reportCount === 1 ? 'time' : 'times'}
                      </span>
                    </td>

                    <td className="p-3.5 font-bold text-slate-900">
                      {item.totalQuantity > 0
                        ? `${item.totalQuantity} ${item.units.join('/') || 'Box'}`
                        : '—'}
                    </td>

                    <td className="p-3.5">
                      <div className="flex flex-wrap gap-1">
                        {item.employees.map((e: any) => (
                          <span
                            key={e.id}
                            className="px-2 py-0.5 rounded bg-slate-100 text-slate-700 text-[10px] font-medium border border-slate-200"
                          >
                            {e.name}
                          </span>
                        ))}
                      </div>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
      </div>
    </div>
  )
}
