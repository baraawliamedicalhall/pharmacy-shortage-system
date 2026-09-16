'use client'

import React, { useState, useEffect } from 'react'
import { Plus, Edit2, Trash2, Building2, RefreshCw, X, Pill } from 'lucide-react'
import { ToastContainer, ToastMessage } from '@/components/Toast'

interface ManufacturerItem {
  id: string
  name: string
  shortName: string | null
  isActive: boolean
  createdAt: string
  _count?: {
    medicines: number
  }
}

export default function AdminManufacturersPage() {
  const [manufacturers, setManufacturers] = useState<ManufacturerItem[]>([])
  const [loading, setLoading] = useState(true)
  const [toasts, setToasts] = useState<ToastMessage[]>([])

  // Modal
  const [isModalOpen, setIsModalOpen] = useState(false)
  const [editingId, setEditingId] = useState<string | null>(null)
  const [name, setName] = useState('')
  const [shortName, setShortName] = useState('')
  const [isActive, setIsActive] = useState(true)
  const [saving, setSaving] = useState(false)

  const addToast = (type: 'success' | 'error' | 'info', text: string) => {
    setToasts((prev) => [...prev, { id: Date.now().toString(), type, text }])
  }

  const loadManufacturers = async () => {
    try {
      setLoading(true)
      const res = await fetch('/api/admin/manufacturers')
      if (res.ok) {
        const data = await res.json()
        setManufacturers(data.manufacturers || [])
      }
    } catch (err) {
      console.error('Error loading manufacturers:', err)
      addToast('error', 'Failed to load manufacturers')
    } finally {
      setLoading(false)
    }
  }

  useEffect(() => {
    loadManufacturers()
  }, [])

  const handleOpenCreate = () => {
    setEditingId(null)
    setName('')
    setShortName('')
    setIsActive(true)
    setIsModalOpen(true)
  }

  const handleOpenEdit = (item: ManufacturerItem) => {
    setEditingId(item.id)
    setName(item.name)
    setShortName(item.shortName || '')
    setIsActive(item.isActive)
    setIsModalOpen(true)
  }

  const handleSave = async (e: React.FormEvent) => {
    e.preventDefault()
    if (!name.trim()) return

    setSaving(true)
    try {
      const url = editingId ? `/api/admin/manufacturers/${editingId}` : '/api/admin/manufacturers'
      const method = editingId ? 'PUT' : 'POST'

      const res = await fetch(url, {
        method,
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          name: name.trim(),
          shortName: shortName.trim() || null,
          isActive,
        }),
      })

      const data = await res.json()
      if (!res.ok) throw new Error(data.error || 'Failed to save manufacturer')

      addToast('success', `Manufacturer ${name} saved successfully`)
      setIsModalOpen(false)
      loadManufacturers()
    } catch (err: unknown) {
      const msg = err instanceof Error ? err.message : 'Error saving manufacturer'
      addToast('error', msg)
    } finally {
      setSaving(false)
    }
  }

  const handleDelete = async (id: string, mfgName: string) => {
    if (!confirm(`Delete manufacturer "${mfgName}"? If it has medicines linked, it will be marked inactive.`))
      return

    try {
      const res = await fetch(`/api/admin/manufacturers/${id}`, { method: 'DELETE' })
      const data = await res.json()
      if (res.ok) {
        addToast('success', data.message || 'Manufacturer deleted')
        loadManufacturers()
      } else {
        addToast('error', data.error || 'Failed to delete manufacturer')
      }
    } catch (err) {
      addToast('error', 'Network error deleting manufacturer')
    }
  }

  return (
    <div className="space-y-6">
      <ToastContainer toasts={toasts} onDismiss={(id) => setToasts((prev) => prev.filter((t) => t.id !== id))} />

      {/* Header */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div>
          <h1 className="text-2xl font-black text-slate-900 tracking-tight">Manufacturers</h1>
          <p className="text-xs text-slate-500 mt-0.5">
            Pharmaceutical company master list for medicines and shortage ordering
          </p>
        </div>

        <button
          onClick={handleOpenCreate}
          className="px-3.5 py-2 bg-sky-600 hover:bg-sky-700 text-white font-bold rounded-xl text-xs shadow-xs flex items-center gap-1.5 transition-colors self-start cursor-pointer"
        >
          <Plus className="w-4 h-4" />
          <span>Add Manufacturer</span>
        </button>
      </div>

      {/* Manufacturers List Card */}
      <div className="bg-white rounded-2xl shadow-xs border border-slate-200 overflow-hidden">
        <div className="p-4 border-b border-slate-200 flex items-center justify-between">
          <span className="text-xs font-bold text-slate-700 uppercase tracking-wide">
            Registered Pharmaceutical Companies ({manufacturers.length})
          </span>
          <button onClick={loadManufacturers} className="text-slate-400 hover:text-sky-600 p-1" title="Reload">
            <RefreshCw className={`w-4 h-4 ${loading ? 'animate-spin' : ''}`} />
          </button>
        </div>

        {loading ? (
          <div className="p-8 text-center text-xs text-slate-400">Loading manufacturers...</div>
        ) : manufacturers.length === 0 ? (
          <div className="p-12 text-center text-slate-400">
            <Building2 className="w-10 h-10 mx-auto mb-2 text-slate-300" />
            <p className="text-sm font-semibold text-slate-700">No manufacturers registered</p>
          </div>
        ) : (
          <div className="divide-y divide-slate-100">
            {manufacturers.map((item) => (
              <div
                key={item.id}
                className="p-4 flex items-center justify-between gap-4 hover:bg-slate-50 transition-colors"
              >
                <div className="flex items-center gap-3">
                  <div className="w-10 h-10 rounded-xl bg-slate-100 text-slate-700 flex items-center justify-center font-black text-sm">
                    {item.shortName ? item.shortName.charAt(0) : item.name.charAt(0)}
                  </div>
                  <div>
                    <div className="font-bold text-sm text-slate-900 flex items-center gap-2">
                      <span>{item.name}</span>
                      {item.shortName && (
                        <span className="text-xs px-2 py-0.5 rounded bg-sky-100 text-sky-800 font-semibold">
                          {item.shortName}
                        </span>
                      )}
                    </div>
                    <div className="text-xs text-slate-500 mt-0.5 flex items-center gap-2">
                      <span className="flex items-center gap-1">
                        <Pill className="w-3 h-3 text-slate-400" />
                        {item._count?.medicines || 0} medicines cataloged
                      </span>
                      <span className="text-slate-300">•</span>
                      <span
                        className={`text-[10px] font-bold uppercase ${
                          item.isActive ? 'text-emerald-700' : 'text-slate-400'
                        }`}
                      >
                        {item.isActive ? 'Active' : 'Inactive'}
                      </span>
                    </div>
                  </div>
                </div>

                <div className="flex items-center gap-1">
                  <button
                    onClick={() => handleOpenEdit(item)}
                    className="p-1.5 text-slate-400 hover:text-sky-600 hover:bg-sky-50 rounded-lg transition-colors cursor-pointer"
                    title="Edit manufacturer"
                  >
                    <Edit2 className="w-4 h-4" />
                  </button>
                  <button
                    onClick={() => handleDelete(item.id, item.name)}
                    className="p-1.5 text-slate-400 hover:text-rose-600 hover:bg-rose-50 rounded-lg transition-colors cursor-pointer"
                    title="Delete / Deactivate"
                  >
                    <Trash2 className="w-4 h-4" />
                  </button>
                </div>
              </div>
            ))}
          </div>
        )}
      </div>

      {/* Add / Edit Manufacturer Modal */}
      {isModalOpen && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/60 backdrop-blur-xs">
          <div className="bg-white w-full max-w-md rounded-2xl shadow-2xl border border-slate-200 overflow-hidden">
            <div className="px-5 py-4 bg-slate-900 text-white flex items-center justify-between">
              <h3 className="text-base font-bold">
                {editingId ? 'Edit Manufacturer' : 'Add New Manufacturer'}
              </h3>
              <button onClick={() => setIsModalOpen(false)} className="text-slate-400 hover:text-white p-1">
                <X className="w-5 h-5" />
              </button>
            </div>

            <form onSubmit={handleSave} className="p-5 space-y-4 text-xs">
              <div>
                <label className="font-bold text-slate-700 block mb-1">
                  Full Company Name <span className="text-rose-600">*</span>
                </label>
                <input
                  type="text"
                  required
                  placeholder="e.g. Beximco Pharmaceuticals Ltd."
                  value={name}
                  onChange={(e) => setName(e.target.value)}
                  className="w-full h-10 px-3 bg-slate-50 border border-slate-300 rounded-xl font-medium"
                />
              </div>

              <div>
                <label className="font-bold text-slate-700 block mb-1">Short Name / Code</label>
                <input
                  type="text"
                  placeholder="e.g. Beximco or Square"
                  value={shortName}
                  onChange={(e) => setShortName(e.target.value)}
                  className="w-full h-10 px-3 bg-slate-50 border border-slate-300 rounded-xl font-medium"
                />
              </div>

              <div className="flex items-center gap-2 pt-1">
                <input
                  type="checkbox"
                  id="mfgActive"
                  checked={isActive}
                  onChange={(e) => setIsActive(e.target.checked)}
                  className="w-4 h-4 rounded text-sky-600"
                />
                <label htmlFor="mfgActive" className="font-bold text-slate-700 cursor-pointer">
                  Active
                </label>
              </div>

              <div className="pt-3 border-t border-slate-100 flex items-center justify-end gap-2">
                <button
                  type="button"
                  onClick={() => setIsModalOpen(false)}
                  className="px-4 py-2 bg-slate-100 hover:bg-slate-200 text-slate-700 font-bold rounded-xl"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  disabled={saving}
                  className="px-4 py-2 bg-sky-600 hover:bg-sky-700 text-white font-bold rounded-xl disabled:opacity-50"
                >
                  {saving ? 'Saving...' : editingId ? 'Update' : 'Add'}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  )
}
