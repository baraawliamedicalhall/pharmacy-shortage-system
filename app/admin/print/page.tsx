'use client'

import React, { useState, useEffect, Suspense } from 'react'
import { useSearchParams } from 'next/navigation'
import Link from 'next/link'
import { Printer, Download, ArrowLeft, RefreshCw, Check } from 'lucide-react'

interface PrintShortageItem {
  medicineId: string
  medicine: {
    brandName: string
    strength: string
    dosageForm: string
    genericName: string
    manufacturer?: {
      name: string
      shortName?: string | null
    }
  }
  reportCount: number
  totalQuantity: number
  units: string[]
  employees: Array<{ name: string; count: number }>
  reports: Array<{ notes: string | null; quantity: number | null; unit: string | null }>
}

function PrintShortageContent() {
  const searchParams = useSearchParams()
  const dateFromQuery = searchParams.get('date') || new Date().toISOString().slice(0, 10)
  const [selectedDate, setSelectedDate] = useState(dateFromQuery)
  const [items, setItems] = useState<PrintShortageItem[]>([])
  const [loading, setLoading] = useState(true)
  const [pharmacyName, setPharmacyName] = useState('Central Community Pharmacy')

  const loadData = async (date: string) => {
    try {
      setLoading(true)
      const res = await fetch(`/api/shortages?date=${date}`)
      if (res.ok) {
        const data = await res.json()
        setItems(data.consolidated || [])
      }
    } catch (err) {
      console.error('Failed to load print shortages:', err)
    } finally {
      setLoading(false)
    }
  }

  useEffect(() => {
    loadData(selectedDate)
  }, [selectedDate])

  const totalReports = items.reduce((acc, curr) => acc + curr.reportCount, 0)

  const handlePrint = () => {
    window.print()
  }

  const handleExportCSV = () => {
    const headers = ['No', 'Medicine', 'Strength', 'Dosage Form', 'Generic', 'Manufacturer', 'Reports', 'Quantity', 'Notes']
    const rows = items.map((item, idx) => {
      const allNotes = item.reports
        .map((r) => r.notes)
        .filter(Boolean)
        .join('; ')

      return [
        idx + 1,
        `"${item.medicine.brandName}"`,
        `"${item.medicine.strength}"`,
        `"${item.medicine.dosageForm}"`,
        `"${item.medicine.genericName}"`,
        `"${item.medicine.manufacturer?.name || ''}"`,
        item.reportCount,
        item.totalQuantity ? `"${item.totalQuantity} ${item.units.join('/')}"` : '""',
        `"${allNotes.replace(/"/g, '""')}"`,
      ]
    })

    const csvContent = [headers.join(','), ...rows.map((r) => r.join(','))].join('\n')
    const blob = new Blob([csvContent], { type: 'text/csv;charset=utf-8;' })
    const url = URL.createObjectURL(blob)
    const link = document.createElement('a')
    link.href = url
    link.setAttribute('download', `pharmacy-shortlist-${selectedDate}.csv`)
    document.body.appendChild(link)
    link.click()
    document.body.removeChild(link)
  }

  const formattedDate = new Date(selectedDate + 'T00:00:00').toLocaleDateString('en-GB', {
    day: 'numeric',
    month: 'long',
    year: 'numeric',
  })

  return (
    <div className="space-y-6">
      {/* Top Action Controls (Hidden when printing) */}
      <div className="no-print bg-white rounded-2xl p-4 shadow-xs border border-slate-200 flex flex-wrap items-center justify-between gap-4">
        <div className="flex items-center gap-3">
          <Link
            href="/admin"
            className="flex items-center gap-1.5 text-xs font-bold text-slate-600 hover:text-slate-900 bg-slate-100 hover:bg-slate-200 px-3 py-2 rounded-xl transition-colors"
          >
            <ArrowLeft className="w-4 h-4" />
            <span>Dashboard</span>
          </Link>

          <div className="flex items-center gap-2">
            <span className="text-xs font-bold text-slate-700">Date:</span>
            <input
              type="date"
              value={selectedDate}
              onChange={(e) => setSelectedDate(e.target.value)}
              className="h-9 px-3 bg-slate-50 border border-slate-300 rounded-xl text-xs font-bold"
            />
          </div>
        </div>

        <div className="flex items-center gap-2">
          <button
            onClick={handleExportCSV}
            className="px-4 py-2 bg-slate-800 hover:bg-slate-900 text-white font-bold rounded-xl text-xs flex items-center gap-1.5 shadow-xs transition-colors cursor-pointer"
          >
            <Download className="w-4 h-4" />
            <span>Export CSV</span>
          </button>
          <button
            onClick={handlePrint}
            className="px-4 py-2 bg-sky-600 hover:bg-sky-700 text-white font-bold rounded-xl text-xs flex items-center gap-1.5 shadow-md transition-colors cursor-pointer"
          >
            <Printer className="w-4 h-4" />
            <span>Print Report (A4 / PDF)</span>
          </button>
        </div>
      </div>

      {/* A4 Printable Paper Layout */}
      <div className="bg-white p-8 sm:p-12 max-w-4xl mx-auto border border-slate-300 shadow-md print:shadow-none print:border-none print:p-0 print:m-0 print:max-w-none text-slate-900">
        {/* Document Header */}
        <div className="text-center border-b-2 border-slate-900 pb-4 mb-6">
          <h1 className="text-2xl sm:text-3xl font-black uppercase tracking-wider">
            {pharmacyName}
          </h1>
          <h2 className="text-lg font-bold tracking-widest text-slate-700 uppercase mt-1">
            DAILY MEDICINE SHORTAGE LIST
          </h2>
          <div className="flex items-center justify-between text-xs sm:text-sm font-semibold mt-3 text-slate-600 px-2">
            <div>
              Date: <strong className="text-slate-900">{formattedDate}</strong>
            </div>
            <div>
              Generated:{' '}
              <strong className="text-slate-900">{new Date().toLocaleTimeString()}</strong>
            </div>
          </div>
        </div>

        {/* Shortage Table */}
        {loading ? (
          <div className="py-12 text-center text-slate-400">Loading shortage data...</div>
        ) : items.length === 0 ? (
          <div className="py-12 text-center text-slate-500 font-medium">
            No shortages recorded for {formattedDate}.
          </div>
        ) : (
          <div className="overflow-x-auto">
            <table className="w-full border-collapse text-xs sm:text-sm">
              <thead>
                <tr className="border-y-2 border-slate-900 bg-slate-100 font-bold uppercase text-slate-900">
                  <th className="p-2 text-center w-10 border border-slate-300">No.</th>
                  <th className="p-2 text-left border border-slate-300">Medicine & Strength</th>
                  <th className="p-2 text-left border border-slate-300">Dosage Form</th>
                  <th className="p-2 text-left border border-slate-300">Manufacturer</th>
                  <th className="p-2 text-center w-16 border border-slate-300">Reports</th>
                  <th className="p-2 text-center w-24 border border-slate-300">Req. Qty</th>
                  <th className="p-2 text-left border border-slate-300">Notes / Details</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-300">
                {items.map((item, idx) => {
                  const notesList = item.reports
                    .map((r) => r.notes)
                    .filter(Boolean)
                    .join(', ')

                  return (
                    <tr key={item.medicineId} className="border-b border-slate-300">
                      <td className="p-2 text-center font-bold text-slate-600 border border-slate-300">
                        {idx + 1}
                      </td>
                      <td className="p-2 font-bold border border-slate-300">
                        {item.medicine.brandName} {item.medicine.strength}
                        <div className="text-[11px] font-normal text-slate-600 print:text-black">
                          {item.medicine.genericName}
                        </div>
                      </td>
                      <td className="p-2 uppercase text-xs border border-slate-300">
                        {item.medicine.dosageForm}
                      </td>
                      <td className="p-2 font-medium border border-slate-300">
                        {item.medicine.manufacturer?.shortName || item.medicine.manufacturer?.name}
                      </td>
                      <td className="p-2 text-center font-black text-slate-900 border border-slate-300">
                        {item.reportCount}
                      </td>
                      <td className="p-2 text-center font-bold border border-slate-300">
                        {item.totalQuantity > 0
                          ? `${item.totalQuantity} ${item.units.join('/') || 'Box'}`
                          : '—'}
                      </td>
                      <td className="p-2 text-xs text-slate-700 italic border border-slate-300">
                        {notesList || '—'}
                      </td>
                    </tr>
                  )
                })}
              </tbody>
            </table>
          </div>
        )}

        {/* Totals & Statistics */}
        <div className="mt-6 pt-4 border-t-2 border-slate-900 flex items-center justify-between text-xs sm:text-sm font-bold">
          <div>
            Total Unique Medicines: <span className="text-base">{items.length}</span>
          </div>
          <div>
            Total Staff Reports: <span className="text-base">{totalReports}</span>
          </div>
        </div>

        {/* Signature & Verification Block */}
        <div className="mt-14 pt-8 grid grid-cols-2 gap-8 text-xs sm:text-sm">
          <div>
            <div className="border-b border-slate-900 w-48 mb-1.5" />
            <div className="font-bold">Prepared By (Pharmacist)</div>
            <div className="text-slate-500 text-[11px]">Name & Signature</div>
          </div>

          <div className="text-right flex flex-col items-end">
            <div className="border-b border-slate-900 w-48 mb-1.5" />
            <div className="font-bold">Approved / Ordered By</div>
            <div className="text-slate-500 text-[11px]">Pharmacy In-Charge</div>
          </div>
        </div>

        {/* Footer Note */}
        <div className="mt-8 pt-3 border-t border-slate-200 text-center text-[10px] text-slate-500 print:text-black">
          Pharmacy Shortage Management System • Generated on Local Server
        </div>
      </div>
    </div>
  )
}

export default function AdminPrintPage() {
  return (
    <Suspense fallback={<div className="p-8 text-xs text-slate-400">Loading print layout...</div>}>
      <PrintShortageContent />
    </Suspense>
  )
}
