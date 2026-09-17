'use client'

import React, { useState, useEffect } from 'react'
import Link from 'next/link'
import {
  ClipboardList,
  Pill,
  Users,
  Clock,
  Printer,
  Download,
  CheckCheck,
  ChevronDown,
  ChevronUp,
  RefreshCw,
  ExternalLink,
  ShieldAlert,
  AlertCircle,
} from 'lucide-react'
import { ToastContainer, ToastMessage } from '@/components/Toast'

interface ConsolidatedItem {
  medicineId: string
  medicine: {
    id: string
    brandName: string
    genericName: string
    strength: string
    dosageForm: string
    purchaseUnit?: string | null
    retailUnit?: string | null
    manufacturer?: {
      id: string
      name: string
      shortName?: string | null
    }
  }
  reportCount: number
  totalQuantity: number
  units: string[]
  employees: Array<{
    id: string
    employeeId: string
    name: string
    count: number
  }>
  reports: Array<{
    id: string
    employeeId: string
    employeeName: string
    quantity: number | null
    unit: string | null
    notes: string | null
    status: string
    reportedAt: string
  }>
  hasPending: boolean
}

interface DashboardStats {
  totalReports: number
  uniqueMedicines: number
  employeesReporting: number
  pendingReview: number
}

interface EmployeeSummary {
  id: string
  employeeId: string
  name: string
  reportsToday: number
  totalReports: number
}

export default function AdminDashboardPage() {
  const [stats, setStats] = useState<DashboardStats>({
    totalReports: 0,
    uniqueMedicines: 0,
    employeesReporting: 0,
    pendingReview: 0,
  })
  const [consolidated, setConsolidated] = useState<ConsolidatedItem[]>([])
  const [employees, setEmployees] = useState<EmployeeSummary[]>([])
  const [loading, setLoading] = useState(true)
  const [expandedMedId, setExpandedMedId] = useState<string | null>(null)
  const [selectedEmployeeFilter, setSelectedEmployeeFilter] = useState<string | null>(null)
  const [toasts, setToasts] = useState<ToastMessage[]>([])

  const addToast = (type: 'success' | 'error' | 'info', text: string) => {
    setToasts((prev) => [...prev, { id: Date.now().toString(), type, text }])
  }

  const loadDashboardData = async () => {
    try {
      setLoading(true)
      const [shortagesRes, empRes] = await Promise.all([
        fetch('/api/shortages'),
        fetch('/api/admin/employees'),
      ])

      if (shortagesRes.ok) {
        const data = await shortagesRes.json()
        setStats(data.stats || { totalReports: 0, uniqueMedicines: 0, employeesReporting: 0, pendingReview: 0 })
        setConsolidated(data.consolidated || [])
      }

      if (empRes.ok) {
        const empData = await empRes.json()
        setEmployees(empData.employees || [])
      }
    } catch (err) {
      console.error('Error fetching dashboard data:', err)
      addToast('error', 'Failed to load dashboard data')
    } finally {
      setLoading(false)
    }
  }

  useEffect(() => {
    loadDashboardData()
  }, [])

  // Mark all pending as reviewed
  const handleMarkAllReviewed = async () => {
    if (!confirm("Mark all today's pending shortage reports as Reviewed?")) return

    try {
      const res = await fetch('/api/shortages/bulk-review', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ status: 'REVIEWED' }),
      })

      if (res.ok) {
        addToast('success', "All today's shortages marked as Reviewed")
        loadDashboardData()
      } else {
        addToast('error', 'Failed to update shortages')
      }
    } catch (err) {
      console.error('Review error:', err)
      addToast('error', 'Network error updating shortages')
    }
  }

  // Export CSV
  const handleExportCSV = () => {
    if (consolidated.length === 0) {
      addToast('info', 'No shortages to export')
      return
    }

    const todayStr = new Date().toISOString().slice(0, 10)
    const headers = ['No', 'Brand Name', 'Strength', 'Dosage Form', 'Generic Name', 'Manufacturer', 'Reports Count', 'Requested Quantity', 'Unit', 'Reported By Employees']
    
    const rows = consolidated.map((item, index) => [
      index + 1,
      `"${item.medicine.brandName}"`,
      `"${item.medicine.strength}"`,
      `"${item.medicine.dosageForm}"`,
      `"${item.medicine.genericName}"`,
      `"${item.medicine.manufacturer?.name || ''}"`,
      item.reportCount,
      item.totalQuantity || '',
      `"${item.units.join(', ') || ''}"`,
      `"${item.employees.map((e) => `${e.name} (${e.count})`).join('; ')}"`,
    ])

    const csvContent = [headers.join(','), ...rows.map((r) => r.join(','))].join('\n')
    const blob = new Blob([csvContent], { type: 'text/csv;charset=utf-8;' })
    const url = URL.createObjectURL(blob)
    const link = document.createElement('a')
    link.href = url
    link.setAttribute('download', `pharmacy-shortages-${todayStr}.csv`)
    document.body.appendChild(link)
    link.click()
    document.body.removeChild(link)
    addToast('success', 'Shortage CSV exported')
  }

  // Filter list by selected employee if clicked
  const filteredConsolidated = selectedEmployeeFilter
    ? consolidated.filter((item) =>
        item.employees.some((e) => e.employeeId === selectedEmployeeFilter)
      )
    : consolidated

  const todayFormatted = new Date().toLocaleDateString('en-GB', {
    day: 'numeric',
    month: 'long',
    year: 'numeric',
  })

  return (
    <div className="space-y-6">
      <ToastContainer toasts={toasts} onDismiss={(id) => setToasts((prev) => prev.filter((t) => t.id !== id))} />

      {/* Top Title & Header */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div>
          <div className="flex items-center gap-2">
            <h1 className="text-2xl font-black text-slate-900 tracking-tight">TODAY'S SHORTAGES</h1>
            <span className="px-2.5 py-0.5 rounded-full text-xs font-bold bg-emerald-100 text-emerald-800 border border-emerald-300">
              Live LAN
            </span>
          </div>
          <p className="text-sm text-slate-500 font-medium mt-0.5" suppressHydrationWarning>{todayFormatted}</p>
        </div>

        {/* Global Dashboard Actions */}
        <div className="flex flex-wrap items-center gap-2">
          <button
            onClick={loadDashboardData}
            disabled={loading}
            className="p-2.5 bg-white hover:bg-slate-100 border border-slate-300 rounded-xl text-slate-700 shadow-xs transition-colors"
            title="Refresh Data"
          >
            <RefreshCw className={`w-4 h-4 ${loading ? 'animate-spin' : ''}`} />
          </button>

          <button
            onClick={handleMarkAllReviewed}
            disabled={stats.pendingReview === 0}
            className="px-3.5 py-2.5 bg-emerald-600 hover:bg-emerald-700 disabled:opacity-50 text-white font-bold rounded-xl text-xs shadow-xs flex items-center gap-1.5 transition-colors cursor-pointer"
          >
            <CheckCheck className="w-4 h-4" />
            <span>Mark Reviewed</span>
          </button>

          <Link
            href="/admin/print"
            className="px-3.5 py-2.5 bg-sky-600 hover:bg-sky-700 text-white font-bold rounded-xl text-xs shadow-xs flex items-center gap-1.5 transition-colors"
          >
            <Printer className="w-4 h-4" />
            <span>Print Report</span>
          </Link>

          <button
            onClick={handleExportCSV}
            className="px-3.5 py-2.5 bg-slate-800 hover:bg-slate-900 text-white font-bold rounded-xl text-xs shadow-xs flex items-center gap-1.5 transition-colors cursor-pointer"
          >
            <Download className="w-4 h-4" />
            <span>Export CSV</span>
          </button>
        </div>
      </div>

      {/* 4 Prominent Stat Cards */}
      <div className="grid grid-cols-2 lg:grid-cols-4 gap-4">
        {/* Card 1: Total Reports */}
        <div className="bg-white rounded-2xl p-4 shadow-xs border border-slate-200 flex items-center gap-3.5">
          <div className="w-12 h-12 rounded-xl bg-sky-100 text-sky-700 flex items-center justify-center shrink-0">
            <ClipboardList className="w-6 h-6" />
          </div>
          <div>
            <div className="text-2xl font-black text-slate-900 leading-none">{stats.totalReports}</div>
            <div className="text-xs font-semibold text-slate-500 mt-1 uppercase tracking-wide">
              Total Reports
            </div>
          </div>
        </div>

        {/* Card 2: Unique Medicines */}
        <div className="bg-white rounded-2xl p-4 shadow-xs border border-slate-200 flex items-center gap-3.5">
          <div className="w-12 h-12 rounded-xl bg-indigo-100 text-indigo-700 flex items-center justify-center shrink-0">
            <Pill className="w-6 h-6" />
          </div>
          <div>
            <div className="text-2xl font-black text-slate-900 leading-none">{stats.uniqueMedicines}</div>
            <div className="text-xs font-semibold text-slate-500 mt-1 uppercase tracking-wide">
              Unique Medicines
            </div>
          </div>
        </div>

        {/* Card 3: Employees Reporting */}
        <div className="bg-white rounded-2xl p-4 shadow-xs border border-slate-200 flex items-center gap-3.5">
          <div className="w-12 h-12 rounded-xl bg-emerald-100 text-emerald-700 flex items-center justify-center shrink-0">
            <Users className="w-6 h-6" />
          </div>
          <div>
            <div className="text-2xl font-black text-slate-900 leading-none">{stats.employeesReporting}</div>
            <div className="text-xs font-semibold text-slate-500 mt-1 uppercase tracking-wide">
              Employees Active
            </div>
          </div>
        </div>

        {/* Card 4: Pending Review */}
        <div className="bg-white rounded-2xl p-4 shadow-xs border border-slate-200 flex items-center gap-3.5">
          <div className="w-12 h-12 rounded-xl bg-amber-100 text-amber-700 flex items-center justify-center shrink-0">
            <Clock className="w-6 h-6" />
          </div>
          <div>
            <div className="text-2xl font-black text-slate-900 leading-none">{stats.pendingReview}</div>
            <div className="text-xs font-semibold text-slate-500 mt-1 uppercase tracking-wide">
              Pending Review
            </div>
          </div>
        </div>
      </div>

      {/* Main Content Grid: Consolidated List (Left/Main) + Employee Activity (Right/Side) */}
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        {/* Consolidated Shortages Table (2 Cols on lg) */}
        <div className="lg:col-span-2 space-y-4">
          <div className="bg-white rounded-2xl shadow-xs border border-slate-200 overflow-hidden">
            <div className="p-4 border-b border-slate-200 flex items-center justify-between">
              <div>
                <h2 className="text-base font-bold text-slate-900 flex items-center gap-2">
                  <span>Consolidated Shortage List</span>
                  {selectedEmployeeFilter && (
                    <span className="text-xs px-2 py-0.5 rounded-full bg-sky-100 text-sky-800 font-semibold flex items-center gap-1">
                      Filtered: {selectedEmployeeFilter}
                      <button
                        onClick={() => setSelectedEmployeeFilter(null)}
                        className="hover:text-rose-600 font-bold ml-1"
                      >
                        ×
                      </button>
                    </span>
                  )}
                </h2>
                <p className="text-xs text-slate-500">
                  Duplicates merged: identical medicines reported by multiple employees appear as one entry.
                </p>
              </div>
              <span className="text-xs font-bold text-slate-600 bg-slate-100 px-2.5 py-1 rounded-lg">
                {filteredConsolidated.length} items
              </span>
            </div>

            {loading ? (
              <div className="p-8 text-center text-xs text-slate-400">Loading today's shortage data...</div>
            ) : filteredConsolidated.length === 0 ? (
              <div className="p-12 text-center text-slate-400">
                <CheckCheck className="w-10 h-10 mx-auto mb-2 text-emerald-400" />
                <p className="text-sm font-bold text-slate-700">No shortages reported today</p>
                <p className="text-xs text-slate-400 mt-1">
                  Employees have not submitted any shortage reports for today yet.
                </p>
              </div>
            ) : (
              <div className="divide-y divide-slate-100">
                {filteredConsolidated.map((item, idx) => {
                  const isExpanded = expandedMedId === item.medicineId

                  return (
                    <div key={item.medicineId} className="hover:bg-slate-50/80 transition-colors">
                      <div
                        onClick={() => setExpandedMedId(isExpanded ? null : item.medicineId)}
                        className="p-4 flex items-start sm:items-center justify-between gap-4 cursor-pointer"
                      >
                        {/* Medicine Information */}
                        <div className="flex items-start gap-3 min-w-0 flex-1">
                          <span className="text-xs font-bold text-slate-400 w-5 mt-1 sm:mt-0 text-right">
                            {idx + 1}.
                          </span>
                          <div className="min-w-0 flex-1">
                            <div className="flex flex-wrap items-center gap-2">
                              <span className="font-black text-base text-slate-900 leading-tight">
                                {item.medicine.brandName}
                              </span>
                              <span className="text-sm font-bold text-sky-700">
                                {item.medicine.strength}
                              </span>
                              <span className="text-[10px] px-1.5 py-0.2 rounded bg-slate-100 text-slate-700 font-semibold uppercase">
                                {item.medicine.dosageForm}
                              </span>
                              {item.hasPending && (
                                <span className="text-[10px] px-1.5 py-0.5 rounded-full bg-amber-100 text-amber-800 font-bold">
                                  New
                                </span>
                              )}
                            </div>

                            <div className="text-xs text-slate-500 mt-0.5">
                              {item.medicine.genericName}
                            </div>

                            <div className="text-xs font-semibold text-slate-700 mt-1">
                              Mfg: {item.medicine.manufacturer?.name || 'Unknown'}
                            </div>

                            {/* Badges for Reporting Employees */}
                            <div className="flex flex-wrap items-center gap-1.5 mt-2">
                              <span className="text-[11px] text-slate-400 font-medium">Reported by:</span>
                              {item.employees.map((emp) => (
                                <span
                                  key={emp.id}
                                  className="text-[11px] px-2 py-0.5 rounded-md bg-slate-100 text-slate-700 font-medium border border-slate-200"
                                >
                                  {emp.name} {emp.count > 1 ? `(${emp.count}x)` : ''}
                                </span>
                              ))}
                            </div>
                          </div>
                        </div>

                        {/* Right side counts & toggle */}
                        <div className="flex items-center gap-3 shrink-0">
                          <div className="text-right">
                            <div className="inline-flex items-center gap-1 px-2.5 py-1 rounded-full bg-rose-50 text-rose-700 border border-rose-200 text-xs font-black">
                              <span>{item.reportCount}</span>
                              <span className="text-[10px] font-semibold uppercase">
                                {item.reportCount === 1 ? 'report' : 'reports'}
                              </span>
                            </div>

                            {item.totalQuantity > 0 && (
                              <div className="text-xs font-bold text-slate-700 mt-1">
                                Qty: {item.totalQuantity} {item.units.join('/') || 'Box'}
                              </div>
                            )}
                          </div>

                          <Link
                            href={`/admin/print?brand=${encodeURIComponent(item.medicine.brandName)}`}
                            onClick={(e) => e.stopPropagation()}
                            className="p-1.5 text-slate-400 hover:text-sky-600 hover:bg-sky-50 rounded-lg transition-colors"
                            title={`Print shortages for ${item.medicine.brandName}`}
                          >
                            <Printer className="w-4 h-4" />
                          </Link>

                          <div className="p-1 text-slate-400 hover:text-slate-600 rounded-lg">
                            {isExpanded ? (
                              <ChevronUp className="w-5 h-5" />
                            ) : (
                              <ChevronDown className="w-5 h-5" />
                            )}
                          </div>
                        </div>
                      </div>

                      {/* Expandable Drill Down: Individual Submissions */}
                      {isExpanded && (
                        <div className="px-5 py-3 bg-slate-100/70 border-t border-slate-200 space-y-2 text-xs">
                          <div className="font-bold text-slate-700 uppercase tracking-wide text-[11px] mb-1">
                            Individual Staff Submissions ({item.reports.length})
                          </div>
                          {item.reports.map((sub, i) => (
                            <div
                              key={sub.id}
                              className="bg-white p-2.5 rounded-xl border border-slate-200 flex items-center justify-between gap-3"
                            >
                              <div className="flex items-center gap-2 min-w-0">
                                <span className="font-bold text-slate-800">{sub.employeeName}</span>
                                <span className="text-slate-400">•</span>
                                <span className="text-slate-600">
                                  {sub.quantity ? (
                                    <strong>
                                      {sub.quantity} {sub.unit || 'Box'}
                                    </strong>
                                  ) : (
                                    <span className="text-amber-700">No qty specified</span>
                                  )}
                                </span>
                                {sub.notes && (
                                  <>
                                    <span className="text-slate-400">•</span>
                                    <span className="text-slate-500 italic truncate max-w-xs">
                                      "{sub.notes}"
                                    </span>
                                  </>
                                )}
                              </div>
                              <div className="flex items-center gap-2 shrink-0">
                                <span className="text-[11px] text-slate-400">
                                  {new Date(sub.reportedAt).toLocaleTimeString('en-US', {
                                    hour: 'numeric',
                                    minute: '2-digit',
                                    hour12: true,
                                  })}
                                </span>
                                <span
                                  className={`px-2 py-0.5 rounded text-[10px] font-bold uppercase ${
                                    sub.status === 'REPORTED'
                                      ? 'bg-amber-100 text-amber-800'
                                      : 'bg-emerald-100 text-emerald-800'
                                  }`}
                                >
                                  {sub.status}
                                </span>
                              </div>
                            </div>
                          ))}
                        </div>
                      )}
                    </div>
                  )
                })}
              </div>
            )}
          </div>
        </div>

        {/* Right Side: Employee Activity */}
        <div className="space-y-4">
          <div className="bg-white rounded-2xl shadow-xs border border-slate-200 overflow-hidden">
            <div className="p-4 border-b border-slate-200">
              <h2 className="text-base font-bold text-slate-900 flex items-center gap-2">
                <Users className="w-4 h-4 text-sky-600" />
                <span>Employee Activity</span>
              </h2>
              <p className="text-xs text-slate-500">Reports submitted today by staff</p>
            </div>

            <div className="divide-y divide-slate-100">
              {employees.length === 0 ? (
                <div className="p-6 text-center text-xs text-slate-400">No employees registered</div>
              ) : (
                employees.map((emp) => {
                  const isSelected = selectedEmployeeFilter === emp.employeeId

                  return (
                    <button
                      key={emp.id}
                      onClick={() =>
                        setSelectedEmployeeFilter(isSelected ? null : emp.employeeId)
                      }
                      className={`w-full text-left p-3.5 flex items-center justify-between transition-colors cursor-pointer ${
                        isSelected ? 'bg-sky-50' : 'hover:bg-slate-50'
                      }`}
                    >
                      <div>
                        <div className="font-bold text-sm text-slate-800">{emp.name}</div>
                        <div className="text-xs text-slate-400">{emp.employeeId}</div>
                      </div>

                      <div className="flex items-center gap-2">
                        <span
                          className={`px-2.5 py-1 rounded-full text-xs font-bold ${
                            emp.reportsToday > 0
                              ? 'bg-emerald-100 text-emerald-800'
                              : 'bg-slate-100 text-slate-400'
                          }`}
                        >
                          {emp.reportsToday} today
                        </span>
                        <ExternalLink className="w-3.5 h-3.5 text-slate-300" />
                      </div>
                    </button>
                  )
                })
              )}
            </div>

            <div className="p-3 bg-slate-50 border-t border-slate-100 text-center">
              <Link
                href="/admin/employees"
                className="text-xs font-bold text-sky-600 hover:text-sky-800"
              >
                Manage Staff & PINs →
              </Link>
            </div>
          </div>

          {/* Quick System Links Card */}
          <div className="bg-slate-900 text-white rounded-2xl p-4 shadow-xs space-y-3">
            <h3 className="text-sm font-bold flex items-center gap-2">
              <ShieldAlert className="w-4 h-4 text-amber-400" />
              <span>Offline Ready Architecture</span>
            </h3>
            <p className="text-xs text-slate-300 leading-relaxed">
              This system runs 100% on the local pharmacy router. No internet required. Database is safely
              stored on this server.
            </p>
            <div className="pt-2 flex flex-col gap-2">
              <Link
                href="/admin/settings"
                className="w-full py-2 px-3 text-center bg-sky-600 hover:bg-sky-500 rounded-xl text-xs font-bold text-white transition-colors"
              >
                View Local IP & Backup Database
              </Link>
            </div>
          </div>
        </div>
      </div>
    </div>
  )
}
