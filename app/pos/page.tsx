'use client'

import React, { useState, useEffect, useRef } from 'react'
import Link from 'next/link'
import {
  Search,
  Plus,
  Minus,
  Trash2,
  Printer,
  CreditCard,
  DollarSign,
  Smartphone,
  Store,
  CheckCircle2,
  Clock,
  ArrowLeft,
  X,
  UserCheck,
  Shield,
  Receipt,
  ScanBarcode,
  Sparkles,
} from 'lucide-react'
import { ToastContainer, ToastMessage } from '@/components/Toast'
import { ThermalReceiptModal, ReceiptSaleData } from '@/components/ThermalReceiptModal'
import { PosRegisterDrawer } from '@/components/PosRegisterDrawer'

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
  discountAmount: number
  total: number
  mrp?: number | null
  stripPrice?: number | null
  boxPrice?: number | null
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
  const searchInputRef = useRef<HTMLInputElement>(null)
  const searchContainerRef = useRef<HTMLDivElement>(null)

  // Cart
  const [cart, setCart] = useState<CartItem[]>([])

  // Checkout
  const [customerName, setCustomerName] = useState('Walk-in Customer')
  const [customerPhone, setCustomerPhone] = useState('')
  const [discountAmount, setDiscountAmount] = useState<string>('0')
  const [tenderCash, setTenderCash] = useState<string>('')
  const [paymentMethod, setPaymentMethod] = useState<'CASH' | 'BKASH' | 'CARD'>('CASH')
  const [isCheckingOut, setIsCheckingOut] = useState(false)

  // Modals & Drawers
  const [activeReceipt, setActiveReceipt] = useState<ReceiptSaleData | null>(null)
  const [isRegisterOpen, setIsRegisterOpen] = useState(false)
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

  // Typeahead medicine search & barcode scanner
  useEffect(() => {
    if (!searchQuery || searchQuery.trim().length < 2) {
      setSearchResults([])
      setDropdownOpen(false)
      return
    }

    const timer = setTimeout(async () => {
      setIsSearching(true)
      try {
        const res = await fetch(`/api/pos/medicines?q=${encodeURIComponent(searchQuery.trim())}&limit=12`)
        const data = await res.json()
        if (res.ok && data.medicines) {
          setSearchResults(data.medicines)
          setDropdownOpen(true)
        }
      } catch {
        // ignore
      } finally {
        setIsSearching(false)
      }
    }, 200)

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

  // Global Keyboard Shortcuts (F2 for checkout, Escape, F1/focus search)
  useEffect(() => {
    function handleKeyDown(e: KeyboardEvent) {
      if (e.key === 'F2') {
        e.preventDefault()
        handleCheckout()
      } else if (e.key === 'F1') {
        e.preventDefault()
        searchInputRef.current?.focus()
      }
    }
    window.addEventListener('keydown', handleKeyDown)
    return () => window.removeEventListener('keydown', handleKeyDown)
  }, [cart, tenderCash, discountAmount, paymentMethod, customerName])

  // Add medicine to cart
  const addToCart = (med: Medicine, defaultUnit?: 'Tablet' | 'Strip' | 'Box' | 'Bottle') => {
    let unit: 'Tablet' | 'Strip' | 'Box' | 'Bottle' = defaultUnit || 'Tablet'
    if (!defaultUnit) {
      if (med.dosageForm.toLowerCase().includes('syrup') || med.dosageForm.toLowerCase().includes('drop')) {
        unit = 'Bottle'
      } else if (med.dosageForm.toLowerCase().includes('capsule')) {
        unit = 'Tablet'
      } else {
        unit = 'Tablet'
      }
    }

    let unitPrice = med.mrp || 5.0
    if (unit === 'Strip' && med.stripPrice) unitPrice = med.stripPrice
    if (unit === 'Box' && med.boxPrice) unitPrice = med.boxPrice

    // Check if already in cart with same unit
    const existingIndex = cart.findIndex((item) => item.medicineId === med.id && item.unit === unit)
    if (existingIndex > -1) {
      const updated = [...cart]
      updated[existingIndex].quantity += 1
      updated[existingIndex].total = Math.round(updated[existingIndex].unitPrice * updated[existingIndex].quantity * 100) / 100
      setCart(updated)
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
    searchInputRef.current?.focus()
  }

  // Update item unit (Tablet -> Strip -> Box)
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
    updated[index] = {
      ...item,
      unit: newUnit,
      unitPrice: price,
      total: Math.round(price * item.quantity * 100) / 100,
    }
    setCart(updated)
  }

  // Adjust item quantity
  const adjustQuantity = (index: number, delta: number) => {
    const updated = [...cart]
    const newQty = Math.max(1, updated[index].quantity + delta)
    updated[index].quantity = newQty
    updated[index].total = Math.round(updated[index].unitPrice * newQty * 100) / 100
    setCart(updated)
  }

  const setDirectQuantity = (index: number, val: string) => {
    const parsed = parseInt(val, 10) || 1
    const updated = [...cart]
    updated[index].quantity = Math.max(1, parsed)
    updated[index].total = Math.round(updated[index].unitPrice * Math.max(1, parsed) * 100) / 100
    setCart(updated)
  }

  const removeItem = (index: number) => {
    setCart(cart.filter((_, i) => i !== index))
  }

  // Calculations
  const grossSubtotal = cart.reduce((sum, item) => sum + item.total, 0)
  const parsedDiscount = parseFloat(discountAmount) || 0
  const netPayable = Math.max(0, Math.round((grossSubtotal - parsedDiscount) * 100) / 100)
  const parsedTender = parseFloat(tenderCash) || (tenderCash === '' ? netPayable : 0)
  const changeDue = Math.max(0, Math.round((parsedTender - netPayable) * 100) / 100)

  // Handle Checkout & Sale Completion
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
          discountAmount: parsedDiscount,
          paidAmount: parsedTender,
          paymentMethod,
        }),
      })

      const data = await res.json()
      if (res.ok && data.sale) {
        showToast('success', `Sale ${data.sale.invoiceNumber} completed!`)
        setActiveReceipt(data.sale)
        // Reset cart and checkout states
        setCart([])
        setTenderCash('')
        setDiscountAmount('0')
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

  return (
    <div className="min-h-screen bg-slate-900 text-slate-100 flex flex-col font-sans">
      <ToastContainer toasts={toasts} onDismiss={dismissToast} />

      {/* Top POS Header */}
      <header className="bg-slate-950 border-b border-slate-800 px-4 py-2.5 flex items-center justify-between shrink-0 no-print">
        <div className="flex items-center gap-3">
          <Link
            href="/"
            className="p-1.5 rounded-lg bg-slate-800 hover:bg-slate-700 text-slate-300 transition-colors"
            title="Back to Mobile Staff view"
          >
            <ArrowLeft className="w-4 h-4" />
          </Link>
          <div className="flex items-center gap-2">
            <div className="w-8 h-8 rounded-lg bg-sky-500/20 border border-sky-500/40 text-sky-400 flex items-center justify-center font-black">
              POS
            </div>
            <div>
              <div className="text-sm font-black tracking-wide uppercase text-white flex items-center gap-2">
                <span>Pharmacy Retail POS</span>
                <span className="text-[10px] px-2 py-0.5 rounded-full bg-emerald-500/20 text-emerald-400 font-bold border border-emerald-500/30">
                  Counter Active
                </span>
              </div>
              <div className="text-[10px] text-slate-400">
                Cashier: <strong className="text-slate-200">{currentUser?.name || 'Staff'}</strong> ({currentUser?.employeeId || 'EMP'})
              </div>
            </div>
          </div>
        </div>

        {/* Right Side Stats & Quick Links */}
        <div className="flex items-center gap-3">
          {/* Today's Register Counter Button */}
          <button
            onClick={() => setIsRegisterOpen(true)}
            className="px-3 py-1.5 rounded-xl bg-slate-800/90 hover:bg-slate-800 border border-slate-700 text-xs font-semibold text-slate-200 flex items-center gap-2 transition-colors cursor-pointer"
          >
            <Receipt className="w-4 h-4 text-sky-400" />
            <span>Today&apos;s Sales:</span>
            <span className="font-mono font-bold text-emerald-400">৳ {registerStats.totalRevenue.toLocaleString()}</span>
            <span className="text-[10px] px-1.5 py-0.5 rounded bg-slate-700 text-slate-300">{registerStats.totalSalesCount}</span>
          </button>

          {/* Quick link to wholesale or admin */}
          {currentUser?.role === 'ADMIN' && (
            <Link
              href="/admin/wholesale"
              className="px-3 py-1.5 rounded-xl bg-sky-600/20 hover:bg-sky-600/30 border border-sky-500/40 text-xs font-semibold text-sky-300 flex items-center gap-1.5 transition-colors"
            >
              <Store className="w-4 h-4" />
              <span className="hidden sm:inline">Wholesale Portal</span>
            </Link>
          )}
        </div>
      </header>

      {/* Main Terminal Body */}
      <div className="flex-1 flex flex-col lg:flex-row overflow-hidden">
        {/* Left Side: Search, OTC Chips & Cart (65% width) */}
        <div className="flex-1 flex flex-col border-r border-slate-800 bg-slate-900/90 overflow-hidden">
          {/* Search & Barcode Input Bar */}
          <div className="p-3 bg-slate-950 border-b border-slate-800 shrink-0" ref={searchContainerRef}>
            <div className="relative">
              <div className="absolute left-3.5 top-3 flex items-center gap-1.5 text-slate-400 pointer-events-none">
                <Search className="w-4 h-4 text-sky-400" />
                <ScanBarcode className="w-3.5 h-3.5 text-slate-500" />
              </div>
              <input
                ref={searchInputRef}
                type="text"
                autoFocus
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
                placeholder="Scan Barcode or Search Medicine Name (e.g. Napa, Seclo, Monas) [F1]..."
                className="w-full h-11 pl-12 pr-4 text-sm font-semibold rounded-xl bg-slate-900 border border-slate-700 text-white placeholder-slate-500 focus:outline-hidden focus:border-sky-500 focus:ring-2 focus:ring-sky-500/20"
              />
              {isSearching && (
                <span className="absolute right-3.5 top-3.5 text-xs text-sky-400 animate-pulse font-medium">
                  Searching...
                </span>
              )}
            </div>

            {/* Dropdown search results */}
            {dropdownOpen && searchResults.length > 0 && (
              <div className="absolute left-4 right-4 lg:right-auto lg:w-[60%] top-28 bg-slate-900 rounded-2xl shadow-2xl border border-slate-700 z-40 max-h-80 overflow-y-auto divide-y divide-slate-800">
                {searchResults.map((med) => (
                  <div
                    key={med.id}
                    onClick={() => addToCart(med)}
                    className="p-3 hover:bg-slate-800/80 transition-colors flex items-center justify-between cursor-pointer"
                  >
                    <div>
                      <div className="font-bold text-sm text-white flex items-center gap-2">
                        <span>{med.brandName}</span>
                        <span className="text-xs text-sky-400 font-normal">{med.strength}</span>
                        <span className="text-[10px] px-2 py-0.5 rounded bg-slate-800 text-slate-300 font-medium">
                          {med.dosageForm}
                        </span>
                      </div>
                      <div className="text-xs text-slate-400 mt-0.5">
                        {med.genericName} • {med.manufacturer?.name}
                      </div>
                    </div>

                    <div className="text-right font-mono">
                      <div className="text-sm font-bold text-emerald-400">
                        ৳ {med.mrp ? med.mrp.toFixed(2) : '5.00'}/unit
                      </div>
                      {med.boxPrice && (
                        <div className="text-[11px] text-slate-400">
                          ৳ {med.boxPrice.toFixed(0)}/box
                        </div>
                      )}
                    </div>
                  </div>
                ))}
              </div>
            )}

            {/* Quick OTC Chips Row loaded from real database */}
            <div className="flex items-center gap-1.5 mt-2.5 overflow-x-auto pb-1 text-xs no-scrollbar">
              <span className="text-[10px] font-bold text-amber-400 uppercase tracking-wider shrink-0 flex items-center gap-1 bg-amber-950/40 border border-amber-800/60 px-2 py-1 rounded-lg">
                <Sparkles className="w-3 h-3 text-amber-400" /> Fast OTC:
              </span>
              {loadingOtc ? (
                <span className="text-[11px] text-slate-500 animate-pulse px-2">Loading OTC...</span>
              ) : otcMedicines.length === 0 ? (
                <span className="text-[11px] text-slate-500 px-2">No OTC items found</span>
              ) : (
                otcMedicines.map((med) => (
                  <button
                    key={med.id}
                    type="button"
                    onClick={() => addToCart(med)}
                    title={`Add ${med.brandName} (${med.strength}) to cart. Unit MRP: ৳${med.mrp || 0}`}
                    className="group flex items-center gap-1.5 px-2.5 py-1 rounded-lg bg-slate-800 hover:bg-sky-950/60 hover:border-sky-500/60 text-slate-300 border border-slate-700 whitespace-nowrap transition-all cursor-pointer text-xs font-medium active:scale-95"
                  >
                    <span className="font-bold text-slate-200 group-hover:text-sky-300">
                      {med.brandName}
                    </span>
                    {med.strength && med.strength !== 'N/A' && (
                      <span className="text-[10px] text-slate-400 group-hover:text-sky-200">
                        {med.strength}
                      </span>
                    )}
                    <span className="text-[10px] font-bold px-1.5 py-0.2 rounded bg-emerald-950/80 text-emerald-300 border border-emerald-800/60">
                      ৳{med.mrp?.toFixed(1) || '0'}
                    </span>
                  </button>
                ))
              )}
            </div>
          </div>

          {/* Cart Items Table */}
          <div className="flex-1 overflow-y-auto">
            <table className="w-full text-left border-collapse text-xs">
              <thead className="bg-slate-950/80 text-slate-400 sticky top-0 uppercase tracking-wider font-bold border-b border-slate-800 z-10">
                <tr>
                  <th className="py-2.5 px-4">Medicine</th>
                  <th className="py-2.5 px-3">Pack Unit</th>
                  <th className="py-2.5 px-3 text-right">Unit Rate</th>
                  <th className="py-2.5 px-3 text-center">Qty</th>
                  <th className="py-2.5 px-4 text-right">Line Total</th>
                  <th className="py-2.5 px-3 text-center"></th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-800 text-slate-200 font-medium">
                {cart.length === 0 ? (
                  <tr>
                    <td colSpan={6} className="text-center py-24 text-slate-500">
                      <div className="w-12 h-12 rounded-2xl bg-slate-800/80 text-slate-400 flex items-center justify-center mx-auto mb-3">
                        <ScanBarcode className="w-6 h-6" />
                      </div>
                      <p className="text-sm font-semibold text-slate-300">Point of Sale Cart is Empty</p>
                      <p className="text-xs text-slate-500 mt-1">
                        Scan a medicine barcode or use the search bar above to begin billing.
                      </p>
                    </td>
                  </tr>
                ) : (
                  cart.map((item, idx) => (
                    <tr key={idx} className="hover:bg-slate-800/50 transition-colors">
                      <td className="py-2.5 px-4">
                        <div className="font-bold text-sm text-white">
                          {item.brandName} <span className="text-sky-400 text-xs">{item.strength}</span>
                        </div>
                        <div className="text-[11px] text-slate-400">{item.genericName}</div>
                      </td>

                      {/* Pack Unit Selector */}
                      <td className="py-2.5 px-3">
                        <select
                          value={item.unit}
                          onChange={(e) => changeItemUnit(idx, e.target.value as any)}
                          className="px-2 py-1 rounded-lg bg-slate-800 border border-slate-700 text-xs font-semibold text-slate-200 cursor-pointer"
                        >
                          <option value="Tablet">Tablet / Unit</option>
                          <option value="Strip">Strip</option>
                          <option value="Box">Box</option>
                          <option value="Bottle">Bottle</option>
                        </select>
                      </td>

                      {/* Unit Rate */}
                      <td className="py-2.5 px-3 text-right font-mono text-slate-300">
                        ৳ {item.unitPrice.toFixed(2)}
                      </td>

                      {/* Quantity Selector with +/- */}
                      <td className="py-2.5 px-3 text-center">
                        <div className="inline-flex items-center rounded-lg bg-slate-800 border border-slate-700">
                          <button
                            type="button"
                            onClick={() => adjustQuantity(idx, -1)}
                            className="p-1 text-slate-400 hover:text-white transition-colors cursor-pointer"
                          >
                            <Minus className="w-3.5 h-3.5" />
                          </button>
                          <input
                            type="number"
                            min={1}
                            value={item.quantity}
                            onChange={(e) => setDirectQuantity(idx, e.target.value)}
                            className="w-10 text-center font-mono font-bold text-xs bg-transparent text-white focus:outline-hidden"
                          />
                          <button
                            type="button"
                            onClick={() => adjustQuantity(idx, 1)}
                            className="p-1 text-slate-400 hover:text-white transition-colors cursor-pointer"
                          >
                            <Plus className="w-3.5 h-3.5" />
                          </button>
                        </div>
                      </td>

                      {/* Line Total */}
                      <td className="py-2.5 px-4 text-right font-mono font-bold text-emerald-400 text-sm">
                        ৳ {item.total.toFixed(2)}
                      </td>

                      {/* Remove */}
                      <td className="py-2.5 px-3 text-center">
                        <button
                          type="button"
                          onClick={() => removeItem(idx)}
                          className="p-1 text-slate-500 hover:text-rose-400 rounded-lg hover:bg-slate-800 cursor-pointer transition-colors"
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

        {/* Right Side: Checkout & Payment Terminal (35% width) */}
        <div className="w-full lg:w-96 bg-slate-950 border-t lg:border-t-0 lg:border-l border-slate-800 p-5 flex flex-col justify-between shrink-0 space-y-4">
          <div className="space-y-4">
            {/* Customer Details */}
            <div className="space-y-2">
              <span className="text-[11px] font-bold uppercase tracking-wider text-slate-400 flex items-center gap-1">
                <UserCheck className="w-3.5 h-3.5 text-sky-400" /> Customer Information
              </span>
              <div className="grid grid-cols-2 gap-2">
                <input
                  type="text"
                  value={customerName}
                  onChange={(e) => setCustomerName(e.target.value)}
                  placeholder="Customer Name"
                  className="px-3 py-1.5 text-xs rounded-xl bg-slate-900 border border-slate-800 text-white focus:border-sky-500 focus:outline-hidden"
                />
                <input
                  type="text"
                  value={customerPhone}
                  onChange={(e) => setCustomerPhone(e.target.value)}
                  placeholder="Mobile (Optional)"
                  className="px-3 py-1.5 text-xs rounded-xl bg-slate-900 border border-slate-800 text-white focus:border-sky-500 focus:outline-hidden font-mono"
                />
              </div>
            </div>

            {/* Bill Summary Calculations */}
            <div className="p-4 bg-slate-900 rounded-2xl border border-slate-800 space-y-2.5 text-xs">
              <div className="flex justify-between text-slate-400">
                <span>Subtotal ({cart.length} items):</span>
                <span className="font-mono font-semibold text-slate-200">
                  ৳ {grossSubtotal.toFixed(2)}
                </span>
              </div>

              {/* Discount Input */}
              <div className="flex items-center justify-between pt-1 border-t border-slate-800">
                <span className="text-slate-400">Discount (৳):</span>
                <input
                  type="number"
                  min={0}
                  value={discountAmount}
                  onChange={(e) => setDiscountAmount(e.target.value)}
                  className="w-24 px-2.5 py-1 text-right font-mono font-bold rounded-lg bg-slate-950 border border-slate-700 text-emerald-400 focus:outline-hidden"
                />
              </div>

              {/* Net Payable Display */}
              <div className="pt-2 border-t border-slate-800 flex items-baseline justify-between">
                <span className="font-bold text-slate-300">Total Payable:</span>
                <span className="font-mono font-black text-2xl text-sky-400">
                  ৳ {netPayable.toFixed(2)}
                </span>
              </div>
            </div>

            {/* Cash Tender & Change Due */}
            <div className="p-4 bg-slate-900 rounded-2xl border border-slate-800 space-y-3 text-xs">
              <div className="flex items-center justify-between">
                <span className="font-bold text-slate-300">Tender Cash (Received):</span>
                <input
                  type="number"
                  step="any"
                  value={tenderCash}
                  onChange={(e) => setTenderCash(e.target.value)}
                  placeholder={netPayable > 0 ? String(netPayable) : '0.00'}
                  className="w-32 px-3 py-1.5 text-right font-mono font-bold text-sm rounded-xl bg-slate-950 border border-slate-700 text-white focus:border-emerald-500 focus:outline-hidden"
                />
              </div>

              {/* Quick Cash Buttons */}
              <div className="grid grid-cols-4 gap-1.5">
                <button
                  type="button"
                  onClick={() => setTenderCash(String(netPayable))}
                  className="py-1 px-2 rounded-lg bg-slate-800 hover:bg-slate-700 text-slate-200 font-mono text-[11px] font-bold transition-colors cursor-pointer"
                >
                  Exact
                </button>
                {[100, 500, 1000].map((amt) => (
                  <button
                    key={amt}
                    type="button"
                    onClick={() => setTenderCash(String(amt))}
                    className="py-1 px-2 rounded-lg bg-slate-800 hover:bg-slate-700 text-slate-200 font-mono text-[11px] font-bold transition-colors cursor-pointer"
                  >
                    ৳{amt}
                  </button>
                ))}
              </div>

              {/* Big Change Display */}
              <div className="p-3 bg-emerald-950/40 border border-emerald-500/30 rounded-xl flex items-center justify-between">
                <span className="font-bold text-emerald-300 text-xs">Return Change:</span>
                <span className="font-mono font-black text-xl text-emerald-400">
                  ৳ {changeDue.toFixed(2)}
                </span>
              </div>

              {/* Payment Method Selector */}
              <div className="grid grid-cols-3 gap-2 pt-1">
                {(['CASH', 'BKASH', 'CARD'] as const).map((method) => (
                  <button
                    key={method}
                    type="button"
                    onClick={() => setPaymentMethod(method)}
                    className={`py-2 px-1 rounded-xl text-xs font-bold transition-all cursor-pointer ${
                      paymentMethod === method
                        ? 'bg-sky-600 text-white shadow-md'
                        : 'bg-slate-800 text-slate-400 hover:text-white'
                    }`}
                  >
                    {method}
                  </button>
                ))}
              </div>
            </div>
          </div>

          {/* Complete Sale Button */}
          <div className="space-y-2">
            <button
              type="button"
              disabled={isCheckingOut || cart.length === 0}
              onClick={handleCheckout}
              className="w-full py-3.5 px-4 rounded-2xl bg-emerald-600 hover:bg-emerald-500 text-white font-black text-base shadow-lg transition-all disabled:opacity-40 flex items-center justify-center gap-2 cursor-pointer"
            >
              <CheckCircle2 className="w-5 h-5" />
              <span>{isCheckingOut ? 'Processing...' : 'Complete Sale & Print [F2]'}</span>
            </button>

            <div className="text-center text-[10px] text-slate-500">
              Shortcut: <strong>F2</strong> to complete sale • <strong>F1</strong> to search
            </div>
          </div>
        </div>
      </div>

      {/* Thermal Receipt Print Modal */}
      {activeReceipt && (
        <ThermalReceiptModal
          sale={activeReceipt}
          onClose={() => {
            setActiveReceipt(null)
            searchInputRef.current?.focus()
          }}
        />
      )}

      {/* Daily Sales Register Drawer */}
      <PosRegisterDrawer
        isOpen={isRegisterOpen}
        onClose={() => setIsRegisterOpen(false)}
        sales={todaySales}
        stats={registerStats}
        onSelectSaleForReprint={(sale) => {
          setIsRegisterOpen(false)
          setActiveReceipt(sale)
        }}
      />
    </div>
  )
}
