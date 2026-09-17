'use client'

import React, { useState, useEffect } from 'react'
import {
  Search,
  Plus,
  UploadCloud,
  Edit2,
  Trash2,
  RefreshCw,
  X,
  FileText,
  AlertTriangle,
  CheckCircle2,
  Filter,
  Pill,
  ChevronLeft,
  ChevronRight,
  ChevronsLeft,
  ChevronsRight,
} from 'lucide-react'
import { ToastContainer, ToastMessage } from '@/components/Toast'

interface MedicineItem {
  id: string
  brandName: string
  genericName: string
  strength: string
  dosageForm: string
  manufacturerId: string
  packDescription: string | null
  purchaseUnit: string | null
  retailUnit: string | null
  searchKeywords: string | null
  barcode: string | null
  isActive: boolean
  mrp?: number | null
  stripPrice?: number | null
  boxPrice?: number | null
  tradePrice?: number | null
  tradeBoxPrice?: number | null
  manufacturer?: {
    id: string
    name: string
    shortName: string | null
  }
}

interface ManufacturerOption {
  id: string
  name: string
  shortName: string | null
}

export default function AdminMedicinesPage() {
  const [medicines, setMedicines] = useState<MedicineItem[]>([])
  const [manufacturers, setManufacturers] = useState<ManufacturerOption[]>([])
  const [loading, setLoading] = useState(true)
  const [search, setSearch] = useState('')
  const [debouncedSearch, setDebouncedSearch] = useState('')
  const [mfgFilter, setMfgFilter] = useState('')
  const [page, setPage] = useState(1)
  const [limit, setLimit] = useState(50)
  const [totalCount, setTotalCount] = useState(0)
  const [totalOverall, setTotalOverall] = useState(0)
  const [totalPages, setTotalPages] = useState(1)
  const [toasts, setToasts] = useState<ToastMessage[]>([])

  // Modal: Add / Edit Medicine
  const [isModalOpen, setIsModalOpen] = useState(false)
  const [editingId, setEditingId] = useState<string | null>(null)
  const [formBrand, setFormBrand] = useState('')
  const [formGeneric, setFormGeneric] = useState('')
  const [formStrength, setFormStrength] = useState('')
  const [formDosage, setFormDosage] = useState('Tablet')
  const [formMfgId, setFormMfgId] = useState('')
  const [formPack, setFormPack] = useState('')
  const [formPurchaseUnit, setFormPurchaseUnit] = useState('Box')
  const [formRetailUnit, setFormRetailUnit] = useState('Tablet')
  const [formKeywords, setFormKeywords] = useState('')
  const [formBarcode, setFormBarcode] = useState('')
  const [formActive, setFormActive] = useState(true)
  const [formMrp, setFormMrp] = useState('')
  const [formBoxPrice, setFormBoxPrice] = useState('')
  const [formTradePrice, setFormTradePrice] = useState('')
  const [savingMed, setSavingMed] = useState(false)

  // Modal: CSV Import
  const [isCsvModalOpen, setIsCsvModalOpen] = useState(false)
  const [csvFile, setCsvFile] = useState<File | null>(null)
  const [csvText, setCsvText] = useState('')
  const [validatingCsv, setValidatingCsv] = useState(false)
  const [importingCsv, setImportingCsv] = useState(false)
  const [validationResult, setValidationResult] = useState<any>(null)

  const addToast = (type: 'success' | 'error' | 'info', text: string) => {
    setToasts((prev) => [...prev, { id: Date.now().toString(), type, text }])
  }

  // Debounce search input by 250ms
  useEffect(() => {
    const timer = setTimeout(() => {
      setDebouncedSearch(search.trim())
    }, 250)
    return () => clearTimeout(timer)
  }, [search])

  // Reset to page 1 when search or filter changes
  useEffect(() => {
    setPage(1)
  }, [debouncedSearch, mfgFilter])

  const loadData = async () => {
    try {
      setLoading(true)
      const qParams = new URLSearchParams()
      if (debouncedSearch) qParams.set('q', debouncedSearch)
      if (mfgFilter) qParams.set('mfgId', mfgFilter)
      qParams.set('page', page.toString())
      qParams.set('limit', limit.toString())

      const [medRes, mfgRes] = await Promise.all([
        fetch(`/api/admin/medicines?${qParams.toString()}`),
        fetch('/api/admin/manufacturers'),
      ])

      if (medRes.ok) {
        const medData = await medRes.json()
        setMedicines(medData.medicines || [])
        if (medData.pagination) {
          setTotalCount(medData.pagination.total ?? 0)
          setTotalOverall(medData.pagination.totalOverall ?? medData.pagination.total ?? 0)
          setTotalPages(medData.pagination.totalPages ?? 1)
        }
      }

      if (mfgRes.ok) {
        const mfgData = await mfgRes.json()
        setManufacturers(mfgData.manufacturers || [])
      }
    } catch (err) {
      console.error('Error loading medicines:', err)
      addToast('error', 'Failed to load medicine list')
    } finally {
      setLoading(false)
    }
  }

  useEffect(() => {
    loadData()
  }, [page, limit, debouncedSearch, mfgFilter])

  // Open modal for Create
  const handleOpenCreate = () => {
    setEditingId(null)
    setFormBrand('')
    setFormGeneric('')
    setFormStrength('')
    setFormDosage('Tablet')
    setFormMfgId(manufacturers[0]?.id || '')
    setFormPack('')
    setFormPurchaseUnit('Box')
    setFormRetailUnit('Tablet')
    setFormKeywords('')
    setFormBarcode('')
    setFormActive(true)
    setFormMrp('')
    setFormBoxPrice('')
    setFormTradePrice('')
    setIsModalOpen(true)
  }

  // Open modal for Edit
  const handleOpenEdit = (item: MedicineItem) => {
    setEditingId(item.id)
    setFormBrand(item.brandName)
    setFormGeneric(item.genericName)
    setFormStrength(item.strength)
    setFormDosage(item.dosageForm)
    setFormMfgId(item.manufacturerId)
    setFormPack(item.packDescription || '')
    setFormPurchaseUnit(item.purchaseUnit || 'Box')
    setFormRetailUnit(item.retailUnit || 'Tablet')
    setFormKeywords(item.searchKeywords || '')
    setFormBarcode(item.barcode || '')
    setFormActive(item.isActive)
    setFormMrp(item.mrp !== null && item.mrp !== undefined ? String(item.mrp) : '')
    setFormBoxPrice(item.boxPrice !== null && item.boxPrice !== undefined ? String(item.boxPrice) : '')
    setFormTradePrice(item.tradePrice !== null && item.tradePrice !== undefined ? String(item.tradePrice) : '')
    setIsModalOpen(true)
  }

  // Save medicine (Create or Update)
  const handleSaveMedicine = async (e: React.FormEvent) => {
    e.preventDefault()
    if (!formBrand || !formGeneric || !formStrength || !formMfgId) {
      addToast('error', 'Please fill all required fields (Brand, Generic, Strength, Manufacturer)')
      return
    }

    setSavingMed(true)
    try {
      const payload = {
        brandName: formBrand.trim(),
        genericName: formGeneric.trim(),
        strength: formStrength.trim(),
        dosageForm: formDosage.trim(),
        manufacturerId: formMfgId,
        packDescription: formPack.trim() || null,
        purchaseUnit: formPurchaseUnit.trim() || 'Box',
        retailUnit: formRetailUnit.trim() || 'Tablet',
        searchKeywords: formKeywords.trim() || null,
        barcode: formBarcode.trim() || null,
        isActive: formActive,
        mrp: formMrp ? parseFloat(formMrp) : null,
        boxPrice: formBoxPrice ? parseFloat(formBoxPrice) : null,
        tradePrice: formTradePrice ? parseFloat(formTradePrice) : null,
        tradeBoxPrice: formBoxPrice ? Math.round(parseFloat(formBoxPrice) * 0.88 * 100) / 100 : null,
      }

      const url = editingId ? `/api/admin/medicines/${editingId}` : '/api/admin/medicines'
      const method = editingId ? 'PUT' : 'POST'

      const res = await fetch(url, {
        method,
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(payload),
      })

      const data = await res.json()

      if (!res.ok) {
        throw new Error(data.error || 'Failed to save medicine')
      }

      addToast('success', `${formBrand} ${formStrength} saved successfully`)
      setIsModalOpen(false)
      loadData()
    } catch (err: unknown) {
      const msg = err instanceof Error ? err.message : 'Error saving medicine'
      addToast('error', msg)
    } finally {
      setSavingMed(false)
    }
  }

  // Delete medicine
  const handleDeleteMedicine = async (id: string, name: string) => {
    if (!confirm(`Delete medicine "${name}"? If it has shortage history, it will be deactivated instead.`)) return

    try {
      const res = await fetch(`/api/admin/medicines/${id}`, { method: 'DELETE' })
      const data = await res.json()
      if (res.ok) {
        addToast('success', data.message || 'Medicine deleted')
        loadData()
      } else {
        addToast('error', data.error || 'Failed to delete medicine')
      }
    } catch (err) {
      addToast('error', 'Network error deleting medicine')
    }
  }

  // CSV Validation (Dry Run)
  const handleValidateCsv = async () => {
    if (!csvFile && !csvText.trim()) {
      addToast('error', 'Please select a CSV file or paste CSV text')
      return
    }

    setValidatingCsv(true)
    setValidationResult(null)

    try {
      let res: Response
      if (csvFile) {
        const formData = new FormData()
        formData.append('file', csvFile)
        formData.append('mode', 'validate')
        res = await fetch('/api/admin/csv-import', { method: 'POST', body: formData })
      } else {
        res = await fetch('/api/admin/csv-import', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ csv: csvText, mode: 'validate' }),
        })
      }

      const data = await res.json()
      if (!res.ok) {
        throw new Error(data.error || 'Validation failed')
      }

      setValidationResult(data)
      addToast('info', `Validated: ${data.validCount} valid rows, ${data.errorCount} errors`)
    } catch (err: unknown) {
      const msg = err instanceof Error ? err.message : 'CSV error'
      addToast('error', msg)
    } finally {
      setValidatingCsv(false)
    }
  }

  // CSV Commit Import
  const handleCommitCsv = async () => {
    if (!validationResult || validationResult.validCount === 0) return

    setImportingCsv(true)
    try {
      let res: Response
      if (csvFile) {
        const formData = new FormData()
        formData.append('file', csvFile)
        formData.append('mode', 'import')
        res = await fetch('/api/admin/csv-import', { method: 'POST', body: formData })
      } else {
        res = await fetch('/api/admin/csv-import', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ csv: csvText, mode: 'import' }),
        })
      }

      const data = await res.json()
      if (!res.ok) {
        throw new Error(data.error || 'Import failed')
      }

      addToast('success', `Imported ${data.importedCount} new, updated ${data.updatedCount} medicines!`)
      setIsCsvModalOpen(false)
      setCsvFile(null)
      setCsvText('')
      setValidationResult(null)
      loadData()
    } catch (err: unknown) {
      const msg = err instanceof Error ? err.message : 'Import failed'
      addToast('error', msg)
    } finally {
      setImportingCsv(false)
    }
  }

  return (
    <div className="space-y-6">
      <ToastContainer toasts={toasts} onDismiss={(id) => setToasts((prev) => prev.filter((t) => t.id !== id))} />

      {/* Header */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div>
          <h1 className="text-2xl font-black text-slate-900 tracking-tight">Medicine Master</h1>
          <p className="text-xs text-slate-500 mt-0.5">
            Manage pharmacy medicine catalog, units, keywords, and CSV bulk imports
          </p>
        </div>

        <div className="flex items-center gap-2">
          <button
            onClick={() => setIsCsvModalOpen(true)}
            className="px-3.5 py-2 bg-slate-800 hover:bg-slate-900 text-white font-bold rounded-xl text-xs shadow-xs flex items-center gap-1.5 transition-colors cursor-pointer"
          >
            <UploadCloud className="w-4 h-4" />
            <span>Import CSV</span>
          </button>
          <button
            onClick={handleOpenCreate}
            className="px-3.5 py-2 bg-sky-600 hover:bg-sky-700 text-white font-bold rounded-xl text-xs shadow-xs flex items-center gap-1.5 transition-colors cursor-pointer"
          >
            <Plus className="w-4 h-4" />
            <span>Add Medicine</span>
          </button>
        </div>
      </div>

      {/* Search & Filter Bar */}
      <div className="bg-white rounded-2xl p-4 shadow-xs border border-slate-200 grid grid-cols-1 sm:grid-cols-3 gap-3">
        <div className="sm:col-span-2 relative flex items-center">
          <Search className="w-4 h-4 text-slate-400 absolute left-3 pointer-events-none" />
          <input
            type="text"
            placeholder="Search brand, generic, strength, or keywords..."
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            className="w-full h-10 pl-9 pr-9 text-xs bg-slate-50 border border-slate-300 focus:border-sky-600 focus:bg-white rounded-xl focus:outline-hidden"
          />
          {search && (
            <button
              onClick={() => setSearch('')}
              className="absolute right-3 text-slate-400 hover:text-slate-600 p-1 transition-colors cursor-pointer"
              title="Clear search"
            >
              <X className="w-3.5 h-3.5" />
            </button>
          )}
        </div>

        <div>
          <select
            value={mfgFilter}
            onChange={(e) => setMfgFilter(e.target.value)}
            className="w-full h-10 px-3 text-xs font-semibold bg-slate-50 border border-slate-300 focus:border-sky-600 focus:bg-white rounded-xl focus:outline-hidden"
          >
            <option value="">All Manufacturers ({manufacturers.length})</option>
            {manufacturers.map((m) => (
              <option key={m.id} value={m.id}>
                {m.name}
              </option>
            ))}
          </select>
        </div>
      </div>

      {/* Medicines Table */}
      <div className="bg-white rounded-2xl shadow-xs border border-slate-200 overflow-hidden">
        <div className="p-4 border-b border-slate-200 flex flex-col sm:flex-row sm:items-center justify-between gap-3 bg-white">
          <div className="flex items-center gap-2.5 flex-wrap">
            <div className="flex items-center gap-1.5">
              <Pill className="w-4 h-4 text-sky-600" />
              <span className="text-xs font-black text-slate-800 uppercase tracking-wider">
                Registered Medicines
              </span>
            </div>

            <span className="px-2.5 py-0.5 rounded-full text-xs font-bold bg-sky-100 text-sky-800 border border-sky-200">
              {debouncedSearch || mfgFilter
                ? `${totalCount.toLocaleString()} Matching`
                : `${(totalOverall || totalCount).toLocaleString()} In Database`}
            </span>

            {(debouncedSearch || mfgFilter) && totalOverall > 0 && (
              <span className="text-[11px] text-slate-400 font-medium">
                (filtered from {totalOverall.toLocaleString()} total)
              </span>
            )}
          </div>

          <div className="flex items-center gap-3 self-end sm:self-auto">
            <span className="text-[11px] text-slate-400">
              Page {page} of {totalPages || 1}
            </span>
            <button onClick={loadData} className="text-slate-400 hover:text-sky-600 p-1 transition-colors cursor-pointer" title="Reload">
              <RefreshCw className={`w-4 h-4 ${loading ? 'animate-spin' : ''}`} />
            </button>
          </div>
        </div>

        {loading ? (
          <div className="p-8 text-center text-xs text-slate-400">Loading medicines...</div>
        ) : medicines.length === 0 ? (
          <div className="p-12 text-center text-slate-400">
            <Pill className="w-10 h-10 mx-auto mb-2 text-slate-300" />
            <p className="text-sm font-semibold text-slate-700">No medicines found</p>
            <p className="text-xs text-slate-400 mt-1">
              {debouncedSearch || mfgFilter ? 'Try clearing search or filters.' : 'Add a medicine or import a CSV file.'}
            </p>
          </div>
        ) : (
          <div className="overflow-x-auto">
            <table className="w-full text-left border-collapse text-xs">
              <thead>
                <tr className="bg-slate-50 text-slate-600 border-b border-slate-200 font-bold uppercase tracking-wider text-[11px]">
                  <th className="p-3.5">Brand & Strength</th>
                  <th className="p-3.5">Generic Name</th>
                  <th className="p-3.5">Dosage Form</th>
                  <th className="p-3.5">Manufacturer</th>
                  <th className="p-3.5 text-right">MRP (Retail)</th>
                  <th className="p-3.5 text-right">Trade Price (Wholesale)</th>
                  <th className="p-3.5">Units</th>
                  <th className="p-3.5">Status</th>
                  <th className="p-3.5 text-right">Actions</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-100 text-slate-800">
                {medicines.map((item) => (
                  <tr key={item.id} className="hover:bg-slate-50/80 transition-colors">
                    <td className="p-3.5">
                      <div className="font-bold text-slate-900 text-sm">
                        {item.brandName} <span className="text-sky-700">{item.strength}</span>
                      </div>
                      {item.packDescription && (
                        <div className="text-[10px] text-slate-400 mt-0.5">{item.packDescription}</div>
                      )}
                    </td>

                    <td className="p-3.5 font-medium text-slate-600">{item.genericName}</td>

                    <td className="p-3.5">
                      <span className="px-2 py-0.5 rounded bg-slate-100 text-slate-700 font-semibold uppercase text-[10px]">
                        {item.dosageForm}
                      </span>
                    </td>

                    <td className="p-3.5 font-medium text-slate-700">
                      {item.manufacturer?.shortName || item.manufacturer?.name}
                    </td>

                    <td className="p-3.5 text-right font-mono font-bold text-slate-800">
                      {item.boxPrice ? `৳${item.boxPrice}/box` : item.mrp ? `৳${item.mrp}/unit` : '—'}
                    </td>

                    <td className="p-3.5 text-right font-mono font-bold text-emerald-700">
                      {item.tradeBoxPrice ? `৳${item.tradeBoxPrice}/box` : item.tradePrice ? `৳${item.tradePrice}/unit` : '—'}
                    </td>

                    <td className="p-3.5 text-slate-500 text-[11px]">
                      {item.purchaseUnit || 'Box'} / {item.retailUnit || 'Tablet'}
                    </td>

                    <td className="p-3.5">
                      <span
                        className={`px-2 py-0.5 rounded-full font-bold text-[10px] uppercase ${
                          item.isActive ? 'bg-emerald-100 text-emerald-800' : 'bg-slate-100 text-slate-500'
                        }`}
                      >
                        {item.isActive ? 'Active' : 'Inactive'}
                      </span>
                    </td>

                    <td className="p-3.5 text-right space-x-1">
                      <button
                        onClick={() => handleOpenEdit(item)}
                        className="p-1.5 text-slate-400 hover:text-sky-600 hover:bg-sky-50 rounded-lg transition-colors cursor-pointer"
                        title="Edit medicine"
                      >
                        <Edit2 className="w-4 h-4" />
                      </button>
                      <button
                        onClick={() => handleDeleteMedicine(item.id, `${item.brandName} ${item.strength}`)}
                        className="p-1.5 text-slate-400 hover:text-rose-600 hover:bg-rose-50 rounded-lg transition-colors cursor-pointer"
                        title="Delete / Deactivate"
                      >
                        <Trash2 className="w-4 h-4" />
                      </button>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}

        {/* Pagination Controls */}
        <div className="p-4 border-t border-slate-200 bg-slate-50/70 flex flex-col sm:flex-row sm:items-center justify-between gap-4 text-xs">
          <div className="flex items-center gap-3 text-slate-600 font-medium flex-wrap">
            <span>
              Showing <strong className="text-slate-900 font-bold">{totalCount === 0 ? 0 : (page - 1) * limit + 1}</strong> to{' '}
              <strong className="text-slate-900 font-bold">{Math.min(page * limit, totalCount)}</strong> of{' '}
              <strong className="text-slate-900 font-bold">{totalCount.toLocaleString()}</strong> medicines
            </span>

            <div className="flex items-center gap-1.5 border-l border-slate-200 pl-3">
              <span className="text-slate-500">Per page:</span>
              <select
                value={limit}
                onChange={(e) => {
                  setLimit(Number(e.target.value))
                  setPage(1)
                }}
                className="h-8 px-2 bg-white border border-slate-300 rounded-lg text-xs font-bold text-slate-700 focus:outline-hidden focus:border-sky-500 shadow-2xs"
              >
                <option value={25}>25</option>
                <option value={50}>50</option>
                <option value={100}>100</option>
                <option value={200}>200</option>
              </select>
            </div>
          </div>

          <div className="flex items-center gap-1.5 self-center sm:self-auto">
            <button
              onClick={() => setPage(1)}
              disabled={page <= 1 || loading}
              className="p-2 rounded-lg border border-slate-300 bg-white hover:bg-slate-100 disabled:opacity-40 disabled:hover:bg-white text-slate-700 shadow-2xs transition-colors cursor-pointer disabled:cursor-not-allowed"
              title="First Page"
            >
              <ChevronsLeft className="w-4 h-4" />
            </button>
            <button
              onClick={() => setPage((p) => Math.max(1, p - 1))}
              disabled={page <= 1 || loading}
              className="p-2 rounded-lg border border-slate-300 bg-white hover:bg-slate-100 disabled:opacity-40 disabled:hover:bg-white text-slate-700 shadow-2xs transition-colors cursor-pointer disabled:cursor-not-allowed"
              title="Previous Page"
            >
              <ChevronLeft className="w-4 h-4" />
            </button>

            <span className="px-3 py-1.5 font-bold text-slate-800 text-xs bg-white border border-slate-300 rounded-lg shadow-2xs">
              {page} / {totalPages || 1}
            </span>

            <button
              onClick={() => setPage((p) => Math.min(totalPages, p + 1))}
              disabled={page >= totalPages || loading}
              className="p-2 rounded-lg border border-slate-300 bg-white hover:bg-slate-100 disabled:opacity-40 disabled:hover:bg-white text-slate-700 shadow-2xs transition-colors cursor-pointer disabled:cursor-not-allowed"
              title="Next Page"
            >
              <ChevronRight className="w-4 h-4" />
            </button>
            <button
              onClick={() => setPage(totalPages)}
              disabled={page >= totalPages || loading}
              className="p-2 rounded-lg border border-slate-300 bg-white hover:bg-slate-100 disabled:opacity-40 disabled:hover:bg-white text-slate-700 shadow-2xs transition-colors cursor-pointer disabled:cursor-not-allowed"
              title="Last Page"
            >
              <ChevronsRight className="w-4 h-4" />
            </button>
          </div>
        </div>
      </div>

      {/* Add / Edit Medicine Modal */}
      {isModalOpen && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/60 backdrop-blur-xs">
          <div className="bg-white w-full max-w-lg rounded-2xl shadow-2xl border border-slate-200 overflow-hidden max-h-[92vh] flex flex-col">
            <div className="px-5 py-4 bg-slate-900 text-white flex items-center justify-between">
              <h3 className="text-base font-bold">
                {editingId ? 'Edit Medicine Master' : 'Add New Medicine'}
              </h3>
              <button onClick={() => setIsModalOpen(false)} className="text-slate-400 hover:text-white p-1">
                <X className="w-5 h-5" />
              </button>
            </div>

            <form onSubmit={handleSaveMedicine} className="p-5 overflow-y-auto space-y-4 text-xs">
              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="font-bold text-slate-700 block mb-1">
                    Brand Name <span className="text-rose-600">*</span>
                  </label>
                  <input
                    type="text"
                    required
                    placeholder="e.g. Napa"
                    value={formBrand}
                    onChange={(e) => setFormBrand(e.target.value)}
                    className="w-full h-10 px-3 bg-slate-50 border border-slate-300 rounded-xl font-bold"
                  />
                </div>
                <div>
                  <label className="font-bold text-slate-700 block mb-1">
                    Strength <span className="text-rose-600">*</span>
                  </label>
                  <input
                    type="text"
                    required
                    placeholder="e.g. 500 mg"
                    value={formStrength}
                    onChange={(e) => setFormStrength(e.target.value)}
                    className="w-full h-10 px-3 bg-slate-50 border border-slate-300 rounded-xl font-bold"
                  />
                </div>
              </div>

              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="font-bold text-slate-700 block mb-1">
                    Generic Name <span className="text-rose-600">*</span>
                  </label>
                  <input
                    type="text"
                    required
                    placeholder="e.g. Paracetamol"
                    value={formGeneric}
                    onChange={(e) => setFormGeneric(e.target.value)}
                    className="w-full h-10 px-3 bg-slate-50 border border-slate-300 rounded-xl"
                  />
                </div>
                <div>
                  <label className="font-bold text-slate-700 block mb-1">
                    Dosage Form <span className="text-rose-600">*</span>
                  </label>
                  <select
                    value={formDosage}
                    onChange={(e) => setFormDosage(e.target.value)}
                    className="w-full h-10 px-3 bg-slate-50 border border-slate-300 rounded-xl font-medium"
                  >
                    <option value="Tablet">Tablet</option>
                    <option value="Capsule">Capsule</option>
                    <option value="Syrup">Syrup</option>
                    <option value="Suspension">Suspension</option>
                    <option value="Injection">Injection</option>
                    <option value="Ointment">Ointment</option>
                    <option value="Cream">Cream</option>
                    <option value="Eye Drop">Eye Drop</option>
                    <option value="Inhaler">Inhaler</option>
                    <option value="Suppository">Suppository</option>
                  </select>
                </div>
              </div>

              <div>
                <label className="font-bold text-slate-700 block mb-1">
                  Manufacturer <span className="text-rose-600">*</span>
                </label>
                <select
                  required
                  value={formMfgId}
                  onChange={(e) => setFormMfgId(e.target.value)}
                  className="w-full h-10 px-3 bg-slate-50 border border-slate-300 rounded-xl font-medium"
                >
                  <option value="">Select Manufacturer</option>
                  {manufacturers.map((m) => (
                    <option key={m.id} value={m.id}>
                      {m.name} {m.shortName ? `(${m.shortName})` : ''}
                    </option>
                  ))}
                </select>
              </div>

              <div className="grid grid-cols-3 gap-3">
                <div>
                  <label className="font-bold text-slate-700 block mb-1">Unit MRP (BDT)</label>
                  <input
                    type="number"
                    step="any"
                    placeholder="e.g. 5.00"
                    value={formMrp}
                    onChange={(e) => {
                      setFormMrp(e.target.value)
                      if (!formTradePrice && e.target.value) {
                        setFormTradePrice(String(Math.round(parseFloat(e.target.value) * 0.88 * 100) / 100))
                      }
                    }}
                    className="w-full h-10 px-3 bg-slate-50 border border-slate-300 rounded-xl font-mono"
                  />
                </div>
                <div>
                  <label className="font-bold text-slate-700 block mb-1">Box Price (BDT)</label>
                  <input
                    type="number"
                    step="any"
                    placeholder="e.g. 500.00"
                    value={formBoxPrice}
                    onChange={(e) => setFormBoxPrice(e.target.value)}
                    className="w-full h-10 px-3 bg-slate-50 border border-slate-300 rounded-xl font-mono"
                  />
                </div>
                <div>
                  <label className="font-bold text-slate-700 block mb-1">Trade Price (Wholesale)</label>
                  <input
                    type="number"
                    step="any"
                    placeholder="e.g. 4.40"
                    value={formTradePrice}
                    onChange={(e) => setFormTradePrice(e.target.value)}
                    className="w-full h-10 px-3 bg-slate-50 border border-slate-300 rounded-xl font-mono text-emerald-700 font-bold"
                  />
                </div>
              </div>

              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="font-bold text-slate-700 block mb-1">Purchase Unit</label>
                  <input
                    type="text"
                    placeholder="Box, Pack, etc."
                    value={formPurchaseUnit}
                    onChange={(e) => setFormPurchaseUnit(e.target.value)}
                    className="w-full h-10 px-3 bg-slate-50 border border-slate-300 rounded-xl"
                  />
                </div>
                <div>
                  <label className="font-bold text-slate-700 block mb-1">Retail Unit</label>
                  <input
                    type="text"
                    placeholder="Tablet, Capsule, Bottle"
                    value={formRetailUnit}
                    onChange={(e) => setFormRetailUnit(e.target.value)}
                    className="w-full h-10 px-3 bg-slate-50 border border-slate-300 rounded-xl"
                  />
                </div>
              </div>

              <div>
                <label className="font-bold text-slate-700 block mb-1">Pack Description</label>
                <input
                  type="text"
                  placeholder="e.g. 10x10 blister strips in box"
                  value={formPack}
                  onChange={(e) => setFormPack(e.target.value)}
                  className="w-full h-10 px-3 bg-slate-50 border border-slate-300 rounded-xl"
                />
              </div>

              <div>
                <label className="font-bold text-slate-700 block mb-1">
                  Search Keywords & Common Variations
                </label>
                <input
                  type="text"
                  placeholder="e.g. nappa fever headache pain paracitamol"
                  value={formKeywords}
                  onChange={(e) => setFormKeywords(e.target.value)}
                  className="w-full h-10 px-3 bg-slate-50 border border-slate-300 rounded-xl"
                />
                <p className="text-[10px] text-slate-400 mt-1">
                  Helps staff find medicines even with misspelling variations.
                </p>
              </div>

              <div className="flex items-center gap-2 pt-1">
                <input
                  type="checkbox"
                  id="formActive"
                  checked={formActive}
                  onChange={(e) => setFormActive(e.target.checked)}
                  className="w-4 h-4 rounded text-sky-600 focus:ring-sky-500"
                />
                <label htmlFor="formActive" className="font-bold text-slate-700 cursor-pointer">
                  Active in medicine catalog
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
                  disabled={savingMed}
                  className="px-4 py-2 bg-sky-600 hover:bg-sky-700 text-white font-bold rounded-xl disabled:opacity-50"
                >
                  {savingMed ? 'Saving...' : editingId ? 'Update Medicine' : 'Add Medicine'}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* CSV Import Modal with Dry-run Validation */}
      {isCsvModalOpen && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/60 backdrop-blur-xs">
          <div className="bg-white w-full max-w-xl rounded-2xl shadow-2xl border border-slate-200 overflow-hidden max-h-[92vh] flex flex-col">
            <div className="px-5 py-4 bg-slate-900 text-white flex items-center justify-between">
              <div className="flex items-center gap-2">
                <UploadCloud className="w-5 h-5 text-sky-400" />
                <h3 className="text-base font-bold">Import Medicines CSV</h3>
              </div>
              <button
                onClick={() => {
                  setIsCsvModalOpen(false)
                  setValidationResult(null)
                  setCsvFile(null)
                }}
                className="text-slate-400 hover:text-white p-1"
              >
                <X className="w-5 h-5" />
              </button>
            </div>

            <div className="p-5 overflow-y-auto space-y-4 text-xs">
              <div className="p-3 bg-sky-50 border border-sky-200 rounded-xl text-sky-900">
                <div className="font-bold mb-1">Required CSV Columns:</div>
                <code className="text-[11px] font-mono block bg-white p-2 rounded border border-sky-200">
                  brand_name,generic_name,strength,dosage_form,manufacturer
                </code>
                <div className="text-[11px] text-sky-700 mt-1">
                  Optional: pack_description, purchase_unit, retail_unit, search_keywords
                </div>
              </div>

              {/* File Upload Input */}
              <div>
                <label className="font-bold text-slate-700 block mb-1">Choose CSV File</label>
                <input
                  type="file"
                  accept=".csv,text/csv"
                  onChange={(e) => {
                    if (e.target.files?.[0]) {
                      setCsvFile(e.target.files[0])
                      setValidationResult(null)
                    }
                  }}
                  className="w-full text-xs text-slate-500 file:mr-3 file:py-2 file:px-4 file:rounded-xl file:border-0 file:text-xs file:font-semibold file:bg-sky-50 file:text-sky-700 hover:file:bg-sky-100"
                />
              </div>

              <div className="text-center text-slate-400 font-bold">— OR PASTE CSV TEXT —</div>

              {/* Text Area Input */}
              <div>
                <textarea
                  rows={4}
                  placeholder={`brand_name,generic_name,strength,dosage_form,manufacturer\nNapa,Paracetamol,500 mg,Tablet,Beximco Pharmaceuticals\nSeclo,Omeprazole,20 mg,Capsule,Square Pharmaceuticals`}
                  value={csvText}
                  onChange={(e) => {
                    setCsvText(e.target.value)
                    setValidationResult(null)
                  }}
                  className="w-full p-2.5 bg-slate-50 border border-slate-300 rounded-xl font-mono text-[11px]"
                />
              </div>

              {/* Validation Result Box */}
              {validationResult && (
                <div className="p-4 bg-slate-50 rounded-xl border border-slate-200 space-y-2">
                  <div className="flex items-center justify-between font-bold">
                    <span className="flex items-center gap-1.5 text-emerald-700">
                      <CheckCircle2 className="w-4 h-4" />
                      Valid Rows: {validationResult.validCount}
                    </span>
                    {validationResult.errorCount > 0 && (
                      <span className="flex items-center gap-1.5 text-rose-700">
                        <AlertTriangle className="w-4 h-4" />
                        Errors: {validationResult.errorCount}
                      </span>
                    )}
                  </div>

                  {validationResult.newManufacturers?.length > 0 && (
                    <div className="text-[11px] text-amber-800 bg-amber-50 p-2 rounded-lg border border-amber-200">
                      <strong>New Manufacturers detected:</strong>{' '}
                      {validationResult.newManufacturers.join(', ')} (will be created automatically)
                    </div>
                  )}

                  {validationResult.errors?.length > 0 && (
                    <div className="text-[11px] text-rose-700 bg-rose-50 p-2 rounded-lg border border-rose-200 max-h-28 overflow-y-auto">
                      <strong>Row Errors:</strong>
                      <ul className="list-disc pl-4 mt-1">
                        {validationResult.errors.map((err: any, i: number) => (
                          <li key={i}>
                            Row {err.row}: {err.error}
                          </li>
                        ))}
                      </ul>
                    </div>
                  )}
                </div>
              )}

              {/* Modal Actions */}
              <div className="pt-2 flex items-center justify-end gap-2">
                <button
                  type="button"
                  onClick={() => {
                    setIsCsvModalOpen(false)
                    setValidationResult(null)
                  }}
                  className="px-4 py-2 bg-slate-100 hover:bg-slate-200 text-slate-700 font-bold rounded-xl"
                >
                  Cancel
                </button>

                {!validationResult ? (
                  <button
                    type="button"
                    onClick={handleValidateCsv}
                    disabled={validatingCsv}
                    className="px-4 py-2 bg-sky-600 hover:bg-sky-700 text-white font-bold rounded-xl disabled:opacity-50"
                  >
                    {validatingCsv ? 'Validating...' : 'Validate CSV'}
                  </button>
                ) : (
                  <button
                    type="button"
                    onClick={handleCommitCsv}
                    disabled={importingCsv || validationResult.validCount === 0}
                    className="px-4 py-2 bg-emerald-600 hover:bg-emerald-700 text-white font-bold rounded-xl disabled:opacity-50"
                  >
                    {importingCsv
                      ? 'Importing...'
                      : `Confirm & Import (${validationResult.validCount} rows)`}
                  </button>
                )}
              </div>
            </div>
          </div>
        </div>
      )}
    </div>
  )
}
