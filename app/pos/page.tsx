'use client'

import React, { useState, useEffect, useRef } from 'react'
import Link from 'next/link'
import {
  Search,
  Plus,
  Minus,
  Trash2,
  Smartphone,
  Store,
  CheckCircle2,
  ArrowLeft,
  X,
  UserCheck,
  Receipt,
  ShoppingCart,
  Banknote,
  Landmark,
  Zap,
} from 'lucide-react'
import { ToastContainer, ToastMessage } from '@/components/Toast'
import { ThermalReceiptModal, ReceiptSaleData } from '@/components/ThermalReceiptModal'
import { PosRegisterDrawer } from '@/components/PosRegisterDrawer'
import { SaleEditModal } from '@/components/SaleEditModal'

interface Medicine {
  id: string
  brandName: string
  genericName: string
  strength: string
  dosageForm: string
  barcode: string | null
  mrp: number | null
  stripPrice: number | null
  boxPrice: number | null
  tradePrice: number | null
  unitsPerStrip: number | null
  stripsPerBox: number | null
  manufacturer?: {
    name: string
    shortName: string | null
  }
}

interface CartItem {
  medicineId: string
  brandName: string
  genericName: string
  strength: string
  dosageForm: string
  unit: 'Tablet' | 'Strip' | 'Box' | 'Bottle'
  unitPrice: number
  quantity: number
  discountPercent?: number
  discountAmount: number
  total: number
  mrp?: number | null
  stripPrice?: number | null
  boxPrice?: number | null
}

// Highlight matching text in search results
function HighlightText({ text, query }: { text: string; query: string }) {
  if (!query || query.length < 2) return <>{text}</>
  const words = query.toLowerCase().split(/\s+/).filter(Boolean)
  const parts: { text: string; highlight: boolean }[] = []

  const idx = text.toLowerCase().indexOf(words[0])
  if (idx === -1) return <>{text}</>

  if (idx > 0) parts.push({ text: text.slice(0, idx), highlight: false })
  parts.push({ text: text.slice(idx, idx + words[0].length), highlight: true })
  if (idx + words[0].length < text.length) parts.push({ text: text.slice(idx + words[0].length), highlight: false })

  return (
    <>
      {parts.map((p, i) =>
        p.highlight ? (
          <span key={i} className="text-sky-300 bg-sky-500/15 rounded px-0.5">
            {p.text}
          </span>
        ) : (
          <span key={i}>{p.text}</span>
        )
      )}
    </>
  )
}

export default function PosTerminalPage() {
  const [currentUser, setCurrentUser] = useState<{ name: string; employeeId: string; role: string } | null>(null)
  const [toasts, setToasts] = useState<ToastMessage[]>([])

  const showToast = (type: 'success' | 'error' | 'info', text: string) => {
    setToasts((prev) => [...prev, { id: Math.random().toString(), type, text }])
  }

  const dismissToast = (id: string) => {
    setToasts((prev) => prev.filter((t) => t.id !== id))
  }

  // Search & autocomplete
  const [searchQuery, setSearchQuery] = useState('')
  const [searchResults, setSearchResults] = useState<Medicine[]>([])
  const [isSearching, setIsSearching] = useState(false)
  const [dropdownOpen, setDropdownOpen] = useState(false)
  const [highlightedIdx, setHighlightedIdx] = useState(-1)
  const searchInputRef = useRef<HTMLInputElement>(null)
  const searchContainerRef = useRef<HTMLDivElement>(null)
  const abortRef = useRef<AbortController | null>(null)
  const dropdownRef = useRef<HTMLDivElement>(null)

  // Cart
  const [cart, setCart] = useState<CartItem[]>([])

  // Checkout
  const [customerName, setCustomerName] = useState('Walk-in Customer')
  const [customerPhone, setCustomerPhone] = useState('')
  const [discountMode, setDiscountMode] = useState<'PERCENT' | 'FLAT'>('PERCENT')
  const [discountValue, setDiscountValue] = useState<string>('0')
  const [tenderCash, setTenderCash] = useState<string>('')
  const [paymentMethod, setPaymentMethod] = useState<'CASH' | 'BKASH' | 'BANK'>('CASH')
  const [isCheckingOut, setIsCheckingOut] = useState(false)

  // Modals & Drawers
  const [activeReceipt, setActiveReceipt] = useState<ReceiptSaleData | null>(null)
  const [isRegisterOpen, setIsRegisterOpen] = useState(false)
  const [editingSale, setEditingSale] = useState<ReceiptSaleData | null>(null)
  const [todaySales, setTodaySales] = useState<ReceiptSaleData[]>([])
  const [registerStats, setRegisterStats] = useState({
    date: new Date().toISOString().slice(0, 10),
    totalSalesCount: 0,
    totalRevenue: 0,
    totalCash: 0,
    totalBkash: 0,
  })

  // Fast OTC from database
  const [otcMedicines, setOtcMedicines] = useState<Medicine[]>([])
  const [loadingOtc, setLoadingOtc] = useState(false)

  // Load current user session & OTC items
  useEffect(() => {
    async function loadUser() {
      try {
        const res = await fetch('/api/auth/me')
        const data = await res.json()
        if (res.ok && data.user) {
          setCurrentUser(data.user)
        }
      } catch {
        // ignore
      }
    }
    loadUser()
    loadTodaySales()
    loadOtcMedicines()
  }, [])

  const loadOtcMedicines = async () => {
    try {
      setLoadingOtc(true)
      const res = await fetch('/api/pos/medicines?otc=true')
      const data = await res.json()
      if (res.ok && data.medicines) {
        setOtcMedicines(data.medicines)
      }
    } catch {
      // ignore
    } finally {
      setLoadingOtc(false)
    }
  }

  // Load today's sales register
  const loadTodaySales = async () => {
    try {
      const res = await fetch('/api/pos/sales')
      const data = await res.json()
      if (res.ok) {
        setTodaySales(data.sales || [])
        if (data.stats) setRegisterStats(data.stats)
      }
    } catch {
      // ignore
    }
  }

  // Typeahead medicine search with AbortController for cancellation
  useEffect(() => {
    if (!searchQuery || searchQuery.trim().length < 2) {
      setSearchResults([])
      setDropdownOpen(false)
      setHighlightedIdx(-1)
      return
    }

    const timer = setTimeout(async () => {
      // Cancel any in-flight request
      if (abortRef.current) abortRef.current.abort()
      const controller = new AbortController()
      abortRef.current = controller

      setIsSearching(true)
      try {
        const res = await fetch(
          `/api/pos/medicines?q=${encodeURIComponent(searchQuery.trim())}&limit=15`,
          { signal: controller.signal }
        )
        const data = await res.json()
        if (res.ok && data.medicines) {
          setSearchResults(data.medicines)
          setDropdownOpen(true)
          setHighlightedIdx(-1)
        }
      } catch (err: any) {
        if (err.name !== 'AbortError') {
          // ignore
        }
      } finally {
        setIsSearching(false)
      }
    }, 120) // Faster debounce

    return () => clearTimeout(timer)
  }, [searchQuery])

  // Click outside search container to close dropdown
  useEffect(() => {
    function handleClickOutside(e: MouseEvent) {
      if (searchContainerRef.current && !searchContainerRef.current.contains(e.target as Node)) {
        setDropdownOpen(false)
      }
    }
    document.addEventListener('mousedown', handleClickOutside)
    return () => document.removeEventListener('mousedown', handleClickOutside)
  }, [])

  // Keyboard navigation for search dropdown
  const handleSearchKeyDown = (e: React.KeyboardEvent<HTMLInputElement>) => {
    if (!dropdownOpen || searchResults.length === 0) return

    if (e.key === 'ArrowDown') {
      e.preventDefault()
      setHighlightedIdx((prev) => (prev < searchResults.length - 1 ? prev + 1 : 0))
    } else if (e.key === 'ArrowUp') {
      e.preventDefault()
      setHighlightedIdx((prev) => (prev > 0 ? prev - 1 : searchResults.length - 1))
    } else if (e.key === 'Enter') {
      e.preventDefault()
      if (highlightedIdx >= 0 && highlightedIdx < searchResults.length) {
        addToCart(searchResults[highlightedIdx])
      } else if (searchResults.length > 0) {
        addToCart(searchResults[0])
      }
    } else if (e.key === 'Escape') {
      setDropdownOpen(false)
      setHighlightedIdx(-1)
    }
  }

  // Scroll highlighted item into view
  useEffect(() => {
    if (highlightedIdx >= 0 && dropdownRef.current) {
      const items = dropdownRef.current.querySelectorAll('[data-search-item]')
      if (items[highlightedIdx]) {
        items[highlightedIdx].scrollIntoView({ block: 'nearest' })
      }
    }
  }, [highlightedIdx])

  // Global Keyboard Shortcuts
  const handleCheckoutRef = useRef<(() => void) | null>(null)

  // Add medicine to cart
  const addToCart = (med: Medicine, defaultUnit?: 'Tablet' | 'Strip' | 'Box' | 'Bottle') => {
    let unit: 'Tablet' | 'Strip' | 'Box' | 'Bottle' = defaultUnit || 'Tablet'
    if (!defaultUnit) {
      const df = med.dosageForm.toLowerCase()
      if (df.includes('syrup') || df.includes('drop') || df.includes('suspension')) {
        unit = 'Bottle'
      }
    }

    let unitPrice = med.mrp || 5.0
    if (unit === 'Strip' && med.stripPrice) unitPrice = med.stripPrice
    if (unit === 'Box' && med.boxPrice) unitPrice = med.boxPrice

    // Check if already in cart with same unit
    const existingIndex = cart.findIndex((item) => item.medicineId === med.id && item.unit === unit)
    if (existingIndex > -1) {
      const updated = [...cart]
      const newQty = updated[existingIndex].quantity + 1
      const pct = updated[existingIndex].discountPercent || 0
      const lineGross = updated[existingIndex].unitPrice * newQty
      const lineDisc = Math.round(lineGross * (pct / 100) * 100) / 100
      updated[existingIndex].quantity = newQty
      updated[existingIndex].discountAmount = lineDisc
      updated[existingIndex].total = Math.max(0, Math.round((lineGross - lineDisc) * 100) / 100)
      setCart(updated)
      showToast('info', `${med.brandName} qty +1`)
    } else {
      const newItem: CartItem = {
        medicineId: med.id,
        brandName: med.brandName,
        genericName: med.genericName,
        strength: med.strength,
        dosageForm: med.dosageForm,
        unit,
        unitPrice,
        quantity: 1,
        discountPercent: 0,
        discountAmount: 0,
        total: unitPrice,
        mrp: med.mrp,
        stripPrice: med.stripPrice,
        boxPrice: med.boxPrice,
      }
      setCart([newItem, ...cart])
    }

    setSearchQuery('')
    setDropdownOpen(false)
    setHighlightedIdx(-1)
    searchInputRef.current?.focus()
  }

  // Update item unit
  const changeItemUnit = (index: number, newUnit: 'Tablet' | 'Strip' | 'Box' | 'Bottle') => {
    const item = cart[index]
    let price = item.unitPrice
    if (newUnit === 'Box') {
      price = item.boxPrice || (item.mrp ? item.mrp * 100 : 100)
    } else if (newUnit === 'Strip') {
      price = item.stripPrice || (item.mrp ? item.mrp * 10 : 20)
    } else {
      price = item.mrp || 5.0
    }

    const updated = [...cart]
    const pct = item.discountPercent || 0
    const lineGross = price * item.quantity
    const lineDisc = Math.round(lineGross * (pct / 100) * 100) / 100
    updated[index] = {
      ...item,
      unit: newUnit,
      unitPrice: price,
      discountAmount: lineDisc,
      total: Math.max(0, Math.round((lineGross - lineDisc) * 100) / 100),
    }
    setCart(updated)
  }

  // Adjust item quantity
  const adjustQuantity = (index: number, delta: number) => {
    const updated = [...cart]
    const newQty = Math.max(1, updated[index].quantity + delta)
    const pct = updated[index].discountPercent || 0
    const lineGross = updated[index].unitPrice * newQty
    const lineDisc = Math.round(lineGross * (pct / 100) * 100) / 100
    updated[index].quantity = newQty
    updated[index].discountAmount = lineDisc
    updated[index].total = Math.max(0, Math.round((lineGross - lineDisc) * 100) / 100)
    setCart(updated)
  }

  const setDirectQuantity = (index: number, val: string) => {
    const parsed = parseInt(val, 10) || 1
    const newQty = Math.max(1, parsed)
    const updated = [...cart]
    const pct = updated[index].discountPercent || 0
    const lineGross = updated[index].unitPrice * newQty
    const lineDisc = Math.round(lineGross * (pct / 100) * 100) / 100
    updated[index].quantity = newQty
    updated[index].discountAmount = lineDisc
    updated[index].total = Math.max(0, Math.round((lineGross - lineDisc) * 100) / 100)
    setCart(updated)
  }

  const updateItemRate = (index: number, val: string) => {
    const parsed = parseFloat(val)
    const rate = isNaN(parsed) || parsed < 0 ? 0 : parsed
    const updated = [...cart]
    const pct = updated[index].discountPercent || 0
    const lineGross = rate * updated[index].quantity
    const lineDisc = Math.round(lineGross * (pct / 100) * 100) / 100
    updated[index].unitPrice = rate
    updated[index].discountAmount = lineDisc
    updated[index].total = Math.max(0, Math.round((lineGross - lineDisc) * 100) / 100)
    setCart(updated)
  }

  const updateItemDiscountPercent = (index: number, val: string) => {
    const parsed = parseFloat(val)
    const pct = isNaN(parsed) || parsed < 0 ? 0 : Math.min(100, parsed)
    const updated = [...cart]
    const lineGross = updated[index].unitPrice * updated[index].quantity
    const lineDisc = Math.round(lineGross * (pct / 100) * 100) / 100
    updated[index].discountPercent = pct
    updated[index].discountAmount = lineDisc
    updated[index].total = Math.max(0, Math.round((lineGross - lineDisc) * 100) / 100)
    setCart(updated)
  }

  const removeItem = (index: number) => {
    setCart(cart.filter((_, i) => i !== index))
  }

  // Calculations
  const grossSubtotal = cart.reduce((sum, item) => sum + (item.unitPrice * item.quantity), 0)
  const itemLevelDiscounts = cart.reduce((sum, item) => sum + (item.discountAmount || 0), 0)
  const afterItemDiscSubtotal = Math.max(0, grossSubtotal - itemLevelDiscounts)

  const parsedVal = parseFloat(discountValue) || 0
  const billDiscount = discountMode === 'PERCENT'
    ? Math.round(afterItemDiscSubtotal * (Math.min(100, Math.max(0, parsedVal)) / 100) * 100) / 100
    : Math.min(afterItemDiscSubtotal, Math.max(0, parsedVal))

  const totalDiscount = Math.round((itemLevelDiscounts + billDiscount) * 100) / 100
  const netPayable = Math.max(0, Math.round((grossSubtotal - totalDiscount) * 100) / 100)
  const parsedTender = parseFloat(tenderCash) || (tenderCash === '' ? netPayable : 0)
  const changeDue = Math.max(0, Math.round((parsedTender - netPayable) * 100) / 100)

  // Handle Checkout
  const handleCheckout = async () => {
    if (cart.length === 0) {
      showToast('error', 'Cart is empty. Add medicines first.')
      return
    }

    setIsCheckingOut(true)
    try {
      const res = await fetch('/api/pos/sales', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          customerName,
          customerPhone,
          items: cart,
          discountAmount: totalDiscount,
          paidAmount: parsedTender,
          paymentMethod,
        }),
      })

      const data = await res.json()
      if (res.ok && data.sale) {
        showToast('success', `Sale ${data.sale.invoiceNumber} completed!`)
        setActiveReceipt(data.sale)
        setCart([])
        setTenderCash('')
        setDiscountValue('0')
        setDiscountMode('PERCENT')
        setCustomerName('Walk-in Customer')
        setCustomerPhone('')
        loadTodaySales()
      } else {
        showToast('error', data.error || 'Failed to complete sale.')
      }
    } catch {
      showToast('error', 'Network error during checkout.')
    } finally {
      setIsCheckingOut(false)
    }
  }

  // Keep ref pointing to latest handleCheckout
  useEffect(() => {
    handleCheckoutRef.current = handleCheckout
  })

  useEffect(() => {
    function handleKeyDown(e: KeyboardEvent) {
      if (e.key === 'F2') {
        e.preventDefault()
        handleCheckoutRef.current?.()
      } else if (e.key === 'F1') {
        e.preventDefault()
        searchInputRef.current?.focus()
      }
    }
    window.addEventListener('keydown', handleKeyDown)
    return () => window.removeEventListener('keydown', handleKeyDown)
  }, [])

  const paymentMethods = [
    { value: 'CASH' as const, label: 'Cash', icon: Banknote },
    { value: 'BKASH' as const, label: 'bKash', icon: Smartphone },
    { value: 'BANK' as const, label: 'Card/Bank', icon: Landmark },
  ]

  return (
    <div className="min-h-screen bg-gradient-to-br from-slate-950 via-slate-900 to-slate-950 text-slate-100 flex flex-col font-sans">
      <ToastContainer toasts={toasts} onDismiss={dismissToast} />

      {/* Top POS Header */}
      <header className="bg-gradient-to-r from-slate-950 via-slate-900 to-slate-950 border-b border-slate-800/80 px-4 py-2 flex items-center justify-between shrink-0 no-print">
        <div className="flex items-center gap-3">
          <Link
            href="/"
            className="p-1.5 rounded-lg bg-slate-800/60 hover:bg-slate-700 text-slate-300 transition-all hover:scale-105"
            title="Back to Dashboard"
          >
            <ArrowLeft className="w-4 h-4" />
          </Link>
          <div className="flex items-center gap-2.5">
            <div className="w-9 h-9 rounded-xl bg-gradient-to-br from-sky-500 to-indigo-600 text-white flex items-center justify-center text-[10px] font-black tracking-tight shadow-lg shadow-sky-500/20">
              POS
            </div>
            <div>
              <div className="text-sm font-black tracking-wide text-white flex items-center gap-2">
                <span>BMH Pharmacy</span>
                <span className="text-[9px] px-2 py-0.5 rounded-full bg-emerald-500/15 text-emerald-400 font-bold border border-emerald-500/25 flex items-center gap-1">
                  <span className="w-1.5 h-1.5 rounded-full bg-emerald-400 animate-pulse" />
                  LIVE
                </span>
              </div>
              <div className="text-[10px] text-slate-500">
                Cashier: <strong className="text-slate-300">{currentUser?.name || 'Staff'}</strong> &bull; {currentUser?.employeeId || 'EMP'}
              </div>
            </div>
          </div>
        </div>

        <div className="flex items-center gap-2">
          <button
            onClick={() => setIsRegisterOpen(true)}
            className="px-3 py-1.5 rounded-xl bg-slate-800/50 hover:bg-slate-800 border border-slate-700/60 text-xs font-semibold text-slate-200 flex items-center gap-2 transition-all cursor-pointer hover:border-slate-600"
          >
            <Receipt className="w-3.5 h-3.5 text-sky-400" />
            <span className="hidden sm:inline text-slate-400">Today:</span>
            <span className="font-mono font-bold text-emerald-400">&#x09F3;{registerStats.totalRevenue.toLocaleString()}</span>
            <span className="text-[10px] px-1.5 py-0.5 rounded-md bg-slate-700/60 text-slate-300 font-mono">{registerStats.totalSalesCount}</span>
          </button>

          {currentUser?.role === 'ADMIN' && (
            <Link
              href="/admin/wholesale"
              className="px-3 py-1.5 rounded-xl bg-sky-600/10 hover:bg-sky-600/20 border border-sky-500/30 text-xs font-semibold text-sky-300 flex items-center gap-1.5 transition-all"
            >
              <Store className="w-3.5 h-3.5" />
              <span className="hidden sm:inline">Wholesale</span>
            </Link>
          )}
        </div>
      </header>

      {/* Main Terminal Body */}
      <div className="flex-1 flex flex-col lg:flex-row overflow-hidden">
        {/* Left Side: Search, OTC & Cart */}
        <div className="flex-1 flex flex-col overflow-hidden">
          {/* Search Bar */}
          <div className="px-3 pt-3 pb-2 bg-slate-950/50 border-b border-slate-800/60 shrink-0 relative" ref={searchContainerRef}>
            <div className="relative">
              <div className="absolute left-3.5 top-1/2 -translate-y-1/2 flex items-center gap-1.5 text-slate-400 pointer-events-none">
                {isSearching ? (
                  <div className="w-4 h-4 border-2 border-sky-400 border-t-transparent rounded-full animate-spin" />
                ) : (
                  <Search className="w-4 h-4 text-sky-400" />
                )}
              </div>
              <input
                ref={searchInputRef}
                type="text"
                autoFocus
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
                onKeyDown={handleSearchKeyDown}
                placeholder="Search medicine or scan barcode... (F1)"
                className="w-full h-11 pl-11 pr-20 text-sm font-semibold rounded-xl bg-slate-900/80 border border-slate-700/60 text-white placeholder-slate-500 focus:outline-hidden focus:border-sky-500/70 focus:ring-2 focus:ring-sky-500/15 transition-all"
              />
              <div className="absolute right-3 top-1/2 -translate-y-1/2 flex items-center gap-2">
                {searchQuery && (
                  <button
                    onClick={() => { setSearchQuery(''); setDropdownOpen(false); searchInputRef.current?.focus() }}
                    className="p-0.5 text-slate-500 hover:text-slate-300 transition-colors cursor-pointer"
                  >
                    <X className="w-3.5 h-3.5" />
                  </button>
                )}
                <kbd className="hidden sm:inline-flex text-[9px] px-1.5 py-0.5 rounded bg-slate-800 border border-slate-700 text-slate-500 font-mono">F1</kbd>
              </div>
            </div>

            {/* Dropdown results with keyboard nav */}
            {dropdownOpen && searchResults.length > 0 && (
              <div
                ref={dropdownRef}
                className="absolute left-3 right-3 top-full mt-1 bg-slate-900/95 backdrop-blur-lg rounded-2xl shadow-2xl shadow-black/40 border border-slate-700/70 z-40 max-h-80 overflow-y-auto"
              >
                {searchResults.map((med, idx) => (
                  <div
                    key={med.id}
                    data-search-item
                    onClick={() => addToCart(med)}
                    className={`px-3.5 py-2.5 flex items-center justify-between cursor-pointer transition-all border-b border-slate-800/50 last:border-b-0 ${
                      idx === highlightedIdx
                        ? 'bg-sky-600/15 border-l-2 border-l-sky-400'
                        : 'hover:bg-slate-800/60 border-l-2 border-l-transparent'
                    }`}
                  >
                    <div className="min-w-0 flex-1">
                      <div className="font-bold text-sm text-white flex items-center gap-2 flex-wrap">
                        <HighlightText text={med.brandName} query={searchQuery} />
                        <span className="text-xs text-sky-400/80 font-normal">{med.strength}</span>
                        <span className="text-[9px] px-1.5 py-0.5 rounded-md bg-slate-800/80 text-slate-400 font-medium">
                          {med.dosageForm}
                        </span>
                      </div>
                      <div className="text-[11px] text-slate-500 mt-0.5 truncate">
                        <HighlightText text={med.genericName} query={searchQuery} />
                        <span className="text-slate-600"> &bull; </span>
                        <span className="text-slate-500">{med.manufacturer?.name}</span>
                      </div>
                    </div>

                    <div className="text-right font-mono shrink-0 ml-3">
                      <div className="text-sm font-bold text-emerald-400">
                        &#x09F3;{med.mrp ? med.mrp.toFixed(2) : '0.00'}
                      </div>
                      {med.stripPrice ? (
                        <div className="text-[10px] text-slate-500">&#x09F3;{med.stripPrice.toFixed(0)}/strip</div>
                      ) : med.boxPrice ? (
                        <div className="text-[10px] text-slate-500">&#x09F3;{med.boxPrice.toFixed(0)}/box</div>
                      ) : null}
                    </div>
                  </div>
                ))}
                <div className="px-3 py-1.5 text-[10px] text-slate-600 bg-slate-950/50 flex items-center justify-between rounded-b-2xl">
                  <span>&#8593;&#8595; Navigate &bull; Enter Select &bull; Esc Close</span>
                  <span>{searchResults.length} results</span>
                </div>
              </div>
            )}

            {/* Quick OTC Chips */}
            <div className="flex items-center gap-1.5 mt-2 overflow-x-auto pb-0.5 text-xs no-scrollbar">
              <span className="text-[9px] font-bold text-amber-400/80 uppercase tracking-wider shrink-0 flex items-center gap-1 px-2 py-0.5">
                <Zap className="w-3 h-3" /> OTC
              </span>
              {loadingOtc ? (
                <span className="text-[11px] text-slate-500 animate-pulse px-2">Loading...</span>
              ) : otcMedicines.length === 0 ? (
                <span className="text-[11px] text-slate-500 px-2">No OTC items</span>
              ) : (
                otcMedicines.map((med) => (
                  <button
                    key={med.id}
                    type="button"
                    onClick={() => addToCart(med)}
                    title={`${med.brandName} ${med.strength}`}
                    className="group flex items-center gap-1 px-2 py-1 rounded-lg bg-slate-800/50 hover:bg-sky-900/30 text-slate-300 border border-slate-700/50 hover:border-sky-500/40 whitespace-nowrap transition-all cursor-pointer text-[11px] font-medium active:scale-95"
                  >
                    <span className="font-semibold text-slate-200 group-hover:text-sky-300">{med.brandName}</span>
                    {med.strength && med.strength !== 'N/A' && (
                      <span className="text-[9px] text-slate-500">{med.strength}</span>
                    )}
                    <span className="text-[9px] font-bold px-1 rounded bg-emerald-900/40 text-emerald-400/80 border border-emerald-800/40">
                      &#x09F3;{med.mrp?.toFixed(0) || '0'}
                    </span>
                  </button>
                ))
              )}
            </div>
          </div>

          {/* Cart Items */}
          <div className="flex-1 overflow-y-auto">
            {cart.length === 0 ? (
              <div className="flex items-center justify-center h-full">
                <div className="text-center px-6 py-12">
                  <div className="w-16 h-16 rounded-2xl bg-slate-800/30 border border-slate-700/30 text-slate-600 flex items-center justify-center mx-auto mb-4">
                    <ShoppingCart className="w-7 h-7" />
                  </div>
                  <p className="text-base font-bold text-slate-400">Cart is Empty</p>
                  <p className="text-xs text-slate-600 mt-1.5 max-w-xs mx-auto">
                    Search for a medicine, scan a barcode, or tap Quick OTC to start billing.
                  </p>
                  <div className="flex items-center justify-center gap-3 mt-4 text-[10px] text-slate-600">
                    <span className="flex items-center gap-1"><kbd className="px-1.5 py-0.5 rounded bg-slate-800 border border-slate-700 font-mono">F1</kbd> Search</span>
                    <span className="flex items-center gap-1"><kbd className="px-1.5 py-0.5 rounded bg-slate-800 border border-slate-700 font-mono">F2</kbd> Checkout</span>
                    <span className="flex items-center gap-1"><kbd className="px-1.5 py-0.5 rounded bg-slate-800 border border-slate-700 font-mono">&#8593;&#8595;</kbd> Navigate</span>
                  </div>
                </div>
              </div>
            ) : (
              <table className="w-full text-left border-collapse text-xs">
                <thead className="bg-slate-950/60 text-slate-500 sticky top-0 uppercase tracking-wider font-bold border-b border-slate-800/60 z-10 text-[10px]">
                  <tr>
                    <th className="py-2.5 px-3 w-8">#</th>
                    <th className="py-2.5 px-2">Medicine</th>
                    <th className="py-2.5 px-2">Pack</th>
                    <th className="py-2.5 px-2 text-right">Rate</th>
                    <th className="py-2.5 px-2 text-center">Qty</th>
                    <th className="py-2.5 px-2 text-right w-18">Disc %</th>
                    <th className="py-2.5 px-3 text-right">Total</th>
                    <th className="py-2.5 px-2 w-8"></th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-slate-800/40 text-slate-200 font-medium">
                  {cart.map((item, idx) => (
                    <tr
                      key={`${item.medicineId}-${item.unit}-${idx}`}
                      className="hover:bg-slate-800/30 transition-colors group"
                    >
                      <td className="py-2.5 px-3 text-slate-600 font-mono text-[10px]">{idx + 1}</td>
                      <td className="py-2.5 px-2">
                        <div className="font-bold text-[13px] text-white leading-tight">
                          {item.brandName} <span className="text-sky-400/70 text-[11px] font-normal">{item.strength}</span>
                        </div>
                        <div className="text-[10px] text-slate-500 leading-tight mt-0.5">{item.genericName}</div>
                      </td>
                      <td className="py-2.5 px-2">
                        <select
                          value={item.unit}
                          onChange={(e) => changeItemUnit(idx, e.target.value as any)}
                          className="px-1.5 py-1 rounded-lg bg-slate-800/60 border border-slate-700/50 text-[11px] font-semibold text-slate-200 cursor-pointer focus:outline-hidden focus:border-sky-500/50"
                          style={{ minWidth: '70px' }}
                        >
                          <option value="Tablet">Piece</option>
                          <option value="Strip">Strip</option>
                          <option value="Box">Box</option>
                          <option value="Bottle">Bottle</option>
                        </select>
                      </td>
                      <td className="py-2.5 px-2 text-right">
                        <div className="inline-flex items-center gap-0.5 justify-end">
                          <span className="text-slate-500 font-mono text-[11px]">&#x09F3;</span>
                          <input
                            type="number"
                            step="any"
                            min="0"
                            value={item.unitPrice}
                            onChange={(e) => updateItemRate(idx, e.target.value)}
                            className="w-16 px-1.5 py-0.5 rounded bg-slate-800/60 border border-slate-700/50 text-right font-mono font-bold text-slate-200 text-[12px] focus:bg-slate-900 focus:border-sky-500/80 outline-none"
                            title="Click to adjust rate"
                          />
                        </div>
                      </td>
                      <td className="py-2.5 px-2 text-center">
                        <div className="inline-flex items-center rounded-lg bg-slate-800/40 border border-slate-700/40">
                          <button
                            type="button"
                            onClick={() => adjustQuantity(idx, -1)}
                            className="p-1 text-slate-500 hover:text-white transition-colors cursor-pointer hover:bg-slate-700/50 rounded-l-lg"
                          >
                            <Minus className="w-3 h-3" />
                          </button>
                          <input
                            type="number"
                            min={1}
                            value={item.quantity}
                            onChange={(e) => setDirectQuantity(idx, e.target.value)}
                            className="w-9 text-center font-mono font-bold text-[12px] bg-transparent text-white focus:outline-hidden"
                          />
                          <button
                            type="button"
                            onClick={() => adjustQuantity(idx, 1)}
                            className="p-1 text-slate-500 hover:text-white transition-colors cursor-pointer hover:bg-slate-700/50 rounded-r-lg"
                          >
                            <Plus className="w-3 h-3" />
                          </button>
                        </div>
                      </td>
                      <td className="py-2.5 px-2 text-right">
                        <div className="inline-flex items-center gap-0.5 justify-end">
                          <input
                            type="number"
                            min="0"
                            max="100"
                            step="any"
                            value={item.discountPercent !== undefined && item.discountPercent > 0 ? item.discountPercent : ''}
                            onChange={(e) => updateItemDiscountPercent(idx, e.target.value)}
                            placeholder="0"
                            className="w-11 px-1 py-0.5 rounded bg-slate-800/60 border border-slate-700/50 text-right font-mono font-bold text-emerald-400 text-[11px] focus:bg-slate-900 focus:border-emerald-500/80 outline-none"
                            title="Line item discount %"
                          />
                          <span className="text-slate-500 font-mono text-[10px]">%</span>
                        </div>
                      </td>
                      <td className="py-2.5 px-3 text-right">
                        {item.discountAmount > 0 && (
                          <div className="text-[9px] text-slate-500 line-through font-mono">
                            &#x09F3;{(item.unitPrice * item.quantity).toFixed(2)}
                          </div>
                        )}
                        <div className="font-mono font-bold text-emerald-400 text-[13px]">
                          &#x09F3;{item.total.toFixed(2)}
                        </div>
                      </td>
                      <td className="py-2.5 px-2 text-center">
                        <button
                          type="button"
                          onClick={() => removeItem(idx)}
                          className="p-1 text-slate-600 hover:text-rose-400 rounded-lg hover:bg-rose-500/10 cursor-pointer transition-all opacity-0 group-hover:opacity-100"
                        >
                          <Trash2 className="w-3.5 h-3.5" />
                        </button>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            )}
          </div>

          {/* Mobile cart summary bar */}
          {cart.length > 0 && (
            <div className="px-4 py-2 bg-slate-950/70 border-t border-slate-800/60 flex items-center justify-between text-xs shrink-0 lg:hidden">
              <span className="text-slate-400">{cart.length} items</span>
              <div className="flex items-center gap-2">
                {totalDiscount > 0 && (
                  <span className="text-[10px] text-emerald-400 font-mono">Disc: -&#x09F3;{totalDiscount.toFixed(1)}</span>
                )}
                <span className="font-mono font-bold text-lg text-sky-400">&#x09F3;{netPayable.toFixed(2)}</span>
              </div>
            </div>
          )}
        </div>

        {/* Right: Checkout Panel */}
        <div className="w-full lg:w-[340px] xl:w-[380px] bg-slate-950/80 border-t lg:border-t-0 lg:border-l border-slate-800/60 flex flex-col shrink-0">
          <div className="flex-1 overflow-y-auto p-4 space-y-3">
            {/* Customer */}
            <div className="space-y-1.5">
              <span className="text-[10px] font-bold uppercase tracking-wider text-slate-500 flex items-center gap-1">
                <UserCheck className="w-3 h-3 text-slate-500" /> Customer
              </span>
              <div className="grid grid-cols-2 gap-1.5">
                <input
                  type="text"
                  value={customerName}
                  onChange={(e) => setCustomerName(e.target.value)}
                  placeholder="Customer Name"
                  className="px-2.5 py-1.5 text-[11px] rounded-lg bg-slate-900/60 border border-slate-800/60 text-white focus:border-sky-500/50 focus:outline-hidden placeholder-slate-600 transition-colors"
                />
                <input
                  type="text"
                  value={customerPhone}
                  onChange={(e) => setCustomerPhone(e.target.value)}
                  placeholder="Mobile (Optional)"
                  className="px-2.5 py-1.5 text-[11px] rounded-lg bg-slate-900/60 border border-slate-800/60 text-white focus:border-sky-500/50 focus:outline-hidden font-mono placeholder-slate-600 transition-colors"
                />
              </div>
            </div>

            {/* Bill Summary */}
            <div className="p-3.5 bg-gradient-to-b from-slate-900/80 to-slate-900/40 rounded-xl border border-slate-800/50 space-y-2.5 text-xs">
              <div className="flex justify-between text-slate-500">
                <span>Subtotal ({cart.length} items)</span>
                <span className="font-mono font-semibold text-slate-300">&#x09F3;{grossSubtotal.toFixed(2)}</span>
              </div>

              {/* Discount Section */}
              <div className="pt-2 border-t border-slate-800/40 space-y-2">
                <div className="flex items-center justify-between">
                  <div className="flex items-center gap-1.5">
                    <span className="text-slate-400 font-medium">Bill Discount</span>
                    {/* Toggle % vs ৳ */}
                    <div className="inline-flex rounded-lg bg-slate-950 p-0.5 border border-slate-800">
                      <button
                        type="button"
                        onClick={() => {
                          if (discountMode !== 'PERCENT') {
                            setDiscountMode('PERCENT')
                            if (afterItemDiscSubtotal > 0 && parsedVal > 0) {
                              setDiscountValue(String(Math.min(100, Math.round((parsedVal / afterItemDiscSubtotal) * 100 * 10) / 10)))
                            }
                          }
                        }}
                        className={`px-1.5 py-0.5 text-[10px] font-bold rounded-md cursor-pointer transition-all ${
                          discountMode === 'PERCENT'
                            ? 'bg-emerald-600 text-white shadow-xs'
                            : 'text-slate-500 hover:text-slate-300'
                        }`}
                        title="Discount in Percentage"
                      >
                        %
                      </button>
                      <button
                        type="button"
                        onClick={() => {
                          if (discountMode !== 'FLAT') {
                            setDiscountMode('FLAT')
                            if (afterItemDiscSubtotal > 0 && parsedVal > 0) {
                              setDiscountValue(String(billDiscount))
                            }
                          }
                        }}
                        className={`px-1.5 py-0.5 text-[10px] font-bold rounded-md cursor-pointer transition-all ${
                          discountMode === 'FLAT'
                            ? 'bg-emerald-600 text-white shadow-xs'
                            : 'text-slate-500 hover:text-slate-300'
                        }`}
                        title="Discount in Taka"
                      >
                        &#x09F3;
                      </button>
                    </div>
                  </div>

                  <div className="flex items-center gap-1">
                    {discountMode === 'FLAT' && (
                      <span className="text-slate-500 font-mono text-[11px]">&#x09F3;</span>
                    )}
                    <input
                      type="number"
                      step="any"
                      min={0}
                      max={discountMode === 'PERCENT' ? 100 : grossSubtotal}
                      value={discountValue}
                      onChange={(e) => setDiscountValue(e.target.value)}
                      placeholder="0"
                      className="w-20 px-2 py-1 text-right font-mono font-bold text-[12px] rounded-lg bg-slate-950/70 border border-slate-700/50 text-emerald-400 focus:outline-hidden focus:border-emerald-500 transition-colors"
                    />
                    {discountMode === 'PERCENT' && (
                      <span className="text-emerald-400 font-mono font-bold text-[11px]">%</span>
                    )}
                  </div>
                </div>

                {/* Quick % Discount Presets */}
                <div className="flex items-center gap-1 flex-wrap">
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
                        className={`px-2 py-0.5 rounded-md text-[10px] font-mono font-bold cursor-pointer transition-all border ${
                          isSelected
                            ? 'bg-emerald-500/25 border-emerald-500/60 text-emerald-300 shadow-xs'
                            : 'bg-slate-800/50 border-slate-700/40 text-slate-400 hover:text-slate-200 hover:bg-slate-800'
                        }`}
                      >
                        {pct === 0 ? '0%' : `${pct}%`}
                      </button>
                    )
                  })}
                </div>

                {/* Total Discount Summary Badge */}
                {totalDiscount > 0 && (
                  <div className="flex items-center justify-between text-[11px] text-emerald-400/90 bg-emerald-950/25 px-2.5 py-1.5 rounded-lg border border-emerald-500/20 font-mono">
                    <span>Total Discount:</span>
                    <span className="font-bold">
                      -&#x09F3;{totalDiscount.toFixed(2)}
                      {grossSubtotal > 0 && ` (${((totalDiscount / grossSubtotal) * 100).toFixed(1)}%)`}
                    </span>
                  </div>
                )}
              </div>

              <div className="pt-2.5 border-t border-slate-700/40 flex items-baseline justify-between">
                <span className="font-bold text-slate-300 text-xs">TOTAL</span>
                <span className="font-mono font-black text-2xl bg-gradient-to-r from-sky-400 to-indigo-400 bg-clip-text text-transparent">
                  &#x09F3;{netPayable.toFixed(2)}
                </span>
              </div>
            </div>

            {/* Payment */}
            <div className="p-3.5 bg-slate-900/40 rounded-xl border border-slate-800/40 space-y-2.5 text-xs">
              <div className="flex items-center justify-between">
                <span className="font-semibold text-slate-400">Received</span>
                <input
                  type="number"
                  step="any"
                  value={tenderCash}
                  onChange={(e) => setTenderCash(e.target.value)}
                  placeholder={netPayable > 0 ? String(netPayable) : '0.00'}
                  className="w-28 px-2.5 py-1.5 text-right font-mono font-bold text-sm rounded-lg bg-slate-950/60 border border-slate-700/40 text-white focus:border-emerald-500/50 focus:outline-hidden transition-colors"
                />
              </div>

              <div className="grid grid-cols-4 gap-1">
                <button
                  type="button"
                  onClick={() => setTenderCash(String(netPayable))}
                  className="py-1 px-1.5 rounded-lg bg-slate-800/50 hover:bg-emerald-900/30 hover:border-emerald-500/30 text-slate-300 font-mono text-[10px] font-bold transition-all cursor-pointer border border-slate-700/30"
                >
                  Exact
                </button>
                {[100, 500, 1000].map((amt) => (
                  <button
                    key={amt}
                    type="button"
                    onClick={() => setTenderCash(String(amt))}
                    className="py-1 px-1.5 rounded-lg bg-slate-800/50 hover:bg-slate-700/50 text-slate-300 font-mono text-[10px] font-bold transition-all cursor-pointer border border-slate-700/30"
                  >
                    &#x09F3;{amt}
                  </button>
                ))}
              </div>

              <div className="p-2.5 bg-emerald-950/20 border border-emerald-500/15 rounded-lg flex items-center justify-between">
                <span className="font-semibold text-emerald-400/80 text-[11px]">Change</span>
                <span className="font-mono font-black text-lg text-emerald-400">
                  &#x09F3;{changeDue.toFixed(2)}
                </span>
              </div>

              <div className="grid grid-cols-3 gap-1.5 pt-0.5">
                {paymentMethods.map(({ value, label, icon: Icon }) => (
                  <button
                    key={value}
                    type="button"
                    onClick={() => setPaymentMethod(value)}
                    className={`py-2 px-1 rounded-xl text-[11px] font-bold transition-all cursor-pointer flex flex-col items-center gap-1 ${
                      paymentMethod === value
                        ? 'bg-gradient-to-b from-sky-600 to-sky-700 text-white shadow-lg shadow-sky-500/20 scale-[1.02]'
                        : 'bg-slate-800/40 text-slate-500 hover:text-slate-300 hover:bg-slate-800/60 border border-slate-700/30'
                    }`}
                  >
                    <Icon className="w-3.5 h-3.5" />
                    {label}
                  </button>
                ))}
              </div>
            </div>
          </div>

          {/* Complete Sale Button */}
          <div className="p-3 border-t border-slate-800/50 bg-slate-950/90 shrink-0 space-y-1.5">
            <button
              type="button"
              disabled={isCheckingOut || cart.length === 0}
              onClick={handleCheckout}
              className="w-full py-3 px-4 rounded-xl bg-gradient-to-r from-emerald-600 to-emerald-500 hover:from-emerald-500 hover:to-emerald-400 text-white font-black text-sm shadow-lg shadow-emerald-500/20 transition-all disabled:opacity-30 disabled:shadow-none flex items-center justify-center gap-2 cursor-pointer active:scale-[0.98]"
            >
              <CheckCircle2 className="w-4 h-4" />
              <span>{isCheckingOut ? 'Processing...' : 'Complete Sale'}</span>
              <kbd className="text-[9px] px-1.5 py-0.5 rounded bg-emerald-700/50 text-emerald-200 font-mono ml-1">F2</kbd>
            </button>
          </div>
        </div>
      </div>

      {/* Thermal Receipt Modal */}
      {activeReceipt && (
        <ThermalReceiptModal
          sale={activeReceipt}
          onClose={() => {
            setActiveReceipt(null)
            searchInputRef.current?.focus()
          }}
        />
      )}

      {/* Sales Register Drawer */}
      <PosRegisterDrawer
        isOpen={isRegisterOpen}
        onClose={() => setIsRegisterOpen(false)}
        sales={todaySales}
        stats={registerStats}
        isAdmin={currentUser?.role === 'ADMIN'}
        onEditSale={(sale) => {
          setIsRegisterOpen(false)
          setEditingSale(sale)
        }}
        onSelectSaleForReprint={(sale) => {
          setIsRegisterOpen(false)
          setActiveReceipt(sale)
        }}
      />

      {/* Admin Sale Edit Modal */}
      {editingSale && (
        <SaleEditModal
          sale={editingSale}
          onClose={() => setEditingSale(null)}
          onSaved={(updated) => {
            setEditingSale(null)
            showToast('success', `Sale ${updated.invoiceNumber} updated!`)
            loadTodaySales()
          }}
        />
      )}
    </div>
  )
}
