'use client'

import React, { useState, useEffect, useRef } from 'react'
import { X, Check, Plus, AlertCircle } from 'lucide-react'

export interface SelectedMedicine {
  id: string
  brandName: string
  strength: string
  dosageForm: string
  genericName: string
  purchaseUnit?: string | null
  retailUnit?: string | null
  manufacturer?: {
    name: string
    shortName?: string | null
  }
}

interface ShortageAddModalProps {
  medicine: SelectedMedicine | null
  isOpen: boolean
  onClose: () => void
  onSuccess: (medicineName: string) => void
}

export function ShortageAddModal({
  medicine,
  isOpen,
  onClose,
  onSuccess,
}: ShortageAddModalProps) {
  const [quantity, setQuantity] = useState<string>('')
  const [unit, setUnit] = useState<string>('Box')
  const [notes, setNotes] = useState<string>('')
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState<string | null>(null)
  const qtyInputRef = useRef<HTMLInputElement>(null)

  useEffect(() => {
    if (isOpen && medicine) {
      setQuantity('')
      setNotes('')
      setError(null)
      setUnit(medicine.purchaseUnit || 'Box')
      // Auto focus quantity input after opening
      setTimeout(() => {
        qtyInputRef.current?.focus()
      }, 150)
    }
  }, [isOpen, medicine])

  if (!isOpen || !medicine) return null

  const handleAddQuantity = (increment: number) => {
    const current = parseInt(quantity || '0', 10)
    const nextVal = Math.max(1, current + increment)
    setQuantity(nextVal.toString())
  }

  const handleSubmit = async (e?: React.FormEvent, skipQuantity = false) => {
    if (e) e.preventDefault()
    setLoading(true)
    setError(null)

    try {
      const res = await fetch('/api/shortages', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          medicineId: medicine.id,
          quantity: skipQuantity ? null : (quantity ? parseFloat(quantity) : null),
          unit: unit || 'Box',
          notes: notes.trim() || null,
        }),
      })

      const data = await res.json()

      if (!res.ok) {
        throw new Error(data.error || 'Failed to submit shortage report')
      }

      onSuccess(`${medicine.brandName} ${medicine.strength}`)
      onClose()
    } catch (err: unknown) {
      const message = err instanceof Error ? err.message : 'Error submitting shortage'
      setError(message)
    } finally {
      setLoading(false)
    }
  }

  return (
    <div className="fixed inset-0 z-50 flex items-end sm:items-center justify-center p-0 sm:p-4 bg-black/60 backdrop-blur-xs animate-in fade-in">
      <div className="bg-white w-full max-w-lg rounded-t-3xl sm:rounded-2xl shadow-2xl border border-slate-200 overflow-hidden max-h-[92vh] flex flex-col animate-in slide-in-from-bottom-6">
        {/* Header */}
        <div className="px-5 py-4 bg-slate-900 text-white flex items-start justify-between">
          <div>
            <div className="flex items-center gap-2">
              <span className="text-xs px-2 py-0.5 rounded bg-sky-800 text-sky-200 font-semibold uppercase">
                {medicine.dosageForm}
              </span>
              <span className="text-xs text-slate-300">
                {medicine.manufacturer?.shortName || medicine.manufacturer?.name}
              </span>
            </div>
            <h3 className="text-xl font-bold mt-1 text-white">
              {medicine.brandName} <span className="text-sky-400">{medicine.strength}</span>
            </h3>
            <p className="text-xs text-slate-400 mt-0.5">{medicine.genericName}</p>
          </div>
          <button
            onClick={onClose}
            className="text-slate-400 hover:text-white p-1 rounded-lg hover:bg-slate-800 transition-colors"
            aria-label="Close"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        {/* Content & Form */}
        <form onSubmit={(e) => handleSubmit(e, false)} className="p-5 flex-1 overflow-y-auto space-y-4">
          {error && (
            <div className="p-3 bg-rose-50 border border-rose-200 text-rose-700 text-xs rounded-xl flex items-center gap-2">
              <AlertCircle className="w-4 h-4 shrink-0" />
              <span>{error}</span>
            </div>
          )}

          {/* Short Quantity (Optional) */}
          <div>
            <div className="flex items-center justify-between mb-1.5">
              <label className="text-xs font-bold text-slate-700 uppercase tracking-wide">
                Short Quantity <span className="text-slate-400 font-normal">(Optional)</span>
              </label>
              <span className="text-[11px] text-slate-500">Leave blank if not needed</span>
            </div>

            <div className="grid grid-cols-3 gap-2">
              <div className="col-span-2">
                <input
                  ref={qtyInputRef}
                  type="number"
                  inputMode="numeric"
                  placeholder="e.g. 10"
                  value={quantity}
                  onChange={(e) => setQuantity(e.target.value)}
                  className="w-full h-12 text-center text-lg font-semibold bg-slate-50 border-2 border-slate-300 focus:border-sky-600 focus:bg-white rounded-xl focus:outline-hidden transition-all"
                />
              </div>
              <div>
                <select
                  value={unit}
                  onChange={(e) => setUnit(e.target.value)}
                  className="w-full h-12 text-sm font-semibold bg-slate-50 border-2 border-slate-300 focus:border-sky-600 focus:bg-white rounded-xl px-2 focus:outline-hidden"
                >
                  <option value="Box">Box</option>
                  <option value="Strip">Strip</option>
                  <option value="Tablet">Tablet</option>
                  <option value="Capsule">Capsule</option>
                  <option value="Bottle">Bottle</option>
                  <option value="Pcs">Pcs</option>
                </select>
              </div>
            </div>

            {/* Quick Increment Buttons to minimize typing */}
            <div className="flex items-center gap-2 mt-2">
              {[5, 10, 20, 50].map((inc) => (
                <button
                  type="button"
                  key={inc}
                  onClick={() => handleAddQuantity(inc)}
                  className="flex-1 py-1.5 text-xs font-semibold bg-slate-100 hover:bg-slate-200 active:bg-sky-100 active:text-sky-700 text-slate-700 rounded-lg transition-colors border border-slate-200"
                >
                  +{inc}
                </button>
              ))}
              {quantity && (
                <button
                  type="button"
                  onClick={() => setQuantity('')}
                  className="px-2.5 py-1.5 text-xs text-rose-600 hover:bg-rose-50 rounded-lg transition-colors"
                >
                  Clear
                </button>
              )}
            </div>
          </div>

          {/* Quick Notes (Optional) */}
          <div>
            <label className="text-xs font-bold text-slate-700 uppercase tracking-wide mb-1 block">
              Notes <span className="text-slate-400 font-normal">(Optional)</span>
            </label>
            <input
              type="text"
              placeholder="e.g. Rack A empty, urgent customer order"
              value={notes}
              onChange={(e) => setNotes(e.target.value)}
              maxLength={200}
              className="w-full h-10 px-3 text-xs bg-slate-50 border border-slate-300 focus:border-sky-600 focus:bg-white rounded-xl focus:outline-hidden"
            />
          </div>

          {/* Action Buttons */}
          <div className="pt-2 space-y-2">
            <button
              type="submit"
              disabled={loading}
              className="w-full h-13 bg-sky-600 hover:bg-sky-700 active:bg-sky-800 text-white font-bold rounded-xl text-base shadow-md flex items-center justify-center gap-2 transition-all disabled:opacity-50"
            >
              {loading ? (
                <div className="w-5 h-5 border-2 border-white border-t-transparent rounded-full animate-spin" />
              ) : (
                <>
                  <Plus className="w-5 h-5" />
                  <span>ADD SHORTAGE</span>
                </>
              )}
            </button>

            {/* Instant 1-Tap Submit without quantity */}
            <button
              type="button"
              disabled={loading}
              onClick={() => handleSubmit(undefined, true)}
              className="w-full py-2.5 text-xs text-slate-600 hover:text-slate-900 active:bg-slate-100 font-medium rounded-lg transition-colors"
            >
              Instant 1-Tap Submit (No Quantity)
            </button>
          </div>
        </form>
      </div>
    </div>
  )
}
