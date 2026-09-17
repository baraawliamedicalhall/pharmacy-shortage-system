import React from 'react'
import Link from 'next/link'
import { notFound } from 'next/navigation'
import { prisma } from '@/lib/prisma'
import { Printer, ArrowLeft, Building2, Store, Phone, Calendar } from 'lucide-react'
import { InvoicePrintButton } from '@/components/InvoicePrintButton'

export const dynamic = 'force-dynamic'

export default async function WholesaleInvoicePage({
  params,
}: {
  params: Promise<{ id: string }>
}) {
  const { id } = await params

  const order = await prisma.wholesaleOrder.findUnique({
    where: { id },
    include: {
      retailer: true,
      items: {
        include: {
          medicine: {
            include: {
              manufacturer: true,
            },
          },
        },
      },
      payments: {
        orderBy: { createdAt: 'desc' },
      },
    },
  })

  if (!order) {
    notFound()
  }

  // System settings for pharmacy name & contact
  const settings = await prisma.systemSetting.findMany()
  const settingsMap = new Map(settings.map((s) => [s.key, s.value]))
  const pharmacyName = settingsMap.get('pharmacy_name') || 'BMH Pharmacy & Wholesale Distribution'
  const pharmacyAddress = settingsMap.get('pharmacy_address') || 'Dhaka, Bangladesh'
  const pharmacyPhone = settingsMap.get('pharmacy_phone') || '+880 1700-000000'

  return (
    <div className="min-h-screen bg-slate-100 py-6 px-4 print:bg-white print:p-0">
      {/* Top Action Bar (Hidden when printing) */}
      <div className="max-w-4xl mx-auto mb-6 flex items-center justify-between no-print">
        <Link
          href="/admin/wholesale/orders"
          className="inline-flex items-center gap-2 text-xs font-bold text-slate-600 hover:text-slate-900 bg-white px-3.5 py-2 rounded-xl border border-slate-200 shadow-xs transition-colors"
        >
          <ArrowLeft className="w-4 h-4" />
          <span>Back to Orders</span>
        </Link>

        <div className="flex items-center gap-2">
          <InvoicePrintButton />
        </div>
      </div>

      {/* Invoice Document (A4 Container) */}
      <div className="max-w-4xl mx-auto bg-white rounded-2xl shadow-md border border-slate-200 p-8 sm:p-12 print:shadow-none print:border-0 print:p-6 print:m-0 text-slate-800">
        {/* Header */}
        <div className="border-b-2 border-slate-900 pb-5">
          <div className="flex justify-between items-start">
            <div>
              <div className="inline-block px-2.5 py-0.5 rounded text-[10px] font-black uppercase tracking-wider bg-slate-900 text-white mb-1.5">
                Commercial Wholesale Invoice
              </div>
              <h1 className="text-2xl font-black text-slate-900 tracking-tight">
                {pharmacyName}
              </h1>
              <p className="text-xs text-slate-500 mt-0.5">{pharmacyAddress} • Tel: {pharmacyPhone}</p>
            </div>

            <div className="text-right">
              <div className="text-lg font-black font-mono text-slate-900">{order.orderNumber}</div>
              <div className="text-xs text-slate-500 mt-0.5">Date: <strong className="text-slate-800">{order.orderDate}</strong></div>
              <div className="text-xs text-slate-500">Status: <strong className="text-slate-800 uppercase">{order.status}</strong></div>
            </div>
          </div>
        </div>

        {/* Customer & Route Details Box */}
        <div className="grid grid-cols-2 gap-4 py-4 border-b border-slate-200 text-xs">
          <div className="p-3 bg-slate-50 rounded-xl border border-slate-100 space-y-1">
            <span className="text-[10px] font-bold uppercase tracking-wider text-slate-400">Bill To / Retailer</span>
            <div className="font-bold text-sm text-slate-900">{order.retailer.storeName}</div>
            <div className="text-slate-600">Proprietor: {order.retailer.ownerName}</div>
            <div className="text-slate-600">Phone: {order.retailer.phone}</div>
            <div className="text-slate-500">{order.retailer.address}</div>
          </div>

          <div className="p-3 bg-slate-50 rounded-xl border border-slate-100 space-y-1">
            <span className="text-[10px] font-bold uppercase tracking-wider text-slate-400">Delivery &amp; Account Details</span>
            <div>Market Route: <strong className="text-slate-900">{order.retailer.marketRoute || 'Direct Delivery'}</strong></div>
            <div>Retailer Code: <strong className="text-slate-900 font-mono">{order.retailer.retailerCode}</strong></div>
            <div>Payment Terms: <strong className="text-slate-900">{order.paymentMethod}</strong> ({order.paymentStatus})</div>
            <div>Prior Ledger Due: <strong className="text-amber-700 font-mono">৳ {(order.retailer.currentDue - order.dueAmount).toLocaleString()}</strong></div>
          </div>
        </div>

        {/* Line Items Table */}
        <div className="py-4">
          <table className="w-full text-left border-collapse text-xs">
            <thead>
              <tr className="border-b-2 border-slate-900 text-slate-900 font-bold uppercase tracking-wider">
                <th className="py-2.5 px-2 w-8">#</th>
                <th className="py-2.5 px-3">Medicine Description</th>
                <th className="py-2.5 px-3">Manufacturer</th>
                <th className="py-2.5 px-3">Pack</th>
                <th className="py-2.5 px-3 text-center">Qty</th>
                <th className="py-2.5 px-3 text-right">Unit MRP</th>
                <th className="py-2.5 px-3 text-right">Trade Rate</th>
                <th className="py-2.5 px-3 text-right">Total (BDT)</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-200">
              {order.items.map((item, idx) => (
                <tr key={item.id} className="text-slate-700">
                  <td className="py-2 px-2 font-mono text-slate-400">{idx + 1}</td>
                  <td className="py-2 px-3">
                    <div className="font-bold text-slate-900">{item.medicine.brandName}</div>
                    <div className="text-[10px] text-slate-500">{item.medicine.strength} • {item.medicine.genericName}</div>
                  </td>
                  <td className="py-2 px-3 text-slate-600">{item.medicine.manufacturer.shortName || item.medicine.manufacturer.name}</td>
                  <td className="py-2 px-3">{item.unit}</td>
                  <td className="py-2 px-3 text-center font-bold font-mono text-slate-900">{item.quantity}</td>
                  <td className="py-2 px-3 text-right font-mono text-slate-500">৳ {item.unitPrice.toFixed(2)}</td>
                  <td className="py-2 px-3 text-right font-mono font-semibold text-slate-800">৳ {item.tradePrice.toFixed(2)}</td>
                  <td className="py-2 px-3 text-right font-mono font-bold text-slate-900">৳ {item.total.toFixed(2)}</td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>

        {/* Calculation Summary Box */}
        <div className="border-t-2 border-slate-900 pt-3 flex justify-end">
          <div className="w-72 space-y-1.5 text-xs">
            <div className="flex justify-between text-slate-600">
              <span>Gross MRP Subtotal:</span>
              <span className="font-mono">৳ {order.subtotal.toFixed(2)}</span>
            </div>
            <div className="flex justify-between text-slate-600">
              <span>Trade Discount Allowed:</span>
              <span className="font-mono">- ৳ {order.discountAmount.toFixed(2)}</span>
            </div>
            <div className="flex justify-between font-black text-sm text-slate-900 border-t border-slate-300 pt-1.5">
              <span>Invoice Total:</span>
              <span className="font-mono text-base">৳ {order.totalAmount.toFixed(2)}</span>
            </div>
            <div className="flex justify-between text-emerald-700 font-semibold">
              <span>Amount Paid:</span>
              <span className="font-mono">৳ {order.paidAmount.toFixed(2)}</span>
            </div>
            <div className="flex justify-between text-rose-700 font-bold border-t border-slate-200 pt-1">
              <span>Current Invoice Due:</span>
              <span className="font-mono">৳ {order.dueAmount.toFixed(2)}</span>
            </div>
            <div className="flex justify-between text-slate-900 font-bold border-t border-slate-300 pt-1">
              <span>Total Outstanding Account Due:</span>
              <span className="font-mono text-amber-700">৳ {order.retailer.currentDue.toFixed(2)}</span>
            </div>
          </div>
        </div>

        {/* Delivery / Verification Note */}
        {order.notes && (
          <div className="mt-4 p-2.5 bg-slate-50 rounded-lg text-xs text-slate-600 border border-slate-100">
            <strong>Notes:</strong> {order.notes}
          </div>
        )}

        {/* Dual Signatures */}
        <div className="mt-16 pt-6 border-t border-slate-300 grid grid-cols-2 gap-12 text-xs text-slate-600 text-center">
          <div>
            <div className="w-48 mx-auto border-b border-slate-400 mb-1" />
            <div className="font-bold text-slate-800">Authorized Signature &amp; Seal</div>
            <div className="text-[10px] text-slate-400">{pharmacyName}</div>
          </div>

          <div>
            <div className="w-48 mx-auto border-b border-slate-400 mb-1" />
            <div className="font-bold text-slate-800">Received in Good Condition</div>
            <div className="text-[10px] text-slate-400">{order.retailer.storeName}</div>
          </div>
        </div>

        {/* Print Footer */}
        <div className="mt-8 text-center text-[10px] text-slate-400 border-t border-slate-100 pt-2">
          Thank you for doing business with us • Generated by Pharmacy Shortage &amp; Wholesale System
        </div>
      </div>
    </div>
  )
}
