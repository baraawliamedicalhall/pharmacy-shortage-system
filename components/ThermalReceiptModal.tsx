'use client'

import React, { useEffect, useRef } from 'react'
import { Printer, X, CheckCircle2 } from 'lucide-react'

export interface ReceiptSaleData {
  id: string
  invoiceNumber: string
  customerName: string
  customerPhone?: string | null
  subtotal: number
  discountAmount: number
  totalAmount: number
  paidAmount: number
  changeAmount: number
  paymentMethod: string
  createdAt: string
  soldBy?: {
    name: string
    employeeId: string
  } | null
  items: Array<{
    id: string
    quantity: number
    unit: string
    unitPrice: number
    discountAmount?: number
    total: number
    medicine: {
      brandName: string
      strength: string
      dosageForm: string
    }
  }>
}

interface ThermalReceiptModalProps {
  sale: ReceiptSaleData
  onClose: () => void
  pharmacyName?: string
  pharmacyAddress?: string
  pharmacyPhone?: string
}

export function ThermalReceiptModal({
  sale,
  onClose,
  pharmacyName = 'BMH Pharmacy & Healthcare',
  pharmacyAddress = 'Main Road, Dhaka, Bangladesh',
  pharmacyPhone = '+880 1700-000000',
}: ThermalReceiptModalProps) {
  const receiptRef = useRef<HTMLDivElement>(null)

  const handlePrint = () => {
    window.print()
  }

  // Keyboard shortcut: Escape or Enter to close
  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      if (e.key === 'Escape' || e.key === 'Enter') {
        e.preventDefault()
        onClose()
      }
    }
    window.addEventListener('keydown', handleKeyDown)
    return () => window.removeEventListener('keydown', handleKeyDown)
  }, [onClose])

  const formattedDate = new Date(sale.createdAt).toLocaleString('en-GB', {
    day: '2-digit',
    month: 'short',
    year: 'numeric',
    hour: '2-digit',
    minute: '2-digit',
  })

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-slate-950/70 p-4 backdrop-blur-xs">
      <div className="bg-white rounded-2xl max-w-sm w-full shadow-2xl overflow-hidden border border-slate-200 animate-in fade-in zoom-in-95 duration-150 flex flex-col max-h-[92vh]">
        {/* Modal Action Header (hidden in print) */}
        <div className="px-4 py-3 bg-slate-900 text-white flex items-center justify-between no-print shrink-0">
          <div className="flex items-center gap-2">
            <CheckCircle2 className="w-4 h-4 text-emerald-400" />
            <span className="text-xs font-bold">Sale Completed</span>
          </div>
          <div className="flex items-center gap-2">
            <button
              onClick={handlePrint}
              className="px-3 py-1.5 rounded-lg bg-sky-600 hover:bg-sky-500 text-white text-xs font-bold flex items-center gap-1.5 shadow-sm transition-colors cursor-pointer"
            >
              <Printer className="w-3.5 h-3.5" />
              <span>Print Slip</span>
            </button>
            <button
              onClick={onClose}
              className="p-1.5 rounded-lg text-slate-400 hover:text-white hover:bg-slate-800 transition-colors cursor-pointer"
            >
              <X className="w-4 h-4" />
            </button>
          </div>
        </div>

        {/* Thermal Slip Body (80mm Monospace view) */}
        <div className="p-6 overflow-y-auto font-mono text-xs text-slate-900 bg-white" ref={receiptRef}>
          {/* Header */}
          <div className="text-center space-y-0.5 border-b border-dashed border-slate-300 pb-3">
            <h2 className="font-bold text-sm uppercase tracking-tight text-slate-950">
              {pharmacyName}
            </h2>
            <p className="text-[11px] text-slate-600">{pharmacyAddress}</p>
            <p className="text-[11px] text-slate-600">Hotline: {pharmacyPhone}</p>
            <div className="pt-1 text-[10px] uppercase font-bold tracking-wider text-slate-500">
              *** CASH MEMO / RECEIPT ***
            </div>
          </div>

          {/* Meta Information */}
          <div className="py-2.5 border-b border-dashed border-slate-300 space-y-1 text-[11px]">
            <div className="flex justify-between">
              <span className="text-slate-500">Invoice:</span>
              <span className="font-bold">{sale.invoiceNumber}</span>
            </div>
            <div className="flex justify-between">
              <span className="text-slate-500">Date:</span>
              <span>{formattedDate}</span>
            </div>
            <div className="flex justify-between">
              <span className="text-slate-500">Served By:</span>
              <span>{sale.soldBy?.name || 'Cashier'}</span>
            </div>
            <div className="flex justify-between">
              <span className="text-slate-500">Customer:</span>
              <span>{sale.customerName || 'Walk-in'}</span>
            </div>
          </div>

          {/* Itemized Table */}
          <div className="py-2.5 border-b border-dashed border-slate-300">
            <table className="w-full text-left text-[11px]">
              <thead>
                <tr className="text-slate-500 border-b border-slate-200">
                  <th className="pb-1 text-left">Item</th>
                  <th className="pb-1 text-center">Qty</th>
                  <th className="pb-1 text-right">Price</th>
                  <th className="pb-1 text-right">Total</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-100">
                {sale.items.map((item, idx) => (
                  <tr key={idx} className="align-top">
                    <td className="py-1 pr-1 font-semibold">
                      <div>{item.medicine.brandName} {item.medicine.strength}</div>
                      <div className="text-[9px] text-slate-400">({item.unit})</div>
                    </td>
                    <td className="py-1 text-center">{item.quantity}</td>
                    <td className="py-1 text-right">৳{item.unitPrice.toFixed(1)}</td>
                    <td className="py-1 text-right font-bold">
                      {item.discountAmount !== undefined && item.discountAmount > 0 && (
                        <div className="text-[9px] text-slate-400 line-through">
                          ৳{(item.unitPrice * item.quantity).toFixed(1)}
                        </div>
                      )}
                      <div>৳{item.total.toFixed(1)}</div>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>

          {/* Financial Calculation */}
          <div className="py-2.5 border-b border-dashed border-slate-300 space-y-1 text-[11px]">
            <div className="flex justify-between text-slate-600">
              <span>Gross Total:</span>
              <span>৳ {sale.subtotal.toFixed(2)}</span>
            </div>
            {sale.discountAmount > 0 && (
              <div className="flex justify-between text-emerald-700 font-semibold">
                <span>Discount{sale.subtotal > 0 ? ` (${((sale.discountAmount / sale.subtotal) * 100).toFixed(1)}%)` : ''}:</span>
                <span>- ৳ {sale.discountAmount.toFixed(2)}</span>
              </div>
            )}
            <div className="flex justify-between font-bold text-sm pt-1 border-t border-slate-200 text-slate-950">
              <span>Net Payable:</span>
              <span>৳ {sale.totalAmount.toFixed(2)}</span>
            </div>
            <div className="flex justify-between text-slate-600 pt-1">
              <span>Tender Cash:</span>
              <span>৳ {sale.paidAmount.toFixed(2)}</span>
            </div>
            <div className="flex justify-between font-bold text-slate-900">
              <span>Return Change:</span>
              <span>৳ {sale.changeAmount.toFixed(2)}</span>
            </div>
            <div className="flex justify-between text-slate-500 text-[10px] pt-0.5">
              <span>Payment Mode:</span>
              <span className="font-semibold uppercase">{sale.paymentMethod}</span>
            </div>
          </div>

          {/* Footer Note */}
          <div className="pt-3 text-center text-[10px] text-slate-500 space-y-1">
            <p className="font-semibold text-slate-700">Wishing you a speedy recovery!</p>
            <p>Sold medicines can be exchanged within 7 days with this memo in original packaging.</p>
            <p className="text-[9px] text-slate-400">Powered by BMH Pharmacy System</p>
          </div>
        </div>

        {/* Modal Bottom Close */}
        <div className="p-3 bg-slate-50 border-t border-slate-100 flex items-center gap-3 no-print shrink-0">
          <span className="text-[11px] text-slate-400 shrink-0">Esc / Enter</span>
          <button
            onClick={onClose}
            className="flex-1 py-2 px-3 rounded-xl bg-slate-900 hover:bg-slate-800 text-white text-xs font-bold shadow-xs transition-colors cursor-pointer"
          >
            Next Customer →
          </button>
        </div>
      </div>
    </div>
  )
}
