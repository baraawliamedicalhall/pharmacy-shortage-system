'use client'

import React, { useState, useEffect, useRef, useCallback } from 'react'
import {
  Search,
  X,
  Pill,
  Clock,
  Trash2,
  CheckCircle2,
  ChevronRight,
  Zap,
  RefreshCw,
  Sparkles,
} from 'lucide-react'
import { Navbar } from '@/components/Navbar'
import { ToastContainer, ToastMessage } from '@/components/Toast'
import { PwaInstallBanner } from '@/components/PwaInstallBanner'
import { ShortageAddModal, SelectedMedicine } from '@/components/ShortageAddModal'

export interface UserProfile {
  id: string
  employeeId: string
  name: string
  role: 'ADMIN' | 'EMPLOYEE'
}

interface ShortageReport {
  id: string
  quantity: number | null
  unit: string | null
  notes: string | null
  status: string
  reportedAt: string
  medicine: {
    id: string
    brandName: string
    genericName: string
    strength: string
    dosageForm: string
    manufacturer?: {
      name: string
      shortName?: string | null
    }
  }
}

interface EmployeeShortageClientProps {
  user: UserProfile
}

export function EmployeeShortageClient({ user }: EmployeeShortageClientProps) {
  // Search state
  const [query, setQuery] = useState('')
  const [searchResults, setSearchResults] = useState<SelectedMedicine[]>([])
  const [searching, setSearching] = useState(false)
  const [selectedIndex, setSelectedIndex] = useState<number>(-1)
  const searchInputRef = useRef<HTMLInputElement>(null)
  const abortControllerRef = useRef<AbortController | null>(null)
  const clientCacheRef = useRef<Map<string, SelectedMedicine[]>>(new Map())

  // Frequently used medicines
  const [frequentMedicines, setFrequentMedicines] = useState<SelectedMedicine[]>([])
  const [loadingFrequent, setLoadingFrequent] = useState(true)

  // Today's employee reports
  const [myReports, setMyReports] = useState<ShortageReport[]>([])
  const [loadingReports, setLoadingReports] = useState(true)

  // Modal & Toast
  const [selectedMed, setSelectedMed] = useState<SelectedMedicine | null>(null)
  const [modalOpen, setModalOpen] = useState(false)
  const [toasts, setToasts] = useState<ToastMessage[]>([])

  const addToast = (type: 'success' | 'error' | 'info', text: string) => {
    const id = Date.now().toString() + Math.random().toString()
    setToasts((prev) => [...prev, { id, type, text }])
  }

  const dismissToast = (id: string) => {
    setToasts((prev) => prev.filter((t) => t.id !== id))
  }

  // Load initial data on mount
  useEffect(() => {
    loadFrequent()
    loadMyReports()
  }, [])

  // 2. Load frequently used medicines
  const loadFrequent = async () => {
    try {
      setLoadingFrequent(true)
      const res = await fetch('/api/medicines/frequent')
      if (res.ok) {
        const data = await res.json()
        setFrequentMedicines(data.frequent || [])
      }
    } catch (err) {
      console.error('Error loading frequent medicines:', err)
    } finally {
      setLoadingFrequent(false)
    }
  }

  // 3. Load today's reports by current employee
  const loadMyReports = async () => {
    try {
      setLoadingReports(true)
      const res = await fetch('/api/shortages')
      if (res.ok) {
        const data = await res.json()
        setMyReports(data.reports || [])
      }
    } catch (err) {
      console.error('Error loading my reports:', err)
    } finally {
      setLoadingReports(false)
    }
  }

  // 4. Ultra-fast dynamic search with client cache and abort controller
  const performSearch = useCallback(async (searchTerm: string) => {
    const q = searchTerm.trim().toLowerCase()
    if (!q) {
      setSearchResults([])
      setSearching(false)
      setSelectedIndex(-1)
      return
    }

    // Check instant client cache first (0ms latency!)
    if (clientCacheRef.current.has(q)) {
      setSearchResults(clientCacheRef.current.get(q)!)
      setSearching(false)
      setSelectedIndex(0)
      return
    }

    // Cancel previous ongoing fetch request
    if (abortControllerRef.current) {
      abortControllerRef.current.abort()
    }
    const controller = new AbortController()
    abortControllerRef.current = controller

    setSearching(true)
    try {
      const res = await fetch(`/api/medicines/search?q=${encodeURIComponent(q)}&limit=30`, {
        signal: controller.signal,
      })

      if (res.ok) {
        const data = await res.json()
        const items = data.medicines || []
        clientCacheRef.current.set(q, items)
        setSearchResults(items)
        setSelectedIndex(items.length > 0 ? 0 : -1)
      }
    } catch (err: unknown) {
      if (err instanceof Error && err.name !== 'AbortError') {
        console.error('Search error:', err)
      }
    } finally {
      setSearching(false)
    }
  }, [])

  // Fast reactive debounce (50ms)
  useEffect(() => {
    const q = query.trim()
    if (!q) {
      setSearchResults([])
      setSearching(false)
      return
    }

    const timer = setTimeout(() => {
      performSearch(q)
    }, 50)

    return () => clearTimeout(timer)
  }, [query, performSearch])

  // Keyboard navigation inside search results
  const handleKeyDown = (e: React.KeyboardEvent<HTMLInputElement>) => {
    if (searchResults.length === 0) return

    if (e.key === 'ArrowDown') {
      e.preventDefault()
      setSelectedIndex((prev) => (prev < searchResults.length - 1 ? prev + 1 : 0))
    } else if (e.key === 'ArrowUp') {
      e.preventDefault()
      setSelectedIndex((prev) => (prev > 0 ? prev - 1 : searchResults.length - 1))
    } else if (e.key === 'Enter') {
      e.preventDefault()
      if (selectedIndex >= 0 && selectedIndex < searchResults.length) {
        handleSelectMedicine(searchResults[selectedIndex])
      }
    } else if (e.key === 'Escape') {
      setQuery('')
      setSearchResults([])
    }
  }

  // 5. Select medicine to report
  const handleSelectMedicine = (med: SelectedMedicine) => {
    setSelectedMed(med)
    setModalOpen(true)
  }

  // 6. Handle successful shortage addition
  const handleShortageSuccess = (medicineName: string) => {
    addToast('success', `✓ ${medicineName} added to today's shortage list`)
    setQuery('')
    setSearchResults([])
    loadMyReports()
    loadFrequent()

    // Immediately refocus search field so employee can report next medicine
    setTimeout(() => {
      searchInputRef.current?.focus()
    }, 80)
  }

  // 7. Remove/Undo a report
  const handleRemoveReport = async (reportId: string, medName: string) => {
    if (!confirm(`Remove "${medName}" from your today's reports?`)) return

    try {
      const res = await fetch(`/api/shortages/${reportId}`, { method: 'DELETE' })
      if (res.ok) {
        addToast('info', `Removed ${medName}`)
        loadMyReports()
      } else {
        const data = await res.json()
        addToast('error', data.error || 'Failed to remove report')
      }
    } catch (err) {
      console.error('Delete error:', err)
      addToast('error', 'Network error removing report')
    }
  }

  // Helper to highlight matching characters
  const highlightMatch = (text: string, searchWord: string) => {
    if (!searchWord.trim() || !text) return text
    const words = searchWord.trim().toLowerCase().split(/\s+/).filter(Boolean)
    const regex = new RegExp(`(${words.map((w) => w.replace(/[.*+?^${}()|[\]\\]/g, '\\$&')).join('|')})`, 'gi')
    const parts = text.split(regex)
    return parts.map((part, i) =>
      regex.test(part) ? (
        <mark key={i} className="bg-sky-200 text-sky-950 px-0.5 rounded font-black">
          {part}
        </mark>
      ) : (
        part
      )
    )
  }

  return (
    <div className="min-h-screen bg-slate-100 flex flex-col pb-12">
      <ToastContainer toasts={toasts} onDismiss={dismissToast} />
      <Navbar user={user} />
      <PwaInstallBanner />

      <main className="max-w-xl mx-auto w-full px-4 pt-4 flex-1 flex flex-col gap-4">
        {/* Top Header Card */}
        <div className="bg-white rounded-2xl p-4 shadow-xs border border-slate-200">
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-2">
              <span className="w-2.5 h-2.5 rounded-full bg-emerald-500 animate-pulse" />
              <h1 className="text-lg font-bold text-slate-900">Medicine Short</h1>
            </div>
            <span className="text-xs font-semibold px-2.5 py-1 rounded-full bg-sky-50 text-sky-700 border border-sky-200" suppressHydrationWarning>
              Today: {new Date().toLocaleDateString('en-GB', { day: 'numeric', month: 'short' })}
            </span>
          </div>
          <p className="text-xs text-slate-500 mt-1">
            Search 25,000+ medicines by Brand, Generic, Strength, or Company.
          </p>

          {/* Quick Search Bar */}
          <div className="relative mt-3">
            <div className="relative flex items-center">
              <Search className="w-5 h-5 text-slate-400 absolute left-3.5 pointer-events-none" />
              <input
                ref={searchInputRef}
                type="search"
                autoComplete="off"
                autoCorrect="off"
                autoCapitalize="none"
                spellCheck="false"
                placeholder="Search medicine brand, generic or company..."
                value={query}
                onChange={(e) => setQuery(e.target.value)}
                onKeyDown={handleKeyDown}
                className="w-full h-12 pl-11 pr-10 text-sm sm:text-base font-semibold bg-slate-50 border-2 border-slate-200 focus:border-sky-600 focus:bg-white rounded-xl focus:outline-hidden transition-all shadow-inner placeholder:text-slate-400 placeholder:font-normal"
              />
              {query ? (
                <button
                  onClick={() => {
                    setQuery('')
                    setSearchResults([])
                    searchInputRef.current?.focus()
                  }}
                  className="absolute right-3 p-1 text-slate-400 hover:text-slate-600 rounded-full hover:bg-slate-200 transition-colors"
                >
                  <X className="w-4 h-4" />
                </button>
              ) : searching ? (
                <div className="absolute right-3">
                  <div className="w-4 h-4 border-2 border-sky-600 border-t-transparent rounded-full animate-spin" />
                </div>
              ) : null}
            </div>

            {/* Live Search Results Dropdown */}
            {query.trim().length > 0 && (
              <div className="absolute top-full left-0 right-0 mt-1.5 bg-white border border-slate-200 rounded-2xl shadow-xl max-h-[60vh] overflow-y-auto z-30 divide-y divide-slate-100">
                {searching && searchResults.length === 0 ? (
                  <div className="p-6 text-center text-xs text-slate-500 flex items-center justify-center gap-2">
                    <div className="w-4 h-4 border-2 border-sky-600 border-t-transparent rounded-full animate-spin" />
                    <span>Searching catalog...</span>
                  </div>
                ) : searchResults.length === 0 ? (
                  <div className="p-6 text-center">
                    <p className="text-xs font-semibold text-slate-700">No medicine matched "{query}"</p>
                    <p className="text-[11px] text-slate-400 mt-0.5">
                      Check spelling or try searching generic name
                    </p>
                  </div>
                ) : (
                  searchResults.map((med, index) => {
                    const isSelected = index === selectedIndex
                    return (
                      <div
                        key={med.id}
                        onClick={() => handleSelectMedicine(med)}
                        onMouseEnter={() => setSelectedIndex(index)}
                        className={`p-3 sm:p-3.5 transition-colors cursor-pointer flex items-center justify-between gap-3 ${
                          isSelected ? 'bg-sky-50' : 'hover:bg-slate-50'
                        }`}
                      >
                        <div className="flex-1 min-w-0">
                          <div className="flex items-center gap-2 flex-wrap">
                            <span className="font-bold text-slate-900 text-sm">
                              {highlightMatch(med.brandName, query)}
                            </span>
                            <span className="text-xs font-semibold text-sky-700 px-1.5 py-0.5 bg-sky-100 rounded-md">
                              {med.strength}
                            </span>
                            <span className="text-[11px] text-slate-500 font-medium">
                              ({med.dosageForm})
                            </span>
                          </div>
                          <div className="text-xs text-slate-600 mt-0.5 truncate">
                            {highlightMatch(med.genericName, query)}
                          </div>
                          {med.manufacturer && (
                            <div className="text-[11px] text-slate-400 mt-0.5">
                              {med.manufacturer.shortName || med.manufacturer.name}
                            </div>
                          )}
                        </div>

                        <div className="flex items-center gap-1.5 shrink-0">
                          <span className="text-xs font-bold text-sky-600 bg-sky-50 px-2.5 py-1.5 rounded-lg border border-sky-200 hover:bg-sky-600 hover:text-white transition-all flex items-center gap-1">
                            <span>Add</span>
                            <ChevronRight className="w-3 h-3" />
                          </span>
                        </div>
                      </div>
                    )
                  })
                )}
              </div>
            )}
          </div>
        </div>

        {/* Frequently Used Medicines Section */}
        <div className="bg-white rounded-2xl p-4 shadow-xs border border-slate-200">
          <div className="flex items-center justify-between mb-3">
            <div className="flex items-center gap-1.5 text-xs font-bold text-slate-800 uppercase tracking-wider">
              <Zap className="w-3.5 h-3.5 text-amber-500" />
              <span>Frequently Used</span>
            </div>
            <span className="text-[11px] text-slate-400">1-Tap Shortcuts</span>
          </div>

          {loadingFrequent ? (
            <div className="flex gap-2 animate-pulse py-1">
              {[1, 2, 3, 4].map((n) => (
                <div key={n} className="h-8 w-20 bg-slate-200 rounded-lg" />
              ))}
            </div>
          ) : (
            <div className="flex flex-wrap gap-2">
              {frequentMedicines.map((med) => (
                <button
                  key={med.id}
                  onClick={() => handleSelectMedicine(med)}
                  className="px-3 py-2 bg-slate-100 hover:bg-sky-50 active:bg-sky-100 text-slate-800 hover:text-sky-900 border border-slate-200 hover:border-sky-300 rounded-xl text-xs font-semibold transition-colors flex items-center gap-1.5 cursor-pointer"
                >
                  <Pill className="w-3 h-3 text-sky-600 shrink-0" />
                  <span>
                    {med.brandName} {med.strength}
                  </span>
                </button>
              ))}
            </div>
          )}
        </div>

        {/* Today's My Reports */}
        <div className="bg-white rounded-2xl p-4 shadow-xs border border-slate-200 flex-1 flex flex-col">
          <div className="flex items-center justify-between pb-3 border-b border-slate-100">
            <div>
              <h2 className="text-sm font-bold text-slate-900 flex items-center gap-2">
                <span>Today's My Reports</span>
                <span className="text-xs bg-sky-100 text-sky-800 font-bold px-2 py-0.5 rounded-full">
                  {myReports.length}
                </span>
              </h2>
              <p className="text-[11px] text-slate-400">Submissions made by you today</p>
            </div>
            <button
              onClick={loadMyReports}
              className="text-slate-400 hover:text-sky-600 p-1 rounded-lg cursor-pointer"
              title="Refresh my reports"
            >
              <RefreshCw className={`w-4 h-4 ${loadingReports ? 'animate-spin' : ''}`} />
            </button>
          </div>

          <div className="mt-3 flex-1">
            {loadingReports && myReports.length === 0 ? (
              <div className="py-8 text-center text-xs text-slate-400">Loading your submissions...</div>
            ) : myReports.length === 0 ? (
              <div className="py-8 text-center text-slate-400">
                <Pill className="w-8 h-8 mx-auto mb-2 text-slate-300" />
                <p className="text-xs font-medium">You haven't reported any shortages today yet.</p>
                <p className="text-[11px] text-slate-400 mt-1">
                  Type medicine name above to add your first shortage!
                </p>
              </div>
            ) : (
              <div className="space-y-2">
                {myReports.map((report) => {
                  const timeStr = new Date(report.reportedAt).toLocaleTimeString('en-US', {
                    hour: 'numeric',
                    minute: '2-digit',
                    hour12: true,
                  })

                  return (
                    <div
                      key={report.id}
                      className="p-3 bg-slate-50 hover:bg-slate-100/80 border border-slate-200 rounded-xl flex items-center justify-between gap-3 transition-colors"
                    >
                      <div className="flex-1 min-w-0">
                        <div className="flex items-center gap-2 flex-wrap">
                          <CheckCircle2 className="w-4 h-4 text-emerald-500 shrink-0" />
                          <span className="font-bold text-slate-900 text-xs sm:text-sm">
                            {report.medicine.brandName}
                          </span>
                          <span className="text-[11px] font-semibold text-slate-600 bg-white px-1.5 py-0.5 rounded border border-slate-200">
                            {report.medicine.strength}
                          </span>
                          <span className="text-[10px] text-slate-400">
                            ({report.medicine.dosageForm})
                          </span>
                        </div>

                        <div className="flex items-center gap-2 mt-1 ml-6 text-xs text-slate-600">
                          <span>
                            {report.quantity ? (
                              <strong className="text-slate-800">
                                {report.quantity} {report.unit || 'Box'}
                              </strong>
                            ) : (
                              <span className="text-amber-700 font-semibold">Short (Qty not set)</span>
                            )}
                          </span>
                          <span className="text-slate-300">•</span>
                          <span className="flex items-center gap-1 text-[11px] text-slate-400">
                            <Clock className="w-3 h-3" />
                            {timeStr}
                          </span>
                        </div>

                        {report.notes && (
                          <p className="text-[11px] text-slate-500 italic mt-1 ml-6">
                            "{report.notes}"
                          </p>
                        )}
                      </div>

                      {/* Undo / Remove button for recent submission */}
                      <button
                        onClick={() =>
                          handleRemoveReport(
                            report.id,
                            `${report.medicine.brandName} ${report.medicine.strength}`
                          )
                        }
                        className="text-slate-400 hover:text-rose-600 p-2 rounded-lg hover:bg-rose-50 transition-colors cursor-pointer"
                        title="Remove this report"
                        aria-label="Remove report"
                      >
                        <Trash2 className="w-4 h-4" />
                      </button>
                    </div>
                  )
                })}
              </div>
            )}
          </div>
        </div>
      </main>

      {/* Shortage Add Modal / Bottom Drawer */}
      <ShortageAddModal
        medicine={selectedMed}
        isOpen={modalOpen}
        onClose={() => {
          setModalOpen(false)
          setSelectedMed(null)
        }}
        onSuccess={handleShortageSuccess}
      />
    </div>
  )
}
