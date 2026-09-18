'use client'

import React, { useState, useEffect } from 'react'
import Link from 'next/link'
import {
  Search,
  PlusCircle,
  Filter,
  Printer,
  Eye,
  CheckCircle2,
  Clock,
  Truck,
  XCircle,
  ChevronRight,
  Store,
  DollarSign,
  FileText,
  Trash2,
} from 'lucide-react'
import { ToastContainer, ToastMessage } from '@/components/Toast'

interface WholesaleOrder {
  id: string
  orderNumber: string
  orderDate: string
  deliveryDate: string | null
  status: 'PENDING' | 'CONFIRMED' | 'PACKED' | 'DELIVERED' | 'CANCELLED'
  paymentStatus: 'DUE' | 'PARTIAL' | 'PAID'
  paymentMethod: string
  subtotal: number
  discountAmount: number
  totalAmount: number
  paidAmount: number
  dueAmount: number
  notes: string | null
  createdAt: string
  retailer: {
    id: string
    retailerCode: string
    storeName: string
    ownerName: string
    phone: string
    marketRoute: string | null
  }
  items: Array<{
    id: string
    quantity: number
    unit: string
    medicine: {
      brandName: string
      strength: string
    }
  }>
}

export default function WholesaleOrdersListPage() {
  const [orders, setOrders] = useState<WholesaleOrder[]>([])
  const [stats, setStats] = useState({ totalOrdersCount: 0, totalRevenue: 0, totalDues: 0, pendingCount: 0 })
  const [loading, setLoading] = useState(true)
  const [search, setSearch] = useState('')
  const [statusFilter, setStatusFilter] = useState('')
  const [paymentFilter, setPaymentFilter] = useState('')
  const [toasts, setToasts] = useState<ToastMessage[]>([])

  const showToast = (type: 'success' | 'error' | 'info', text: string) => {
    setToasts((prev) => [...prev, { id: Math.random().toString(), type, text }])
  }

  const dismissToast = (id: string) => {
    setToasts((prev) => prev.filter((t) => t.id !== id))
  }

  const fetchOrders = async () => {
    setLoading(true)
    try {
      const query = new URLSearchParams()
      if (search) query.set('search', search)
      if (statusFilter) query.set('status', statusFilter)
      if (paymentFilter) query.set('paymentStatus', paymentFilter)

      const res = await fetch(`/api/wholesale/orders?${query.toString()}`)
      const data = await res.json()
      if (res.ok) {
        setOrders(data.orders || [])
        if (data.stats) setStats(data.stats)
      } else {
        showToast('error', data.error || 'Failed to fetch wholesale orders')
      }
    } catch {
      showToast('error', 'Failed to connect to local server')
    } finally {
      setLoading(false)
    }
  }

  useEffect(() => {
    fetchOrders()
  }, [search, statusFilter, paymentFilter])

  const handleStatusChange = async (orderId: string, newStatus: string) => {
    try {
      const res = await fetch(`/api/wholesale/orders/${orderId}`, {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ status: newStatus }),
      })
      if (res.ok) {
        showToast('success', `Order status updated to ${newStatus}`)
        fetchOrders()
      } else {
        showToast('error', 'Failed to update order status')
      }
    } catch {
      showToast('error', 'Error updating order')
    }
  }

  const handleDeleteOrder = async (orderId: string, orderNumber: string) => {
    const confirmDelete = window.confirm(
      `Are you sure you want to delete wholesale order "${orderNumber}"?\n\nThis will remove the order and adjust the retailer's outstanding balance.`
    )
    if (!confirmDelete) return

    try {
      const res = await fetch(`/api/wholesale/orders/${orderId}`, {
        method: 'DELETE',
      })
      const data = await res.json()
      if (res.ok) {
        showToast('success', `Order "${orderNumber}" deleted successfully`)
        fetchOrders()
      } else {
        showToast('error', data.error || 'Failed to delete order')
      }
    } catch {
      showToast('error', 'Failed to connect to local server')
    }
  }

  const statusStyles: any = {
    PENDING: 'bg-amber-100 text-amber-800 border-amber-200',
    CONFIRMED: 'bg-blue-100 text-blue-800 border-blue-200',
    PACKED: 'bg-purple-100 text-purple-800 border-purple-200',
    DELIVERED: 'bg-emerald-100 text-emerald-800 border-emerald-200',
    CANCELLED: 'bg-slate-100 text-slate-600 border-slate-200',
  }

  const paymentStyles: any = {
    PAID: 'bg-emerald-50 text-emerald-700 border-emerald-200',
    PARTIAL: 'bg-amber-50 text-amber-700 border-amber-200',
    DUE: 'bg-rose-50 text-rose-700 border-rose-200',
  }

  return (
    <div className="p-4 sm:p-6 lg:p-8 space-y-6 max-w-7xl mx-auto">
      <ToastContainer toasts={toasts} onDismiss={dismissToast} />

      {/* Header */}
      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
        <div>
          <div className="flex items-center gap-2">
            <span className="px-2.5 py-0.5 rounded-full text-xs font-semibold bg-sky-100 text-sky-800 border border-sky-200">
              Orders &amp; Chalans
            </span>
            <span className="text-xs text-slate-500 font-medium">B2B Distribution</span>
          </div>
          <h1 className="text-2xl font-black text-slate-900 tracking-tight mt-1">
            Wholesale Orders
          </h1>
          <p className="text-sm text-slate-500">
            Fulfill orders, dispatch delivery chalans, and print commercial invoices for retailers.
          </p>
        </div>

        <Link
          href="/admin/wholesale/orders/new"
          className="inline-flex items-center gap-2 px-4 py-2.5 rounded-xl bg-sky-600 hover:bg-sky-500 text-white font-bold text-sm shadow-md transition-colors"
        >
          <PlusCircle className="w-4 h-4" />
          <span>New Wholesale Order</span>
        </Link>
      </div>

      {/* Filter and Search */}
      <div className="bg-white rounded-xl p-3 border border-slate-200 shadow-sm flex flex-col md:flex-row gap-3 items-center justify-between">
        <div className="relative w-full md:w-80">
          <Search className="w-4 h-4 text-slate-400 absolute left-3 top-3" />
          <input
            type="text"
            placeholder="Search by order #, retailer, phone..."
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            className="w-full pl-9 pr-3 py-2 text-xs rounded-lg border border-slate-200 focus:outline-none focus:ring-2 focus:ring-sky-500 bg-slate-50"
          />
        </div>

        <div className="flex items-center gap-2 w-full md:w-auto">
          {/* Status Dropdown */}
          <select
            value={statusFilter}
            onChange={(e) => setStatusFilter(e.target.value)}
            className="px-3 py-2 text-xs rounded-lg border border-slate-200 bg-slate-50 font-semibold text-slate-700"
          >
            <option value="">All Order Statuses</option>
            <option value="PENDING">Pending</option>
            <option value="CONFIRMED">Confirmed</option>
            <option value="PACKED">Packed</option>
            <option value="DELIVERED">Delivered</option>
            <option value="CANCELLED">Cancelled</option>
          </select>

          {/* Payment Status Dropdown */}
          <select
            value={paymentFilter}
            onChange={(e) => setPaymentFilter(e.target.value)}
            className="px-3 py-2 text-xs rounded-lg border border-slate-200 bg-slate-50 font-semibold text-slate-700"
          >
            <option value="">All Payment Statuses</option>
            <option value="PAID">Paid</option>
            <option value="PARTIAL">Partial</option>
            <option value="DUE">Due</option>
          </select>
        </div>
      </div>

      {/* Orders Table */}
      <div className="bg-white rounded-2xl border border-slate-200 shadow-sm overflow-hidden">
        <div className="overflow-x-auto">
          <table className="w-full text-left border-collapse text-xs">
            <thead>
              <tr className="bg-slate-50 text-slate-500 border-b border-slate-200 font-bold uppercase tracking-wider">
                <th className="py-3 px-4">Order #</th>
                <th className="py-3 px-4">Date</th>
                <th className="py-3 px-4">Retailer Pharmacy</th>
                <th className="py-3 px-4">Items Summary</th>
                <th className="py-3 px-4 text-right">Total Amount</th>
                <th className="py-3 px-4 text-center">Payment</th>
                <th className="py-3 px-4 text-center">Fulfillment Status</th>
                <th className="py-3 px-4 text-center">Actions</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-100 font-medium text-slate-700">
              {loading ? (
                <tr>
                  <td colSpan={8} className="py-8 text-center text-slate-400">
                    Loading wholesale orders...
                  </td>
                </tr>
              ) : orders.length === 0 ? (
                <tr>
                  <td colSpan={8} className="py-8 text-center text-slate-400">
                    No wholesale orders found matching criteria.
                  </td>
                </tr>
              ) : (
                orders.map((order) => {
                  return (
                    <tr key={order.id} className="hover:bg-slate-50/80 transition-colors">
                      <td className="py-3 px-4 font-mono font-bold text-slate-900">
                        {order.orderNumber}
                      </td>
                      <td className="py-3 px-4 text-slate-500 font-mono">
                        {order.orderDate}
                      </td>
                      <td className="py-3 px-4">
                        <div className="font-bold text-slate-900">{order.retailer.storeName}</div>
                        <div className="text-[11px] text-slate-400">{order.retailer.marketRoute || order.retailer.phone}</div>
                      </td>
                      <td className="py-3 px-4">
                        <div className="text-slate-700 font-semibold">
                          {order.items.length} items ({order.items.reduce((s, i) => s + i.quantity, 0)} units)
                        </div>
                        <div className="text-[10px] text-slate-400 truncate max-w-[200px]">
                          {order.items.map((i) => i.medicine.brandName).join(', ')}
                        </div>
                      </td>
                      <td className="py-3 px-4 text-right font-mono font-bold text-slate-900">
                        ৳ {order.totalAmount.toLocaleString('en-US', { minimumFractionDigits: 2 })}
                        {order.dueAmount > 0 && (
                          <div className="text-[10px] text-rose-600 font-normal">
                            Due: ৳ {order.dueAmount.toLocaleString()}
                          </div>
                        )}
                      </td>
                      <td className="py-3 px-4 text-center">
                        <span
                          className={`inline-block px-2 py-0.5 rounded-md text-[10px] font-bold border ${
                            paymentStyles[order.paymentStatus] || 'bg-slate-100 text-slate-700'
                          }`}
                        >
                          {order.paymentStatus} ({order.paymentMethod})
                        </span>
                      </td>
                      <td className="py-3 px-4 text-center">
                        <select
                          value={order.status}
                          onChange={(e) => handleStatusChange(order.id, e.target.value)}
                          className={`px-2 py-1 rounded-lg text-[11px] font-bold border ${
                            statusStyles[order.status] || 'bg-slate-100'
                          }`}
                        >
                          <option value="PENDING">PENDING</option>
                          <option value="CONFIRMED">CONFIRMED</option>
                          <option value="PACKED">PACKED</option>
                          <option value="DELIVERED">DELIVERED</option>
                          <option value="CANCELLED">CANCELLED</option>
                        </select>
                      </td>
                      <td className="py-3 px-4 text-center">
                        <div className="flex items-center justify-center gap-1.5">
                          <Link
                            href={`/admin/wholesale/invoices/${order.id}`}
                            className="inline-flex items-center gap-1 px-2.5 py-1 rounded-lg text-xs font-semibold bg-sky-50 hover:bg-sky-100 text-sky-700 border border-sky-200 transition-colors"
                            title="Print A4 Invoice & Chalan"
                          >
                            <Printer className="w-3.5 h-3.5" />
                            <span>Print</span>
                          </Link>
                          <button
                            onClick={() => handleDeleteOrder(order.id, order.orderNumber)}
                            className="p-1 rounded-lg text-rose-500 hover:text-rose-700 hover:bg-rose-50 transition-colors cursor-pointer"
                            title="Delete Order"
                          >
                            <Trash2 className="w-3.5 h-3.5" />
                          </button>
                        </div>
                      </td>
                    </tr>
                  )
                })
              )}
            </tbody>
          </table>
        </div>
      </div>
    </div>
  )
}
