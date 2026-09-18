'use client'

import React, { useState, useEffect } from 'react'
import {
  Store,
  Search,
  Plus,
  Phone,
  MapPin,
  CreditCard,
  Percent,
  CheckCircle2,
  X,
  Edit2,
  Filter,
  DollarSign,
  AlertCircle,
  ExternalLink,
  Trash2,
} from 'lucide-react'
import { ToastContainer, ToastMessage } from '@/components/Toast'

interface Retailer {
  id: string
  retailerCode: string
  storeName: string
  ownerName: string
  phone: string
  email: string | null
  address: string
  marketRoute: string | null
  defaultDiscountPercent: number
  creditLimit: number
  currentDue: number
  pinCode: string | null
  isActive: boolean
  _count?: {
    orders: number
    payments: number
  }
}

export default function RetailersPage() {
  const [retailers, setRetailers] = useState<Retailer[]>([])
  const [routes, setRoutes] = useState<string[]>([])
  const [loading, setLoading] = useState(true)
  const [search, setSearch] = useState('')
  const [selectedRoute, setSelectedRoute] = useState('')
  const [toasts, setToasts] = useState<ToastMessage[]>([])

  const showToast = (type: 'success' | 'error' | 'info', text: string) => {
    setToasts((prev) => [...prev, { id: Math.random().toString(), type, text }])
  }

  const dismissToast = (id: string) => {
    setToasts((prev) => prev.filter((t) => t.id !== id))
  }

  // Add / Edit Modal state
  const [isModalOpen, setIsModalOpen] = useState(false)
  const [editingRetailer, setEditingRetailer] = useState<Retailer | null>(null)
  const [formData, setFormData] = useState({
    storeName: '',
    ownerName: '',
    phone: '',
    email: '',
    address: '',
    marketRoute: '',
    defaultDiscountPercent: '12',
    creditLimit: '50000',
    pinCode: '',
  })

  // Quick Payment Modal
  const [payModalRetailer, setPayModalRetailer] = useState<Retailer | null>(null)
  const [payAmount, setPayAmount] = useState('')
  const [payMethod, setPayMethod] = useState('CASH')
  const [payRef, setPayRef] = useState('')
  const [paySubmitting, setPaySubmitting] = useState(false)

  const fetchRetailers = async () => {
    setLoading(true)
    try {
      const query = new URLSearchParams()
      if (search) query.set('q', search)
      if (selectedRoute) query.set('route', selectedRoute)

      const res = await fetch(`/api/wholesale/retailers?${query.toString()}`)
      const data = await res.json()
      if (res.ok) {
        setRetailers(data.retailers || [])
        if (data.routes) setRoutes(data.routes)
      } else {
        showToast('error', data.error || 'Failed to load retailers')
      }
    } catch {
      showToast('error', 'Failed to connect to local server')
    } finally {
      setLoading(false)
    }
  }

  useEffect(() => {
    fetchRetailers()
  }, [search, selectedRoute])

  const openAddModal = () => {
    setEditingRetailer(null)
    setFormData({
      storeName: '',
      ownerName: '',
      phone: '',
      email: '',
      address: '',
      marketRoute: routes[0] || 'Dhaka Central Route',
      defaultDiscountPercent: '12',
      creditLimit: '50000',
      pinCode: '',
    })
    setIsModalOpen(true)
  }

  const openEditModal = (r: Retailer) => {
    setEditingRetailer(r)
    setFormData({
      storeName: r.storeName,
      ownerName: r.ownerName,
      phone: r.phone,
      email: r.email || '',
      address: r.address,
      marketRoute: r.marketRoute || '',
      defaultDiscountPercent: String(r.defaultDiscountPercent || 12),
      creditLimit: String(r.creditLimit || 50000),
      pinCode: r.pinCode || '',
    })
    setIsModalOpen(true)
  }

  const handleSaveRetailer = async (e: React.FormEvent) => {
    e.preventDefault()
    try {
      const url = editingRetailer
        ? `/api/wholesale/retailers/${editingRetailer.id}`
        : '/api/wholesale/retailers'
      const method = editingRetailer ? 'PUT' : 'POST'

      const res = await fetch(url, {
        method,
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(formData),
      })

      const data = await res.json()
      if (res.ok) {
        showToast(
          'success',
          editingRetailer ? 'Retailer updated successfully!' : 'New retailer added successfully!'
        )
        setIsModalOpen(false)
        fetchRetailers()
      } else {
        showToast('error', data.error || 'Could not save retailer.')
      }
    } catch {
      showToast('error', 'Network request failed.')
    }
  }

  const handleRecordPayment = async (e: React.FormEvent) => {
    e.preventDefault()
    if (!payModalRetailer || !payAmount) return

    setPaySubmitting(true)
    try {
      const res = await fetch('/api/wholesale/payments', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          retailerId: payModalRetailer.id,
          amount: payAmount,
          paymentMethod: payMethod,
          referenceNo: payRef,
        }),
      })

      const data = await res.json()
      if (res.ok) {
        showToast('success', `Payment of ৳${payAmount} recorded for ${payModalRetailer.storeName}!`)
        setPayModalRetailer(null)
        setPayAmount('')
        setPayRef('')
        fetchRetailers()
      } else {
        showToast('error', data.error || 'Failed to record payment')
      }
    } catch {
      showToast('error', 'Error submitting payment')
    } finally {
      setPaySubmitting(false)
    }
  }

  const handleDeleteRetailer = async (r: Retailer) => {
    const confirmDelete = window.confirm(
      `Are you sure you want to delete retailer "${r.storeName}" (${r.retailerCode})?\n\nThis will permanently remove their profile and all associated records.`
    )
    if (!confirmDelete) return

    try {
      const res = await fetch(`/api/wholesale/retailers/${r.id}`, {
        method: 'DELETE',
      })
      const data = await res.json()
      if (res.ok) {
        showToast('success', `Retailer "${r.storeName}" deleted successfully`)
        fetchRetailers()
      } else {
        showToast('error', data.error || 'Failed to delete retailer')
      }
    } catch {
      showToast('error', 'Failed to connect to local server')
    }
  }

  const totalDues = retailers.reduce((s, r) => s + r.currentDue, 0)
  const totalCredit = retailers.reduce((s, r) => s + r.creditLimit, 0)

  return (
    <div className="p-4 sm:p-6 lg:p-8 space-y-6 max-w-7xl mx-auto">
      <ToastContainer toasts={toasts} onDismiss={dismissToast} />

      {/* Header */}
      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
        <div>
          <div className="flex items-center gap-2">
            <span className="px-2.5 py-0.5 rounded-full text-xs font-semibold bg-sky-100 text-sky-800 border border-sky-200">
              Retailer Accounts
            </span>
            <span className="text-xs text-slate-500 font-medium">Pharmacy Stores</span>
          </div>
          <h1 className="text-2xl font-black text-slate-900 tracking-tight mt-1">
            Retailer Directory &amp; Credit Ledger
          </h1>
          <p className="text-sm text-slate-500">
            Manage customer profiles, credit limits, trade discounts, and outstanding receivables.
          </p>
        </div>

        <button
          onClick={openAddModal}
          className="inline-flex items-center gap-2 px-4 py-2.5 rounded-xl bg-sky-600 hover:bg-sky-500 text-white font-bold text-sm shadow-md transition-colors cursor-pointer"
        >
          <Plus className="w-4 h-4" />
          <span>Add New Retailer</span>
        </button>
      </div>

      {/* Quick Summary Cards */}
      <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
        <div className="bg-white rounded-xl p-4 border border-slate-200 shadow-sm flex items-center justify-between">
          <div>
            <div className="text-xs font-bold text-slate-500 uppercase">Total Retailers</div>
            <div className="text-2xl font-black text-slate-900 mt-0.5">{retailers.length} Stores</div>
          </div>
          <div className="p-3 bg-blue-50 text-blue-600 rounded-xl">
            <Store className="w-5 h-5" />
          </div>
        </div>

        <div className="bg-white rounded-xl p-4 border border-slate-200 shadow-sm flex items-center justify-between">
          <div>
            <div className="text-xs font-bold text-slate-500 uppercase">Total Outstanding Dues</div>
            <div className="text-2xl font-black text-amber-600 mt-0.5">
              ৳ {totalDues.toLocaleString('en-US', { minimumFractionDigits: 2 })}
            </div>
          </div>
          <div className="p-3 bg-amber-50 text-amber-600 rounded-xl">
            <CreditCard className="w-5 h-5" />
          </div>
        </div>

        <div className="bg-white rounded-xl p-4 border border-slate-200 shadow-sm flex items-center justify-between">
          <div>
            <div className="text-xs font-bold text-slate-500 uppercase">Approved Credit Exposure</div>
            <div className="text-2xl font-black text-slate-900 mt-0.5">
              ৳ {totalCredit.toLocaleString('en-US', { minimumFractionDigits: 2 })}
            </div>
          </div>
          <div className="p-3 bg-emerald-50 text-emerald-600 rounded-xl">
            <DollarSign className="w-5 h-5" />
          </div>
        </div>
      </div>

      {/* Filter & Search Bar */}
      <div className="bg-white rounded-xl p-3 border border-slate-200 shadow-sm flex flex-col md:flex-row gap-3 items-center justify-between">
        <div className="relative w-full md:w-80">
          <Search className="w-4 h-4 text-slate-400 absolute left-3 top-3" />
          <input
            type="text"
            placeholder="Search by store, owner, code, phone..."
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            className="w-full pl-9 pr-3 py-2 text-xs rounded-lg border border-slate-200 focus:outline-none focus:ring-2 focus:ring-sky-500 bg-slate-50"
          />
        </div>

        {/* Route Pills Filter */}
        <div className="flex items-center gap-1.5 overflow-x-auto w-full md:w-auto pb-1 md:pb-0">
          <button
            onClick={() => setSelectedRoute('')}
            className={`px-3 py-1.5 rounded-lg text-xs font-semibold whitespace-nowrap transition-colors cursor-pointer ${
              selectedRoute === ''
                ? 'bg-slate-900 text-white shadow-sm'
                : 'bg-slate-100 text-slate-600 hover:bg-slate-200'
            }`}
          >
            All Routes
          </button>
          {routes.map((route) => (
            <button
              key={route}
              onClick={() => setSelectedRoute(route)}
              className={`px-3 py-1.5 rounded-lg text-xs font-semibold whitespace-nowrap transition-colors cursor-pointer ${
                selectedRoute === route
                  ? 'bg-sky-600 text-white shadow-sm'
                  : 'bg-slate-100 text-slate-600 hover:bg-slate-200'
              }`}
            >
              {route}
            </button>
          ))}
        </div>
      </div>

      {/* Retailers Table */}
      <div className="bg-white rounded-2xl border border-slate-200 shadow-sm overflow-hidden">
        <div className="overflow-x-auto">
          <table className="w-full text-left border-collapse text-xs">
            <thead>
              <tr className="bg-slate-50 text-slate-500 border-b border-slate-200 font-bold uppercase tracking-wider">
                <th className="py-3 px-4">Code</th>
                <th className="py-3 px-4">Pharmacy / Store Name</th>
                <th className="py-3 px-4">Contact Info</th>
                <th className="py-3 px-4">Market Route</th>
                <th className="py-3 px-4 text-center">Trade Disc.</th>
                <th className="py-3 px-4 text-right">Credit Limit</th>
                <th className="py-3 px-4 text-right">Current Due</th>
                <th className="py-3 px-4 text-center">Actions</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-100 font-medium text-slate-700">
              {loading ? (
                <tr>
                  <td colSpan={8} className="py-8 text-center text-slate-400">
                    Loading retailer accounts...
                  </td>
                </tr>
              ) : retailers.length === 0 ? (
                <tr>
                  <td colSpan={8} className="py-8 text-center text-slate-400">
                    No retailers found matching your search.
                  </td>
                </tr>
              ) : (
                retailers.map((r) => {
                  const isOverDue = r.currentDue > r.creditLimit
                  return (
                    <tr key={r.id} className="hover:bg-slate-50/80 transition-colors">
                      <td className="py-3 px-4 font-mono font-bold text-sky-700">{r.retailerCode}</td>
                      <td className="py-3 px-4">
                        <div className="font-bold text-slate-900">{r.storeName}</div>
                        <div className="text-[11px] text-slate-500">{r.ownerName}</div>
                      </td>
                      <td className="py-3 px-4">
                        <div className="flex items-center gap-1.5 text-slate-900 font-medium">
                          <Phone className="w-3 h-3 text-slate-400" />
                          <span>{r.phone}</span>
                        </div>
                        <div className="text-[11px] text-slate-400 truncate max-w-[200px]">{r.address}</div>
                      </td>
                      <td className="py-3 px-4">
                        <span className="inline-block px-2 py-0.5 rounded-md text-[11px] font-semibold bg-slate-100 text-slate-700">
                          {r.marketRoute || 'N/A'}
                        </span>
                      </td>
                      <td className="py-3 px-4 text-center font-bold text-slate-900">
                        {r.defaultDiscountPercent}%
                      </td>
                      <td className="py-3 px-4 text-right font-mono text-slate-600">
                        ৳ {r.creditLimit.toLocaleString()}
                      </td>
                      <td className="py-3 px-4 text-right font-mono font-bold">
                        <span className={r.currentDue > 0 ? 'text-amber-600' : 'text-emerald-600'}>
                          ৳ {r.currentDue.toLocaleString()}
                        </span>
                        {isOverDue && (
                          <div className="text-[10px] text-rose-600 font-bold uppercase">Over Limit</div>
                        )}
                      </td>
                      <td className="py-3 px-4 text-center">
                        <div className="flex items-center justify-center gap-1.5">
                          <button
                            onClick={() => {
                              setPayModalRetailer(r)
                              setPayAmount(r.currentDue > 0 ? String(r.currentDue) : '')
                            }}
                            className="px-2.5 py-1 rounded-lg text-xs font-semibold bg-emerald-50 hover:bg-emerald-100 text-emerald-700 border border-emerald-200 transition-colors cursor-pointer"
                            title="Collect Payment"
                          >
                            Pay Due
                          </button>
                          <button
                            onClick={() => openEditModal(r)}
                            className="p-1.5 rounded-lg text-slate-500 hover:text-slate-800 hover:bg-slate-100 transition-colors cursor-pointer"
                            title="Edit Retailer"
                          >
                            <Edit2 className="w-3.5 h-3.5" />
                          </button>
                          <button
                            onClick={() => handleDeleteRetailer(r)}
                            className="p-1.5 rounded-lg text-rose-500 hover:text-rose-700 hover:bg-rose-50 transition-colors cursor-pointer"
                            title="Delete Retailer"
                          >
                            <Trash2 className="w-3.5 h-3.5" />
                          </button>
                        </div>
                      </td>
                    </tr>
                  )
                })
              )}
            </tbody>
          </table>
        </div>
      </div>

      {/* Add / Edit Retailer Modal */}
      {isModalOpen && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-slate-900/60 p-4 backdrop-blur-xs">
          <div className="bg-white rounded-2xl max-w-lg w-full shadow-2xl overflow-hidden border border-slate-200 animate-in fade-in zoom-in-95 duration-150">
            <div className="px-6 py-4 border-b border-slate-100 flex items-center justify-between">
              <h3 className="font-bold text-slate-900">
                {editingRetailer ? 'Edit Retailer Profile' : 'Add New Pharmacy Retailer'}
              </h3>
              <button
                onClick={() => setIsModalOpen(false)}
                className="p-1 rounded-lg text-slate-400 hover:text-slate-600 hover:bg-slate-100 cursor-pointer"
              >
                <X className="w-5 h-5" />
              </button>
            </div>

            <form onSubmit={handleSaveRetailer} className="p-6 space-y-4 text-xs">
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                <div className="space-y-1">
                  <label className="font-bold text-slate-700">Pharmacy / Store Name *</label>
                  <input
                    type="text"
                    required
                    value={formData.storeName}
                    onChange={(e) => setFormData({ ...formData, storeName: e.target.value })}
                    placeholder="e.g. Popular Pharmacy"
                    className="w-full px-3 py-2 rounded-lg border border-slate-200 focus:ring-2 focus:ring-sky-500"
                  />
                </div>
                <div className="space-y-1">
                  <label className="font-bold text-slate-700">Owner / Contact Person *</label>
                  <input
                    type="text"
                    required
                    value={formData.ownerName}
                    onChange={(e) => setFormData({ ...formData, ownerName: e.target.value })}
                    placeholder="e.g. Rafiqul Islam"
                    className="w-full px-3 py-2 rounded-lg border border-slate-200 focus:ring-2 focus:ring-sky-500"
                  />
                </div>
              </div>

              <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                <div className="space-y-1">
                  <label className="font-bold text-slate-700">Phone Number *</label>
                  <input
                    type="text"
                    required
                    value={formData.phone}
                    onChange={(e) => setFormData({ ...formData, phone: e.target.value })}
                    placeholder="01711-xxxxxx"
                    className="w-full px-3 py-2 rounded-lg border border-slate-200 focus:ring-2 focus:ring-sky-500"
                  />
                </div>
                <div className="space-y-1">
                  <label className="font-bold text-slate-700">Market Route / Territory</label>
                  <input
                    type="text"
                    value={formData.marketRoute}
                    onChange={(e) => setFormData({ ...formData, marketRoute: e.target.value })}
                    placeholder="e.g. Mirpur Route"
                    className="w-full px-3 py-2 rounded-lg border border-slate-200 focus:ring-2 focus:ring-sky-500"
                  />
                </div>
              </div>

              <div className="space-y-1">
                <label className="font-bold text-slate-700">Store Address *</label>
                <textarea
                  required
                  rows={2}
                  value={formData.address}
                  onChange={(e) => setFormData({ ...formData, address: e.target.value })}
                  placeholder="Shop number, market, road, area"
                  className="w-full px-3 py-2 rounded-lg border border-slate-200 focus:ring-2 focus:ring-sky-500"
                />
              </div>

              <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
                <div className="space-y-1">
                  <label className="font-bold text-slate-700">Trade Discount %</label>
                  <input
                    type="number"
                    step="0.5"
                    value={formData.defaultDiscountPercent}
                    onChange={(e) => setFormData({ ...formData, defaultDiscountPercent: e.target.value })}
                    className="w-full px-3 py-2 rounded-lg border border-slate-200 focus:ring-2 focus:ring-sky-500"
                  />
                </div>
                <div className="space-y-1">
                  <label className="font-bold text-slate-700">Credit Limit (BDT)</label>
                  <input
                    type="number"
                    value={formData.creditLimit}
                    onChange={(e) => setFormData({ ...formData, creditLimit: e.target.value })}
                    className="w-full px-3 py-2 rounded-lg border border-slate-200 focus:ring-2 focus:ring-sky-500"
                  />
                </div>
                <div className="space-y-1">
                  <label className="font-bold text-slate-700">Login PIN (4 digits)</label>
                  <input
                    type="text"
                    maxLength={4}
                    value={formData.pinCode}
                    onChange={(e) => setFormData({ ...formData, pinCode: e.target.value })}
                    placeholder="e.g. 1001"
                    className="w-full px-3 py-2 rounded-lg border border-slate-200 focus:ring-2 focus:ring-sky-500"
                  />
                </div>
              </div>

              <div className="pt-4 border-t border-slate-100 flex items-center justify-end gap-2">
                <button
                  type="button"
                  onClick={() => setIsModalOpen(false)}
                  className="px-4 py-2 rounded-xl text-slate-600 hover:bg-slate-100 font-semibold cursor-pointer"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  className="px-4 py-2 rounded-xl bg-sky-600 hover:bg-sky-500 text-white font-bold shadow-sm cursor-pointer"
                >
                  {editingRetailer ? 'Update Retailer' : 'Create Retailer'}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* Record Payment Modal */}
      {payModalRetailer && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-slate-900/60 p-4 backdrop-blur-xs">
          <div className="bg-white rounded-2xl max-w-md w-full shadow-2xl overflow-hidden border border-slate-200">
            <div className="px-6 py-4 border-b border-slate-100 flex items-center justify-between">
              <div>
                <h3 className="font-bold text-slate-900">Record Retailer Payment</h3>
                <p className="text-xs text-slate-500">{payModalRetailer.storeName}</p>
              </div>
              <button
                onClick={() => setPayModalRetailer(null)}
                className="p-1 rounded-lg text-slate-400 hover:text-slate-600 cursor-pointer"
              >
                <X className="w-5 h-5" />
              </button>
            </div>

            <form onSubmit={handleRecordPayment} className="p-6 space-y-4 text-xs">
              <div className="p-3 bg-amber-50 rounded-xl border border-amber-200 flex items-center justify-between">
                <span className="font-bold text-amber-800">Current Outstanding Due:</span>
                <span className="font-mono font-bold text-amber-900 text-sm">
                  ৳ {payModalRetailer.currentDue.toLocaleString()}
                </span>
              </div>

              <div className="space-y-1">
                <label className="font-bold text-slate-700">Payment Amount (BDT) *</label>
                <input
                  type="number"
                  step="any"
                  required
                  value={payAmount}
                  onChange={(e) => setPayAmount(e.target.value)}
                  placeholder="Enter amount paid"
                  className="w-full px-3 py-2 text-sm rounded-lg border border-slate-200 focus:ring-2 focus:ring-emerald-500 font-mono font-bold"
                />
              </div>

              <div className="grid grid-cols-2 gap-3">
                <div className="space-y-1">
                  <label className="font-bold text-slate-700">Payment Method</label>
                  <select
                    value={payMethod}
                    onChange={(e) => setPayMethod(e.target.value)}
                    className="w-full px-3 py-2 rounded-lg border border-slate-200"
                  >
                    <option value="CASH">Cash</option>
                    <option value="BKASH">bKash</option>
                    <option value="BANK">Bank Transfer</option>
                    <option value="CREDIT">Credit Adjustment</option>
                  </select>
                </div>
                <div className="space-y-1">
                  <label className="font-bold text-slate-700">Reference / TrxID</label>
                  <input
                    type="text"
                    value={payRef}
                    onChange={(e) => setPayRef(e.target.value)}
                    placeholder="e.g. Trx #98231"
                    className="w-full px-3 py-2 rounded-lg border border-slate-200"
                  />
                </div>
              </div>

              <div className="pt-4 border-t border-slate-100 flex items-center justify-end gap-2">
                <button
                  type="button"
                  onClick={() => setPayModalRetailer(null)}
                  className="px-4 py-2 rounded-xl text-slate-600 hover:bg-slate-100 font-semibold cursor-pointer"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  disabled={paySubmitting}
                  className="px-4 py-2 rounded-xl bg-emerald-600 hover:bg-emerald-500 text-white font-bold shadow-sm disabled:opacity-50 cursor-pointer"
                >
                  {paySubmitting ? 'Recording...' : 'Confirm Payment'}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  )
}
