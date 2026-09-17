'use client'

import React, { useState, useEffect } from 'react'
import {
  CreditCard,
  Search,
  Plus,
  DollarSign,
  Calendar,
  Store,
  CheckCircle2,
  X,
} from 'lucide-react'
import { ToastContainer, ToastMessage } from '@/components/Toast'

interface Payment {
  id: string
  amount: number
  paymentMethod: string
  referenceNo: string | null
  notes: string | null
  paymentDate: string
  createdAt: string
  retailer: {
    id: string
    retailerCode: string
    storeName: string
    ownerName: string
    phone: string
    currentDue: number
  }
}

interface RetailerOption {
  id: string
  storeName: string
  ownerName: string
  currentDue: number
}

export default function WholesalePaymentsPage() {
  const [payments, setPayments] = useState<Payment[]>([])
  const [retailers, setRetailers] = useState<RetailerOption[]>([])
  const [loading, setLoading] = useState(true)
  const [totalCollected, setTotalCollected] = useState(0)
  const [selectedRetailerFilter, setSelectedRetailerFilter] = useState('')
  const [toasts, setToasts] = useState<ToastMessage[]>([])

  const showToast = (type: 'success' | 'error' | 'info', text: string) => {
    setToasts((prev) => [...prev, { id: Math.random().toString(), type, text }])
  }

  const dismissToast = (id: string) => {
    setToasts((prev) => prev.filter((t) => t.id !== id))
  }

  // Payment Modal
  const [isModalOpen, setIsModalOpen] = useState(false)
  const [retailerId, setRetailerId] = useState('')
  const [amount, setAmount] = useState('')
  const [paymentMethod, setPaymentMethod] = useState('CASH')
  const [referenceNo, setReferenceNo] = useState('')
  const [notes, setNotes] = useState('')
  const [submitting, setSubmitting] = useState(false)

  const fetchPayments = async () => {
    setLoading(true)
    try {
      const url = selectedRetailerFilter
        ? `/api/wholesale/payments?retailerId=${selectedRetailerFilter}`
        : '/api/wholesale/payments'
      const res = await fetch(url)
      const data = await res.json()
      if (res.ok) {
        setPayments(data.payments || [])
        setTotalCollected(data.totalCollected || 0)
      }
    } catch {
      showToast('error', 'Failed to load payments')
    } finally {
      setLoading(false)
    }
  }

  const fetchRetailers = async () => {
    try {
      const res = await fetch('/api/wholesale/retailers?active=true')
      const data = await res.json()
      if (res.ok && data.retailers) {
        setRetailers(data.retailers)
        if (data.retailers.length > 0 && !retailerId) {
          setRetailerId(data.retailers[0].id)
        }
      }
    } catch {
      // ignore
    }
  }

  useEffect(() => {
    fetchRetailers()
  }, [])

  useEffect(() => {
    fetchPayments()
  }, [selectedRetailerFilter])

  const handleCreatePayment = async (e: React.FormEvent) => {
    e.preventDefault()
    if (!retailerId || !amount) return

    setSubmitting(true)
    try {
      const res = await fetch('/api/wholesale/payments', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          retailerId,
          amount,
          paymentMethod,
          referenceNo,
          notes,
        }),
      })

      const data = await res.json()
      if (res.ok) {
        showToast('success', 'Payment recorded successfully!')
        setIsModalOpen(false)
        setAmount('')
        setReferenceNo('')
        setNotes('')
        fetchPayments()
        fetchRetailers()
      } else {
        showToast('error', data.error || 'Failed to record payment')
      }
    } catch {
      showToast('error', 'Network error')
    } finally {
      setSubmitting(false)
    }
  }

  return (
    <div className="p-4 sm:p-6 lg:p-8 space-y-6 max-w-7xl mx-auto">
      <ToastContainer toasts={toasts} onDismiss={dismissToast} />

      {/* Header */}
      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
        <div>
          <div className="flex items-center gap-2">
            <span className="px-2.5 py-0.5 rounded-full text-xs font-semibold bg-emerald-100 text-emerald-800 border border-emerald-200">
              Accounts Receivable
            </span>
            <span className="text-xs text-slate-500 font-medium">Due Collection</span>
          </div>
          <h1 className="text-2xl font-black text-slate-900 tracking-tight mt-1">
            Retailer Dues &amp; Payment Ledger
          </h1>
          <p className="text-sm text-slate-500">
            Record cash, bKash, and bank collections to adjust retailer outstanding balances.
          </p>
        </div>

        <button
          onClick={() => setIsModalOpen(true)}
          className="inline-flex items-center gap-2 px-4 py-2.5 rounded-xl bg-emerald-600 hover:bg-emerald-500 text-white font-bold text-sm shadow-md transition-colors"
        >
          <Plus className="w-4 h-4" />
          <span>Record Payment</span>
        </button>
      </div>

      {/* Filter by Retailer */}
      <div className="bg-white rounded-xl p-3 border border-slate-200 shadow-sm flex items-center justify-between">
        <div className="flex items-center gap-3">
          <span className="text-xs font-bold text-slate-500">Filter by Retailer:</span>
          <select
            value={selectedRetailerFilter}
            onChange={(e) => setSelectedRetailerFilter(e.target.value)}
            className="px-3 py-1.5 text-xs rounded-lg border border-slate-200 bg-slate-50 font-semibold"
          >
            <option value="">All Retailers</option>
            {retailers.map((r) => (
              <option key={r.id} value={r.id}>
                {r.storeName} (Due: ৳{r.currentDue.toLocaleString()})
              </option>
            ))}
          </select>
        </div>

        <div className="text-xs font-semibold text-slate-600">
          Total Recorded Collections: <span className="font-mono font-bold text-emerald-700">৳ {totalCollected.toLocaleString()}</span>
        </div>
      </div>

      {/* Payments Table */}
      <div className="bg-white rounded-2xl border border-slate-200 shadow-sm overflow-hidden">
        <div className="overflow-x-auto">
          <table className="w-full text-left border-collapse text-xs">
            <thead>
              <tr className="bg-slate-50 text-slate-500 border-b border-slate-200 font-bold uppercase tracking-wider">
                <th className="py-3 px-4">Date</th>
                <th className="py-3 px-4">Retailer Pharmacy</th>
                <th className="py-3 px-4">Method</th>
                <th className="py-3 px-4">Reference / TrxID</th>
                <th className="py-3 px-4 text-right">Amount Collected</th>
                <th className="py-3 px-4 text-right">Remaining Due</th>
                <th className="py-3 px-4">Notes</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-100 font-medium text-slate-700">
              {loading ? (
                <tr>
                  <td colSpan={7} className="py-8 text-center text-slate-400">
                    Loading payments...
                  </td>
                </tr>
              ) : payments.length === 0 ? (
                <tr>
                  <td colSpan={7} className="py-8 text-center text-slate-400">
                    No payment transactions recorded yet.
                  </td>
                </tr>
              ) : (
                payments.map((p) => (
                  <tr key={p.id} className="hover:bg-slate-50/80">
                    <td className="py-3 px-4 font-mono text-slate-500">{p.paymentDate}</td>
                    <td className="py-3 px-4">
                      <div className="font-bold text-slate-900">{p.retailer.storeName}</div>
                      <div className="text-[11px] text-slate-400">{p.retailer.ownerName} ({p.retailer.phone})</div>
                    </td>
                    <td className="py-3 px-4">
                      <span className="px-2 py-0.5 rounded-md text-[10px] font-bold bg-slate-100 text-slate-700">
                        {p.paymentMethod}
                      </span>
                    </td>
                    <td className="py-3 px-4 font-mono text-slate-500">{p.referenceNo || '—'}</td>
                    <td className="py-3 px-4 text-right font-mono font-bold text-emerald-700">
                      ৳ {p.amount.toLocaleString('en-US', { minimumFractionDigits: 2 })}
                    </td>
                    <td className="py-3 px-4 text-right font-mono text-amber-700">
                      ৳ {p.retailer.currentDue.toLocaleString()}
                    </td>
                    <td className="py-3 px-4 text-slate-500">{p.notes || '—'}</td>
                  </tr>
                ))
              )}
            </tbody>
          </table>
        </div>
      </div>

      {/* Record Payment Modal */}
      {isModalOpen && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-slate-900/60 p-4 backdrop-blur-xs">
          <div className="bg-white rounded-2xl max-w-md w-full shadow-2xl overflow-hidden border border-slate-200">
            <div className="px-6 py-4 border-b border-slate-100 flex items-center justify-between">
              <h3 className="font-bold text-slate-900">Record Retailer Payment</h3>
              <button
                onClick={() => setIsModalOpen(false)}
                className="p-1 rounded-lg text-slate-400 hover:text-slate-600"
              >
                <X className="w-5 h-5" />
              </button>
            </div>

            <form onSubmit={handleCreatePayment} className="p-6 space-y-4 text-xs">
              <div className="space-y-1">
                <label className="font-bold text-slate-700">Select Retailer *</label>
                <select
                  value={retailerId}
                  onChange={(e) => setRetailerId(e.target.value)}
                  className="w-full px-3 py-2 rounded-xl border border-slate-200 font-semibold"
                >
                  {retailers.map((r) => (
                    <option key={r.id} value={r.id}>
                      {r.storeName} (Due: ৳{r.currentDue.toLocaleString()})
                    </option>
                  ))}
                </select>
              </div>

              <div className="space-y-1">
                <label className="font-bold text-slate-700">Amount Paid (BDT) *</label>
                <input
                  type="number"
                  step="any"
                  required
                  value={amount}
                  onChange={(e) => setAmount(e.target.value)}
                  placeholder="0.00"
                  className="w-full px-3 py-2 text-sm rounded-xl border border-slate-200 font-mono font-bold focus:ring-2 focus:ring-emerald-500"
                />
              </div>

              <div className="grid grid-cols-2 gap-3">
                <div className="space-y-1">
                  <label className="font-bold text-slate-700">Payment Method</label>
                  <select
                    value={paymentMethod}
                    onChange={(e) => setPaymentMethod(e.target.value)}
                    className="w-full px-3 py-2 rounded-xl border border-slate-200"
                  >
                    <option value="CASH">Cash</option>
                    <option value="BKASH">bKash</option>
                    <option value="BANK">Bank Transfer</option>
                    <option value="CREDIT">Credit Note</option>
                  </select>
                </div>
                <div className="space-y-1">
                  <label className="font-bold text-slate-700">Reference / TrxID</label>
                  <input
                    type="text"
                    value={referenceNo}
                    onChange={(e) => setReferenceNo(e.target.value)}
                    placeholder="Trx or Cheque #"
                    className="w-full px-3 py-2 rounded-xl border border-slate-200"
                  />
                </div>
              </div>

              <div className="space-y-1">
                <label className="font-bold text-slate-700">Notes</label>
                <input
                  type="text"
                  value={notes}
                  onChange={(e) => setNotes(e.target.value)}
                  placeholder="e.g. Weekly collection from route visit"
                  className="w-full px-3 py-2 rounded-xl border border-slate-200"
                />
              </div>

              <div className="pt-4 border-t border-slate-100 flex items-center justify-end gap-2">
                <button
                  type="button"
                  onClick={() => setIsModalOpen(false)}
                  className="px-4 py-2 rounded-xl text-slate-600 hover:bg-slate-100 font-semibold"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  disabled={submitting}
                  className="px-4 py-2 rounded-xl bg-emerald-600 hover:bg-emerald-500 text-white font-bold shadow-sm disabled:opacity-50"
                >
                  {submitting ? 'Recording...' : 'Confirm Payment'}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  )
}
