'use client'

import React from 'react'
import { Printer } from 'lucide-react'

export function InvoicePrintButton() {
  return (
    <button
      onClick={() => window.print()}
      className="inline-flex items-center gap-2 px-4 py-2 rounded-xl bg-sky-600 hover:bg-sky-500 text-white text-xs font-bold shadow-md transition-colors cursor-pointer"
    >
      <Printer className="w-4 h-4" />
      <span>Print Invoice &amp; Chalan (A4)</span>
    </button>
  )
}
