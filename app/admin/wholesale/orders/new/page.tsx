'use client'

import React, { useState, useEffect, useRef } from 'react'
import { useRouter } from 'next/navigation'
import Link from 'next/link'
import {
  Search,
  Plus,
  Trash2,
  ShoppingCart,
  Store,
  CreditCard,
  Printer,
  CheckCircle2,
  AlertTriangle,
  ArrowLeft,
  ChevronDown,
} from 'lucide-react'
import { ToastContainer, ToastMessage } from '@/components/Toast'

interface Retailer {
  id: string
  retailerCode: string
  storeName: string
  ownerName: string
  phone: string
  marketRoute: string | null
  defaultDiscountPercent: number
  creditLimit: number
  currentDue: number
}

interface Medicine {
  id: string
  brandName: string
  genericName: string
  strength: string
  dosageForm: string
  mrp: number | null
  stripPrice: number | null
  boxPrice: number | null
  tradePrice: number | null
  tradeBoxPrice: number | null
  unitsPerStrip: number | null
  stripsPerBox: number | null
  manufacturer?: {
    name: string
  }
}

interface OrderItem {
  medicineId: string
  brandName: string
  genericName: string
  strength: string
  quantity: number
  unit: 'Box' | 'Strip' | 'Tablet'
  unitPrice: number
  tradePrice: number
  discountPercent: number
  total: number
}

export default function NewWholesaleOrderPage() {
  const router = useRouter()
  const [retailers, setRetailers] = useState<Retailer[]>([])
  const [selectedRetailerId, setSelectedRetailerId] = useState<string>('')
  const [toasts, setToasts] = useState<ToastMessage[]>([])

  const showToast = (type: 'success' | 'error' | 'info', text: string) => {
    setToasts((prev) => [...prev, { id: Math.random().toString(), type, text }])
  }

  const dismissToast = (id: string) => {
    setToasts((prev) => prev.filter((t) => t.id !== id))
  }

  // Medicine search
  const [medQuery, setMedQuery] = useState('')
  const [medResults, setMedResults] = useState<Medicine[]>([])
  const [selectedMed, setSelectedMed] = useState<Medicine | null>(null)
  const [searchLoading, setSearchLoading] = useState(false)
  const [dropdownOpen, setDropdownOpen] = useState(false)

  // Item builder
  const [quantity, setQuantity] = useState<number>(1)
  const [unit, setUnit] = useState<'Box' | 'Strip' | 'Tablet'>('Box')
  const [customDiscount, setCustomDiscount] = useState<number>(12)

  // Order items
  const [items, setItems] = useState<OrderItem[]>([])
  const [paidAmount, setPaidAmount] = useState<string>('0')
  const [paymentMethod, setPaymentMethod] = useState<'CASH' | 'BKASH' | 'BANK' | 'CREDIT'>('CASH')
  const [notes, setNotes] = useState('')
  const [isSubmitting, setIsSubmitting] = useState(false)

  const searchRef = useRef<HTMLDivElement>(null)

  // Load retailers
  useEffect(() => {
    async function loadRetailers() {
      try {
        const res = await fetch('/api/wholesale/retailers?active=true')
        const data = await res.json()
        if (res.ok && data.retailers) {
          setRetailers(data.retailers)
          if (data.retailers.length > 0) {
            setSelectedRetailerId(data.retailers[0].id)
            setCustomDiscount(data.retailers[0].defaultDiscountPercent || 12)
          }
        }
      } catch {
        // ignore
      }
    }
    loadRetailers()
  }, [])

  // Update default discount when retailer changes
  useEffect(() => {
    const current = retailers.find((r) => r.id === selectedRetailerId)
    if (current) {
      setCustomDiscount(current.defaultDiscountPercent || 12)
    }
  }, [selectedRetailerId, retailers])

  // Search medicines
  useEffect(() => {
    if (!medQuery || medQuery.length < 2) {
      setMedResults([])
      return
    }

    const timer = setTimeout(async () => {
      setSearchLoading(true)
      try {
        const res = await fetch(`/api/wholesale/medicines?q=${encodeURIComponent(medQuery)}&limit=15`)
        const data = await res.json()
        if (res.ok && data.medicines) {
          setMedResults(data.medicines)
          setDropdownOpen(true)
        }
      } catch {
        // ignore
      } finally {
        setSearchLoading(false)
      }
    }, 250)

    return () => clearTimeout(timer)
  }, [medQuery])

  // Click outside to close medicine dropdown
  useEffect(() => {
    function handleClickOutside(e: MouseEvent) {
      if (searchRef.current && !searchRef.current.contains(e.target as Node)) {
        setDropdownOpen(false)
      }
    }
    document.addEventListener('mousedown', handleClickOutside)
    return () => document.removeEventListener('mousedown', handleClickOutside)
  }, [])

  const selectMedicine = (med: Medicine) => {
    setSelectedMed(med)
    setMedQuery(`${med.brandName} ${med.strength}`)
    setDropdownOpen(false)
  }

  // Calculate pricing based on selected unit
  const getPricesForUnit = () => {
    if (!selectedMed) return { unitPrice: 0, tradePrice: 0 }

    let unitPrice = 0
    let tradePrice = 0

    if (unit === 'Box') {
      unitPrice = selectedMed.boxPrice || (selectedMed.mrp || 10) * 100
      tradePrice =
        selectedMed.tradeBoxPrice || Math.round(unitPrice * (1 - customDiscount / 100) * 100) / 100
    } else if (unit === 'Strip') {
      unitPrice = selectedMed.stripPrice || (selectedMed.mrp || 10) * 10
      tradePrice = Math.round(unitPrice * (1 - customDiscount / 100) * 100) / 100
    } else {
      unitPrice = selectedMed.mrp || 10
      tradePrice = selectedMed.tradePrice || Math.round(unitPrice * (1 - customDiscount / 100) * 100) / 100
    }

    return { unitPrice, tradePrice }
  }

  const handleAddItem = (e: React.FormEvent) => {
    e.preventDefault()
    if (!selectedMed) {
      showToast('error', 'Please search and select a medicine first.')
      return
    }
    if (quantity <= 0) {
      showToast('error', 'Quantity must be at least 1.')
      return
    }

    const { unitPrice, tradePrice } = getPricesForUnit()
    const lineTotal = Math.round(tradePrice * quantity * 100) / 100

    const newItem: OrderItem = {
      medicineId: selectedMed.id,
      brandName: selectedMed.brandName,
      genericName: selectedMed.genericName,
      strength: selectedMed.strength,
      quantity,
      unit,
      unitPrice,
      tradePrice,
      discountPercent: customDiscount,
      total: lineTotal,
    }

    setItems([...items, newItem])
    setSelectedMed(null)
    setMedQuery('')
    setQuantity(1)
  }

  const handleRemoveItem = (index: number) => {
    setItems(items.filter((_, i) => i !== index))
  }

  // Summary calculations
  const subtotalMrp = items.reduce((sum, item) => sum + item.unitPrice * item.quantity, 0)
  const totalPayable = items.reduce((sum, item) => sum + item.total, 0)
  const totalDiscount = Math.max(0, subtotalMrp - totalPayable)

  const parsedPaid = parseFloat(paidAmount) || 0
  const remainingDue = Math.max(0, Math.round((totalPayable - parsedPaid) * 100) / 100)

  const selectedRetailer = retailers.find((r) => r.id === selectedRetailerId)

  const handleSubmitOrder = async () => {
    if (!selectedRetailerId) {
      showToast('error', 'Please select a retailer.')
      return
    }
    if (items.length === 0) {
      showToast('error', 'Please add at least one medicine item.')
      return
    }

    setIsSubmitting(true)
    try {
      const res = await fetch('/api/wholesale/orders', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          retailerId: selectedRetailerId,
          items,
          paidAmount: parsedPaid,
          paymentMethod,
          notes,
        }),
      })

      const data = await res.json()
      if (res.ok && data.order) {
        showToast('success', `Wholesale Order ${data.order.orderNumber} created!`)
        setTimeout(() => {
          router.push(`/admin/wholesale/invoices/${data.order.id}`)
        }, 800)
      } else {
        showToast('error', data.error || 'Failed to place wholesale order.')
        setIsSubmitting(false)
      }
    } catch {
      showToast('error', 'Server connection error.')
      setIsSubmitting(false)
    }
  }

  const { unitPrice: activeUnitPrice, tradePrice: activeTradePrice } = getPricesForUnit()

  return (
    <div className="p-4 sm:p-6 lg:p-8 space-y-6 max-w-7xl mx-auto">
      <ToastContainer toasts={toasts} onDismiss={dismissToast} />

      {/* Header */}
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-3">
          <Link
            href="/admin/wholesale/orders"
            className="p-2 rounded-xl bg-slate-100 hover:bg-slate-200 text-slate-700 transition-colors"
          >
            <ArrowLeft className="w-5 h-5" />
          </Link>
          <div>
            <h1 className="text-2xl font-black text-slate-900 tracking-tight">
              Create Wholesale Order
            </h1>
            <p className="text-xs text-slate-500">Fast POS-style wholesale billing for pharmacy retailers</p>
          </div>
        </div>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        {/* Left 2 Cols: Order Builder */}
        <div className="lg:col-span-2 space-y-5">
          {/* Step 1: Select Retailer */}
          <div className="bg-white rounded-2xl border border-slate-200 shadow-sm p-5 space-y-3">
            <div className="flex items-center justify-between">
              <span className="text-xs font-bold uppercase tracking-wider text-slate-500 flex items-center gap-1.5">
                <Store className="w-4 h-4 text-sky-600" />
                1. Select Retailer
              </span>
              {selectedRetailer && (
                <span className="text-xs text-slate-500">
                  Route: <strong className="text-slate-800">{selectedRetailer.marketRoute || 'N/A'}</strong>
                </span>
              )}
            </div>

            <select
              value={selectedRetailerId}
              onChange={(e) => setSelectedRetailerId(e.target.value)}
              className="w-full px-3.5 py-2.5 rounded-xl border border-slate-200 text-sm font-bold text-slate-900 focus:ring-2 focus:ring-sky-500 bg-slate-50"
            >
              {retailers.map((r) => (
                <option key={r.id} value={r.id}>
                  {r.storeName} — {r.ownerName} ({r.marketRoute || 'Dhaka'}) [Due: ৳{r.currentDue.toLocaleString()}]
                </option>
              ))}
            </select>

            {selectedRetailer && (
              <div className="grid grid-cols-3 gap-2 pt-2 border-t border-slate-100 text-xs">
                <div>
                  <span className="text-slate-400">Owner / Phone:</span>
                  <div className="font-semibold text-slate-800 truncate">
                    {selectedRetailer.ownerName} ({selectedRetailer.phone})
                  </div>
                </div>
                <div>
                  <span className="text-slate-400">Current Due:</span>
                  <div className="font-mono font-bold text-amber-600">
                    ৳ {selectedRetailer.currentDue.toLocaleString()}
                  </div>
                </div>
                <div>
                  <span className="text-slate-400">Approved Credit:</span>
                  <div className="font-mono font-semibold text-slate-700">
                    ৳ {selectedRetailer.creditLimit.toLocaleString()}
                  </div>
                </div>
              </div>
            )}
          </div>

          {/* Step 2: Medicine Picker & Item Builder */}
          <div className="bg-white rounded-2xl border border-slate-200 shadow-sm p-5 space-y-4">
            <span className="text-xs font-bold uppercase tracking-wider text-slate-500 flex items-center gap-1.5">
              <ShoppingCart className="w-4 h-4 text-sky-600" />
              2. Add Medicines to Wholesale Order
            </span>

            <form onSubmit={handleAddItem} className="space-y-4">
              <div className="relative" ref={searchRef}>
                <label className="text-xs font-bold text-slate-700 block mb-1">
                  Search Medicine (Brand name, generic, strength) *
                </label>
                <div className="relative">
                  <Search className="w-4 h-4 text-slate-400 absolute left-3.5 top-3" />
                  <input
                    type="text"
                    value={medQuery}
                    onChange={(e) => setMedQuery(e.target.value)}
                    placeholder="Type brand name (e.g. Napa, Seclo, Monas, Cipro)..."
                    className="w-full pl-10 pr-4 py-2.5 text-sm rounded-xl border border-slate-200 focus:ring-2 focus:ring-sky-500 bg-slate-50"
                  />
                  {searchLoading && (
                    <span className="absolute right-3.5 top-3 text-xs text-slate-400">Searching...</span>
                  )}
                </div>

                {/* Dropdown Results */}
                {dropdownOpen && medResults.length > 0 && (
                  <div className="absolute left-0 right-0 top-full mt-1 bg-white rounded-xl shadow-xl border border-slate-200 z-30 max-h-64 overflow-y-auto divide-y divide-slate-100">
                    {medResults.map((med) => (
                      <button
                        key={med.id}
                        type="button"
                        onClick={() => selectMedicine(med)}
                        className="w-full text-left px-4 py-2.5 hover:bg-sky-50 transition-colors flex items-center justify-between text-xs"
                      >
                        <div>
                          <div className="font-bold text-slate-900">
                            {med.brandName} <span className="text-sky-600 font-normal">{med.strength}</span>
                          </div>
                          <div className="text-[11px] text-slate-400">
                            {med.genericName} • {med.dosageForm} • {med.manufacturer?.name}
                          </div>
                        </div>
                        <div className="text-right">
                          <div className="font-mono font-bold text-slate-800">
                            ৳ {med.boxPrice ? `${med.boxPrice}/box` : `${med.mrp}/unit`}
                          </div>
                          <div className="text-[10px] text-emerald-600 font-semibold">
                            TP: ৳ {med.tradeBoxPrice || Math.round((med.boxPrice || 100) * 0.88)}
                          </div>
                        </div>
                      </button>
                    ))}
                  </div>
                )}
              </div>

              {/* Medicine Configuration Row */}
              <div className="grid grid-cols-1 sm:grid-cols-4 gap-3">
                <div>
                  <label className="text-xs font-bold text-slate-700 block mb-1">Unit Pack</label>
                  <select
                    value={unit}
                    onChange={(e) => setUnit(e.target.value as any)}
                    className="w-full px-3 py-2 rounded-xl border border-slate-200 text-xs font-semibold"
                  >
                    <option value="Box">Box</option>
                    <option value="Strip">Strip</option>
                    <option value="Tablet">Tablet / Unit</option>
                  </select>
                </div>

                <div>
                  <label className="text-xs font-bold text-slate-700 block mb-1">Quantity</label>
                  <input
                    type="number"
                    min={1}
                    value={quantity}
                    onChange={(e) => setQuantity(Math.max(1, parseInt(e.target.value) || 1))}
                    className="w-full px-3 py-2 rounded-xl border border-slate-200 text-xs font-mono font-bold"
                  />
                </div>

                <div>
                  <label className="text-xs font-bold text-slate-700 block mb-1">Trade Disc. %</label>
                  <input
                    type="number"
                    step="0.5"
                    value={customDiscount}
                    onChange={(e) => setCustomDiscount(parseFloat(e.target.value) || 0)}
                    className="w-full px-3 py-2 rounded-xl border border-slate-200 text-xs font-mono font-bold"
                  />
                </div>

                <div className="flex items-end">
                  <button
                    type="submit"
                    className="w-full py-2 px-3 rounded-xl bg-sky-600 hover:bg-sky-500 text-white font-bold text-xs shadow-sm transition-colors flex items-center justify-center gap-1.5"
                  >
                    <Plus className="w-4 h-4" />
                    <span>Add Item</span>
                  </button>
                </div>
              </div>

              {selectedMed && (
                <div className="p-3 rounded-xl bg-sky-50/70 border border-sky-200 text-xs flex items-center justify-between">
                  <div>
                    <span className="font-bold text-slate-900">{selectedMed.brandName} {selectedMed.strength}</span>
                    <span className="text-slate-500 ml-2">({unit})</span>
                  </div>
                  <div className="flex items-center gap-4 font-mono">
                    <span className="text-slate-500">MRP: ৳{activeUnitPrice}</span>
                    <span className="font-bold text-emerald-700">Wholesale Rate: ৳{activeTradePrice}</span>
                    <span className="font-bold text-slate-900">Total: ৳{Math.round(activeTradePrice * quantity * 100) / 100}</span>
                  </div>
                </div>
              )}
            </form>
          </div>

          {/* Step 3: Line Items Table */}
          <div className="bg-white rounded-2xl border border-slate-200 shadow-sm overflow-hidden">
            <div className="px-5 py-3.5 border-b border-slate-100 flex items-center justify-between">
              <span className="text-xs font-bold uppercase tracking-wider text-slate-500">
                Order Items ({items.length})
              </span>
              {items.length > 0 && (
                <button
                  onClick={() => setItems([])}
                  className="text-xs text-rose-600 hover:underline font-semibold"
                >
                  Clear All
                </button>
              )}
            </div>

            <div className="overflow-x-auto">
              <table className="w-full text-left border-collapse text-xs">
                <thead>
                  <tr className="bg-slate-50 text-slate-500 border-b border-slate-200 font-bold uppercase tracking-wider">
                    <th className="py-2.5 px-4">#</th>
                    <th className="py-2.5 px-4">Medicine Name</th>
                    <th className="py-2.5 px-4">Pack</th>
                    <th className="py-2.5 px-4 text-center">Qty</th>
                    <th className="py-2.5 px-4 text-right">Unit MRP</th>
                    <th className="py-2.5 px-4 text-right">Wholesale Rate</th>
                    <th className="py-2.5 px-4 text-right">Line Total</th>
                    <th className="py-2.5 px-4 text-center"></th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-slate-100 font-medium text-slate-700">
                  {items.length === 0 ? (
                    <tr>
                      <td colSpan={8} className="py-8 text-center text-slate-400">
                        No medicines added yet. Use the search bar above to add products.
                      </td>
                    </tr>
                  ) : (
                    items.map((item, idx) => (
                      <tr key={idx} className="hover:bg-slate-50/80">
                        <td className="py-2.5 px-4 font-mono text-slate-400">{idx + 1}</td>
                        <td className="py-2.5 px-4">
                          <div className="font-bold text-slate-900">{item.brandName}</div>
                          <div className="text-[11px] text-slate-400">{item.strength} • {item.genericName}</div>
                        </td>
                        <td className="py-2.5 px-4">{item.unit}</td>
                        <td className="py-2.5 px-4 text-center font-bold text-slate-900">{item.quantity}</td>
                        <td className="py-2.5 px-4 text-right font-mono text-slate-500">৳ {item.unitPrice}</td>
                        <td className="py-2.5 px-4 text-right font-mono font-semibold text-emerald-700">
                          ৳ {item.tradePrice} <span className="text-[10px] text-slate-400">(-{item.discountPercent}%)</span>
                        </td>
                        <td className="py-2.5 px-4 text-right font-mono font-bold text-slate-900">
                          ৳ {item.total.toLocaleString('en-US', { minimumFractionDigits: 2 })}
                        </td>
                        <td className="py-2.5 px-4 text-center">
                          <button
                            onClick={() => handleRemoveItem(idx)}
                            className="p-1 rounded-lg text-slate-400 hover:text-rose-600 hover:bg-rose-50"
                          >
                            <Trash2 className="w-4 h-4" />
                          </button>
                        </td>
                      </tr>
                    ))
                  )}
                </tbody>
              </table>
            </div>
          </div>
        </div>

        {/* Right 1 Col: Billing Summary & Confirmation */}
        <div className="space-y-5">
          <div className="bg-white rounded-2xl border border-slate-200 shadow-sm p-5 space-y-4">
            <h3 className="text-sm font-bold uppercase tracking-wider text-slate-900 border-b border-slate-100 pb-3">
              Order Payment &amp; Billing
            </h3>

            <div className="space-y-2.5 text-xs">
              <div className="flex items-center justify-between text-slate-600">
                <span>Subtotal (MRP Gross):</span>
                <span className="font-mono font-semibold">
                  ৳ {subtotalMrp.toLocaleString('en-US', { minimumFractionDigits: 2 })}
                </span>
              </div>
              <div className="flex items-center justify-between text-emerald-700">
                <span>Total Trade Discount:</span>
                <span className="font-mono font-semibold">
                  - ৳ {totalDiscount.toLocaleString('en-US', { minimumFractionDigits: 2 })}
                </span>
              </div>
              <div className="pt-2 border-t border-slate-100 flex items-center justify-between text-base font-black text-slate-900">
                <span>Total Payable:</span>
                <span className="font-mono text-sky-700">
                  ৳ {totalPayable.toLocaleString('en-US', { minimumFractionDigits: 2 })}
                </span>
              </div>
            </div>

            {/* Payment Collection Inputs */}
            <div className="pt-3 border-t border-slate-100 space-y-3 text-xs">
              <div className="space-y-1">
                <label className="font-bold text-slate-700">Immediate Payment (BDT)</label>
                <input
                  type="number"
                  step="any"
                  value={paidAmount}
                  onChange={(e) => setPaidAmount(e.target.value)}
                  placeholder="0"
                  className="w-full px-3 py-2 text-sm rounded-xl border border-slate-200 font-mono font-bold focus:ring-2 focus:ring-emerald-500"
                />
              </div>

              <div className="grid grid-cols-2 gap-2">
                <div className="space-y-1">
                  <label className="font-bold text-slate-700">Payment Method</label>
                  <select
                    value={paymentMethod}
                    onChange={(e) => setPaymentMethod(e.target.value as any)}
                    className="w-full px-2.5 py-2 rounded-xl border border-slate-200 font-semibold"
                  >
                    <option value="CASH">Cash</option>
                    <option value="BKASH">bKash</option>
                    <option value="BANK">Bank Transfer</option>
                    <option value="CREDIT">Full Due (Credit)</option>
                  </select>
                </div>
                <div className="space-y-1">
                  <label className="font-bold text-slate-700">Remaining Due</label>
                  <div className="px-3 py-2 rounded-xl bg-amber-50 border border-amber-200 font-mono font-bold text-amber-900">
                    ৳ {remainingDue.toLocaleString('en-US', { minimumFractionDigits: 2 })}
                  </div>
                </div>
              </div>

              <div className="space-y-1">
                <label className="font-bold text-slate-700">Order Notes / Delivery Instructions</label>
                <textarea
                  rows={2}
                  value={notes}
                  onChange={(e) => setNotes(e.target.value)}
                  placeholder="e.g. Deliver via route van in morning shift"
                  className="w-full px-3 py-2 rounded-xl border border-slate-200"
                />
              </div>
            </div>

            <button
              type="button"
              disabled={isSubmitting || items.length === 0}
              onClick={handleSubmitOrder}
              className="w-full py-3 px-4 rounded-xl bg-sky-600 hover:bg-sky-500 text-white font-bold text-sm shadow-md transition-all disabled:opacity-50 flex items-center justify-center gap-2 cursor-pointer"
            >
              <CheckCircle2 className="w-5 h-5" />
              <span>{isSubmitting ? 'Generating Invoice...' : 'Confirm & Generate Invoice'}</span>
            </button>
          </div>
        </div>
      </div>
    </div>
  )
}
