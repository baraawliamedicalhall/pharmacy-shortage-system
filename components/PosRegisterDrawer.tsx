'use client'

import React from 'react'
import { X, Printer, TrendingUp, DollarSign, Smartphone, Clock, Receipt } from 'lucide-react'
import { ReceiptSaleData } from './ThermalReceiptModal'

interface PosRegisterDrawerProps {
  isOpen: boolean
  onClose: () => void
  sales: ReceiptSaleData[]
  stats: {
    date: string
    totalSalesCount: number
    totalRevenue: number
    totalCash: number
    totalBkash: number
  }
  onSelectSaleForReprint: (sale: ReceiptSaleData) => void
}

export function PosRegisterDrawer({
  isOpen,
  onClose,
  sales,
  stats,
  onSelectSaleForReprint,
}: PosRegisterDrawerProps) {
  if (!isOpen) return null

  return (
    <div className="fixed inset-0 z-50 overflow-hidden bg-slate-950/50 backdrop-blur-xs flex justify-end">
      <div className="w-full max-w-md bg-white h-full shadow-2xl flex flex-col animate-in slide-in-from-right duration-200">
        {/* Drawer Header */}
        <div className="px-5 py-4 bg-slate-900 text-white flex items-center justify-between shrink-0">
          <div>
            <div className="flex items-center gap-2">
              <Receipt className="w-4 h-4 text-sky-400" />
              <h2 className="font-bold text-sm">Today&apos;s POS Register</h2>
            </div>
            <p className="text-[11px] text-slate-400">Date: {stats.date}</p>
          </div>
          <button
            onClick={onClose}
            className="p-1.5 rounded-lg text-slate-400 hover:text-white hover:bg-slate-800 transition-colors cursor-pointer"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        {/* Register Totals */}
        <div className="p-4 bg-slate-50 border-b border-slate-200 grid grid-cols-2 gap-3 shrink-0">
          <div className="p-3 bg-white rounded-xl border border-slate-200 shadow-xs">
            <span className="text-[10px] font-bold uppercase tracking-wider text-slate-500 flex items-center gap-1">
              <TrendingUp className="w-3.5 h-3.5 text-sky-600" /> Total Sales
            </span>
            <div className="text-xl font-black font-mono text-slate-900 mt-1">
              ৳ {stats.totalRevenue.toLocaleString('en-US', { minimumFractionDigits: 2 })}
            </div>
            <div className="text-[10px] text-slate-400">{stats.totalSalesCount} receipts</div>
          </div>

          <div className="p-3 bg-white rounded-xl border border-slate-200 shadow-xs">
            <span className="text-[10px] font-bold uppercase tracking-wider text-slate-500 flex items-center gap-1">
              <DollarSign className="w-3.5 h-3.5 text-emerald-600" /> Cash in Drawer
            </span>
            <div className="text-xl font-black font-mono text-emerald-700 mt-1">
              ৳ {stats.totalCash.toLocaleString('en-US', { minimumFractionDigits: 2 })}
            </div>
            <div className="text-[10px] text-slate-400">Cash payments</div>
          </div>

          <div className="p-2.5 bg-white rounded-xl border border-slate-200 shadow-xs col-span-2 flex items-center justify-between text-xs">
            <span className="font-semibold text-slate-600 flex items-center gap-1.5">
              <Smartphone className="w-4 h-4 text-pink-600" /> bKash / Mobile:
            </span>
            <span className="font-mono font-bold text-slate-900">
              ৳ {stats.totalBkash.toLocaleString('en-US', { minimumFractionDigits: 2 })}
            </span>
          </div>
        </div>

        {/* Transactions List */}
        <div className="flex-1 overflow-y-auto p-4 space-y-3">
          <h3 className="text-xs font-bold uppercase tracking-wider text-slate-400">
            Completed Invoices ({sales.length})
          </h3>

          {sales.length === 0 ? (
            <div className="text-center py-12 text-slate-400 text-xs">
              No sales completed yet today.
            </div>
          ) : (
            sales.map((sale) => (
              <div
                key={sale.id}
                className="p-3 bg-white rounded-xl border border-slate-200 shadow-xs hover:border-sky-300 transition-colors space-y-1.5"
              >
                <div className="flex items-center justify-between text-xs">
                  <span className="font-mono font-bold text-slate-900">{sale.invoiceNumber}</span>
                  <span className="font-mono font-bold text-sky-700">
                    ৳ {sale.totalAmount.toFixed(2)}
                  </span>
                </div>

                <div className="flex items-center justify-between text-[11px] text-slate-500">
                  <span>{sale.customerName || 'Walk-in'} • {sale.paymentMethod}</span>
                  <span className="flex items-center gap-1">
                    <Clock className="w-3 h-3 text-slate-400" />
                    {new Date(sale.createdAt).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}
                  </span>
                </div>

                <div className="text-[11px] text-slate-400 truncate">
                  {sale.items.map((i) => `${i.medicine.brandName} (${i.quantity})`).join(', ')}
                </div>

                <div className="pt-2 border-t border-slate-100 flex justify-end">
                  <button
                    onClick={() => {
                      onSelectSaleForReprint(sale)
                    }}
                    className="inline-flex items-center gap-1 px-2.5 py-1 rounded-lg text-xs font-semibold bg-slate-100 hover:bg-slate-200 text-slate-700 transition-colors cursor-pointer"
                  >
                    <Printer className="w-3 h-3" />
                    <span>Reprint Memo</span>
                  </button>
                </div>
              </div>
            ))
          )}
        </div>
      </div>
    </div>
  )
}
