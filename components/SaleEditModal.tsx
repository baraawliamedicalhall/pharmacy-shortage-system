'use client'

import React, { useState, useEffect } from 'react'
import { X, Save, Plus, Minus, Trash2, AlertCircle, Banknote, Smartphone, Landmark } from 'lucide-react'
import { ReceiptSaleData } from './ThermalReceiptModal'

interface EditableItem {
  id?: string
  medicineId: string
  brandName: string
  strength: string
  dosageForm: string
  quantity: number
  unit: string
  unitPrice: number
  discountAmount: number
  total: number
}

interface SaleEditModalProps {
  sale: ReceiptSaleData
  onClose: () => void
  onSaved: (updatedSale: ReceiptSaleData) => void
}

export function SaleEditModal({ sale, onClose, onSaved }: SaleEditModalProps) {
  const [customerName, setCustomerName] = useState(sale.customerName || 'Walk-in Customer')
  const [customerPhone, setCustomerPhone] = useState(sale.customerPhone || '')
  const [paymentMethod, setPaymentMethod] = useState(sale.paymentMethod || 'CASH')
  const [discountMode, setDiscountMode] = useState<'PERCENT' | 'FLAT'>('FLAT')
  const [discountValue, setDiscountValue] = useState(String(sale.discountAmount || 0))
  const [paidAmount, setPaidAmount] = useState(String(sale.paidAmount || 0))
  const [items, setItems] = useState<EditableItem[]>([])
  const [isSaving, setIsSaving] = useState(false)
  const [error, setError] = useState('')

  // Initialize items from sale
  useEffect(() => {
    setItems(
      sale.items.map((item) => ({
        id: item.id,
        medicineId: (item as any).medicineId || '',
        brandName: item.medicine.brandName,
        strength: item.medicine.strength,
        dosageForm: item.medicine.dosageForm,
        quantity: item.quantity,
        unit: item.unit,
        unitPrice: item.unitPrice,
        discountAmount: 0,
        total: item.total,
      }))
    )
  }, [sale])

  // We need the medicineId which isn't in the ReceiptSaleData type by default
  // Fetch the full sale data to get medicineIds
  useEffect(() => {
    async function fetchFull() {
      try {
        const res = await fetch(`/api/pos/sales/${sale.id}`)
        const data = await res.json()
        if (res.ok && data.sale) {
          setItems(
            data.sale.items.map((item: any) => ({
              id: item.id,
              medicineId: item.medicineId,
              brandName: item.medicine.brandName,
              strength: item.medicine.strength,
              dosageForm: item.medicine.dosageForm,
              quantity: item.quantity,
              unit: item.unit,
              unitPrice: item.unitPrice,
              discountAmount: item.discountAmount || 0,
              total: item.total,
            }))
          )
        }
      } catch {
        // fallback to what we have
      }
    }
    fetchFull()
  }, [sale.id])

  // Calculations
  const subtotal = items.reduce((sum, item) => sum + item.unitPrice * item.quantity, 0)
  const parsedVal = parseFloat(discountValue) || 0
  const parsedDiscount = discountMode === 'PERCENT'
    ? Math.round(subtotal * (Math.min(100, Math.max(0, parsedVal)) / 100) * 100) / 100
    : Math.min(subtotal, Math.max(0, parsedVal))
  const totalAmount = Math.max(0, Math.round((subtotal - parsedDiscount) * 100) / 100)
  const parsedPaid = parseFloat(paidAmount) || totalAmount
  const changeAmount = Math.max(0, Math.round((parsedPaid - totalAmount) * 100) / 100)

  const updateItemQty = (idx: number, delta: number) => {
    const updated = [...items]
    const newQty = Math.max(1, updated[idx].quantity + delta)
    updated[idx].quantity = newQty
    updated[idx].total = Math.round(updated[idx].unitPrice * newQty * 100) / 100
    setItems(updated)
  }

  const setItemQty = (idx: number, val: string) => {
    const parsed = parseFloat(val) || 1
    const updated = [...items]
    updated[idx].quantity = Math.max(1, parsed)
    updated[idx].total = Math.round(updated[idx].unitPrice * Math.max(1, parsed) * 100) / 100
    setItems(updated)
  }

  const setItemPrice = (idx: number, val: string) => {
    const parsed = parseFloat(val) || 0
    const updated = [...items]
    updated[idx].unitPrice = parsed
    updated[idx].total = Math.round(parsed * updated[idx].quantity * 100) / 100
    setItems(updated)
  }

  const removeItem = (idx: number) => {
    if (items.length <= 1) {
      setError('Sale must have at least one item')
      return
    }
    setItems(items.filter((_, i) => i !== idx))
  }

  const handleSave = async () => {
    if (items.length === 0) {
      setError('Sale must have at least one item')
      return
    }

    setIsSaving(true)
    setError('')

    try {
      const res = await fetch(`/api/pos/sales/${sale.id}`, {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          customerName,
          customerPhone,
          items: items.map((item) => ({
            medicineId: item.medicineId,
            quantity: item.quantity,
            unit: item.unit,
            unitPrice: item.unitPrice,
            discountAmount: item.discountAmount,
          })),
          discountAmount: parsedDiscount,
          paidAmount: parsedPaid,
          paymentMethod,
        }),
      })

      const data = await res.json()
      if (res.ok && data.sale) {
        onSaved(data.sale)
      } else {
        setError(data.error || 'Failed to update sale')
      }
    } catch {
      setError('Network error while saving')
    } finally {
      setIsSaving(false)
    }
  }

  // Escape to close
  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      if (e.key === 'Escape') onClose()
    }
    window.addEventListener('keydown', handleKeyDown)
    return () => window.removeEventListener('keydown', handleKeyDown)
  }, [onClose])

  const paymentOptions = [
    { value: 'CASH', label: 'Cash', icon: Banknote },
    { value: 'BKASH', label: 'bKash', icon: Smartphone },
    { value: 'BANK', label: 'Card/Bank', icon: Landmark },
  ]

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-slate-950/70 p-4 backdrop-blur-xs">
      <div className="bg-white rounded-2xl max-w-2xl w-full shadow-2xl overflow-hidden border border-slate-200 flex flex-col max-h-[92vh]">
        {/* Header */}
        <div className="px-5 py-3 bg-slate-900 text-white flex items-center justify-between shrink-0">
          <div>
            <h2 className="font-bold text-sm flex items-center gap-2">
              Edit Sale
              <span className="text-[10px] px-2 py-0.5 rounded bg-amber-500/20 text-amber-300 font-mono border border-amber-500/30">
                {sale.invoiceNumber}
              </span>
            </h2>
            <p className="text-[10px] text-slate-400 mt-0.5">
              Admin only &bull; Changes are permanent
            </p>
          </div>
          <button
            onClick={onClose}
            className="p-1.5 rounded-lg text-slate-400 hover:text-white hover:bg-slate-800 transition-colors cursor-pointer"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        {/* Body — scrollable */}
        <div className="flex-1 overflow-y-auto p-5 space-y-4">
          {/* Error alert */}
          {error && (
            <div className="flex items-center gap-2 px-3 py-2 bg-rose-50 border border-rose-200 rounded-xl text-xs text-rose-700 font-medium">
              <AlertCircle className="w-4 h-4 shrink-0" />
              <span>{error}</span>
            </div>
          )}

          {/* Customer Info */}
          <div className="grid grid-cols-2 gap-3">
            <div>
              <label className="text-[10px] font-bold text-slate-500 uppercase tracking-wider mb-1 block">Customer Name</label>
              <input
                type="text"
                value={customerName}
                onChange={(e) => setCustomerName(e.target.value)}
                className="w-full px-3 py-2 text-sm rounded-lg border border-slate-300 text-slate-900 focus:border-sky-500 focus:outline-hidden"
              />
            </div>
            <div>
              <label className="text-[10px] font-bold text-slate-500 uppercase tracking-wider mb-1 block">Phone</label>
              <input
                type="text"
                value={customerPhone}
                onChange={(e) => setCustomerPhone(e.target.value)}
                placeholder="Optional"
                className="w-full px-3 py-2 text-sm rounded-lg border border-slate-300 text-slate-900 focus:border-sky-500 focus:outline-hidden font-mono"
              />
            </div>
          </div>

          {/* Items Table */}
          <div>
            <label className="text-[10px] font-bold text-slate-500 uppercase tracking-wider mb-2 block">Line Items</label>
            <div className="border border-slate-200 rounded-xl overflow-hidden">
              <table className="w-full text-xs">
                <thead className="bg-slate-50 text-slate-500 uppercase tracking-wider text-[10px] font-bold">
                  <tr>
                    <th className="py-2 px-3 text-left">Medicine</th>
                    <th className="py-2 px-2 text-center">Unit</th>
                    <th className="py-2 px-2 text-right">Price</th>
                    <th className="py-2 px-2 text-center">Qty</th>
                    <th className="py-2 px-3 text-right">Total</th>
                    <th className="py-2 px-2 w-8"></th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-slate-100">
                  {items.map((item, idx) => (
                    <tr key={item.id || idx} className="hover:bg-slate-50/50">
                      <td className="py-2 px-3">
                        <div className="font-semibold text-slate-900">{item.brandName}</div>
                        <div className="text-[10px] text-slate-400">{item.strength} &bull; {item.dosageForm}</div>
                      </td>
                      <td className="py-2 px-2 text-center">
                        <select
                          value={item.unit}
                          onChange={(e) => {
                            const updated = [...items]
                            updated[idx].unit = e.target.value
                            setItems(updated)
                          }}
                          className="px-1.5 py-1 rounded border border-slate-200 text-[11px] font-medium text-slate-700 cursor-pointer focus:outline-hidden focus:border-sky-400"
                        >
                          <option value="Tablet">Piece</option>
                          <option value="Strip">Strip</option>
                          <option value="Box">Box</option>
                          <option value="Bottle">Bottle</option>
                        </select>
                      </td>
                      <td className="py-2 px-2 text-right">
                        <input
                          type="number"
                          step="any"
                          min={0}
                          value={item.unitPrice}
                          onChange={(e) => setItemPrice(idx, e.target.value)}
                          className="w-20 px-2 py-1 text-right font-mono font-bold text-[11px] rounded border border-slate-200 text-slate-900 focus:outline-hidden focus:border-sky-400"
                        />
                      </td>
                      <td className="py-2 px-2 text-center">
                        <div className="inline-flex items-center rounded border border-slate-200">
                          <button
                            type="button"
                            onClick={() => updateItemQty(idx, -1)}
                            className="p-1 text-slate-400 hover:text-slate-700 cursor-pointer"
                          >
                            <Minus className="w-3 h-3" />
                          </button>
                          <input
                            type="number"
                            min={1}
                            value={item.quantity}
                            onChange={(e) => setItemQty(idx, e.target.value)}
                            className="w-10 text-center font-mono font-bold text-[11px] bg-transparent text-slate-900 focus:outline-hidden"
                          />
                          <button
                            type="button"
                            onClick={() => updateItemQty(idx, 1)}
                            className="p-1 text-slate-400 hover:text-slate-700 cursor-pointer"
                          >
                            <Plus className="w-3 h-3" />
                          </button>
                        </div>
                      </td>
                      <td className="py-2 px-3 text-right font-mono font-bold text-emerald-700">
                        &#x09F3;{(item.unitPrice * item.quantity).toFixed(2)}
                      </td>
                      <td className="py-2 px-2">
                        <button
                          type="button"
                          onClick={() => removeItem(idx)}
                          className="p-1 text-slate-300 hover:text-rose-500 rounded cursor-pointer transition-colors"
                          title="Remove item"
                        >
                          <Trash2 className="w-3.5 h-3.5" />
                        </button>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </div>

          {/* Payment & Totals */}
          <div className="grid grid-cols-2 gap-4">
            {/* Left: Payment details */}
            <div className="space-y-3">
              <div>
                <label className="text-[10px] font-bold text-slate-500 uppercase tracking-wider mb-1.5 block">Payment Method</label>
                <div className="grid grid-cols-3 gap-1.5">
                  {paymentOptions.map(({ value, label, icon: Icon }) => (
                    <button
                      key={value}
                      type="button"
                      onClick={() => setPaymentMethod(value)}
                      className={`py-2 px-1 rounded-lg text-[11px] font-bold transition-all cursor-pointer flex flex-col items-center gap-0.5 ${
                        paymentMethod === value
                          ? 'bg-sky-600 text-white shadow-md'
                          : 'bg-slate-100 text-slate-500 hover:bg-slate-200'
                      }`}
                    >
                      <Icon className="w-3.5 h-3.5" />
                      {label}
                    </button>
                  ))}
                </div>
              </div>
              <div className="space-y-1.5">
                <div className="flex items-center justify-between">
                  <label className="text-[10px] font-bold text-slate-500 uppercase tracking-wider block">Discount</label>
                  <div className="inline-flex rounded-lg bg-slate-100 p-0.5 border border-slate-200">
                    <button
                      type="button"
                      onClick={() => {
                        if (discountMode !== 'PERCENT') {
                          setDiscountMode('PERCENT')
                          if (subtotal > 0 && parsedVal > 0) {
                            setDiscountValue(String(Math.min(100, Math.round((parsedVal / subtotal) * 100 * 10) / 10)))
                          }
                        }
                      }}
                      className={`px-1.5 py-0.5 text-[10px] font-bold rounded cursor-pointer transition-all ${
                        discountMode === 'PERCENT'
                          ? 'bg-emerald-600 text-white shadow-xs'
                          : 'text-slate-500 hover:text-slate-700'
                      }`}
                      title="Percentage Discount"
                    >
                      %
                    </button>
                    <button
                      type="button"
                      onClick={() => {
                        if (discountMode !== 'FLAT') {
                          setDiscountMode('FLAT')
                          if (subtotal > 0 && parsedVal > 0) {
                            setDiscountValue(String(parsedDiscount))
                          }
                        }
                      }}
                      className={`px-1.5 py-0.5 text-[10px] font-bold rounded cursor-pointer transition-all ${
                        discountMode === 'FLAT'
                          ? 'bg-emerald-600 text-white shadow-xs'
                          : 'text-slate-500 hover:text-slate-700'
                      }`}
                      title="Flat Taka Discount"
                    >
                      &#x09F3;
                    </button>
                  </div>
                </div>

                <div className="flex items-center gap-1.5">
                  <div className="relative flex-1">
                    {discountMode === 'FLAT' && (
                      <span className="absolute left-2.5 top-2 text-slate-400 font-mono text-xs">&#x09F3;</span>
                    )}
                    <input
                      type="number"
                      step="any"
                      min={0}
                      max={discountMode === 'PERCENT' ? 100 : subtotal}
                      value={discountValue}
                      onChange={(e) => setDiscountValue(e.target.value)}
                      placeholder="0"
                      className={`w-full py-1.5 text-sm rounded-lg border border-slate-300 text-slate-900 focus:border-sky-500 focus:outline-hidden font-mono ${
                        discountMode === 'FLAT' ? 'pl-6 pr-2' : 'px-2.5'
                      }`}
                    />
                    {discountMode === 'PERCENT' && (
                      <span className="absolute right-2.5 top-2 text-slate-400 font-mono text-xs">%</span>
                    )}
                  </div>

                  {parsedDiscount > 0 && (
                    <span className="text-[11px] font-mono font-semibold text-emerald-700 bg-emerald-50 px-2 py-1.5 rounded-lg border border-emerald-200 shrink-0">
                      -&#x09F3;{parsedDiscount.toFixed(2)}
                    </span>
                  )}
                </div>

                {/* Quick Presets */}
                <div className="flex items-center gap-1 flex-wrap pt-0.5">
                  {[0, 5, 7, 8, 10, 12, 15].map((pct) => {
                    const isSelected = discountMode === 'PERCENT' && parseFloat(discountValue) === pct
                    return (
                      <button
                        key={pct}
                        type="button"
                        onClick={() => {
                          setDiscountMode('PERCENT')
                          setDiscountValue(String(pct))
                        }}
                        className={`px-1.5 py-0.5 rounded text-[10px] font-mono font-bold cursor-pointer transition-all border ${
                          isSelected
                            ? 'bg-emerald-100 border-emerald-500 text-emerald-800 shadow-xs'
                            : 'bg-slate-50 border-slate-200 text-slate-600 hover:bg-slate-100'
                        }`}
                      >
                        {pct === 0 ? '0%' : `${pct}%`}
                      </button>
                    )
                  })}
                </div>
              </div>
              <div>
                <label className="text-[10px] font-bold text-slate-500 uppercase tracking-wider mb-1 block">Paid Amount (&#x09F3;)</label>
                <input
                  type="number"
                  step="any"
                  min={0}
                  value={paidAmount}
                  onChange={(e) => setPaidAmount(e.target.value)}
                  className="w-full px-3 py-2 text-sm rounded-lg border border-slate-300 text-slate-900 focus:border-sky-500 focus:outline-hidden font-mono"
                />
              </div>
            </div>

            {/* Right: Summary */}
            <div className="bg-slate-50 rounded-xl p-4 border border-slate-200 space-y-2 text-xs self-start">
              <div className="flex justify-between text-slate-500">
                <span>Subtotal</span>
                <span className="font-mono font-semibold text-slate-700">&#x09F3;{subtotal.toFixed(2)}</span>
              </div>
              {parsedDiscount > 0 && (
                <div className="flex justify-between text-emerald-600">
                  <span>Discount</span>
                  <span className="font-mono font-semibold">-&#x09F3;{parsedDiscount.toFixed(2)}</span>
                </div>
              )}
              <div className="flex justify-between font-bold text-slate-900 text-sm pt-1 border-t border-slate-200">
                <span>Total</span>
                <span className="font-mono">&#x09F3;{totalAmount.toFixed(2)}</span>
              </div>
              <div className="flex justify-between text-slate-500">
                <span>Paid</span>
                <span className="font-mono font-semibold text-slate-700">&#x09F3;{parsedPaid.toFixed(2)}</span>
              </div>
              <div className="flex justify-between font-bold text-emerald-700">
                <span>Change</span>
                <span className="font-mono">&#x09F3;{changeAmount.toFixed(2)}</span>
              </div>
            </div>
          </div>
        </div>

        {/* Footer Actions */}
        <div className="px-5 py-3 bg-slate-50 border-t border-slate-200 flex items-center justify-between shrink-0">
          <button
            onClick={onClose}
            className="px-4 py-2 rounded-lg text-xs font-semibold text-slate-600 hover:bg-slate-200 transition-colors cursor-pointer"
          >
            Cancel
          </button>
          <button
            onClick={handleSave}
            disabled={isSaving || items.length === 0}
            className="px-5 py-2 rounded-lg bg-sky-600 hover:bg-sky-500 text-white text-xs font-bold shadow-sm transition-all disabled:opacity-40 flex items-center gap-1.5 cursor-pointer"
          >
            <Save className="w-3.5 h-3.5" />
            <span>{isSaving ? 'Saving...' : 'Save Changes'}</span>
          </button>
        </div>
      </div>
    </div>
  )
}
