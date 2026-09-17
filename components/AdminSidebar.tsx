'use client'

import React from 'react'
import Link from 'next/link'
import { usePathname } from 'next/navigation'
import {
  LayoutDashboard,
  ClipboardList,
  Pill,
  Building2,
  Users,
  FileText,
  Printer,
  Settings,
  Smartphone,
  ChevronRight,
  Shield,
} from 'lucide-react'

export function AdminSidebar() {
  const pathname = usePathname()

  const links = [
    { href: '/admin', label: 'Dashboard', icon: LayoutDashboard, exact: true },
    { href: '/admin/shortages', label: "Today's Shortages", icon: ClipboardList },
    { href: '/admin/medicines', label: 'Medicine Master', icon: Pill },
    { href: '/admin/manufacturers', label: 'Manufacturers', icon: Building2 },
    { href: '/admin/employees', label: 'Employees', icon: Users },
    { href: '/admin/reports', label: 'History & Reports', icon: FileText },
    { href: '/admin/print', label: 'Print List (A4)', icon: Printer },
    { href: '/admin/settings', label: 'Backup & Network', icon: Settings },
  ]

  const isActive = (href: string, exact = false) => {
    if (exact) return pathname === href
    return pathname.startsWith(href)
  }

  return (
    <>
      {/* Desktop Sidebar */}
      <aside className="hidden lg:flex flex-col w-64 bg-slate-900 text-slate-300 border-r border-slate-800 shrink-0 no-print">
        <div className="px-4 py-3.5 border-b border-slate-800 flex items-center justify-between">
          <div className="flex items-center gap-2.5">
            <div className="p-1.5 rounded-lg bg-sky-500/10 border border-sky-500/20 text-sky-400">
              <Shield className="w-4 h-4" />
            </div>
            <div>
              <div className="text-xs font-bold text-white tracking-wide uppercase">
                Admin Console
              </div>
              <div className="text-[10px] text-slate-400 font-medium">
                Management Portal
              </div>
            </div>
          </div>
        </div>

        <nav className="flex-1 p-3 space-y-1 overflow-y-auto">
          {links.map((link) => {
            const Icon = link.icon
            const active = isActive(link.href, link.exact)

            return (
              <Link
                key={link.href}
                href={link.href}
                className={`flex items-center justify-between px-3 py-2.5 rounded-xl text-xs font-semibold transition-all ${
                  active
                    ? 'bg-sky-600 text-white shadow-md'
                    : 'text-slate-400 hover:text-slate-100 hover:bg-slate-800/60'
                }`}
              >
                <div className="flex items-center gap-3">
                  <Icon className={`w-4 h-4 ${active ? 'text-white' : 'text-slate-400'}`} />
                  <span>{link.label}</span>
                </div>
                {active && <ChevronRight className="w-4 h-4 text-white/80" />}
              </Link>
            )
          })}
        </nav>

        {/* Quick link to employee view */}
        <div className="p-3 border-t border-slate-800">
          <Link
            href="/"
            className="flex items-center justify-center gap-2 w-full py-2 px-3 rounded-xl text-xs font-semibold bg-slate-800 hover:bg-slate-700 text-sky-400 border border-slate-700 transition-colors"
          >
            <Smartphone className="w-4 h-4" />
            <span>Mobile Staff Entry</span>
          </Link>
        </div>

        {/* Developer Credit */}
        <div className="p-3 border-t border-slate-800/80 text-[10px] text-slate-500 text-center leading-tight">
          <span>Designed &amp; Developed by</span>
          <a
            href="https://3s-soft.com"
            target="_blank"
            rel="noopener noreferrer"
            className="text-sky-400 font-semibold hover:underline block mt-0.5"
          >
            3s-Soft
          </a>
        </div>
      </aside>

      {/* Mobile Horizontal Sub-Navigation */}
      <div className="lg:hidden bg-slate-900 border-b border-slate-800 text-white overflow-x-auto no-print">
        <div className="flex items-center gap-1 p-2 min-w-max">
          {links.map((link) => {
            const Icon = link.icon
            const active = isActive(link.href, link.exact)

            return (
              <Link
                key={link.href}
                href={link.href}
                className={`flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-xs font-semibold transition-colors ${
                  active ? 'bg-sky-600 text-white' : 'text-slate-400 hover:text-white bg-slate-800/40'
                }`}
              >
                <Icon className="w-3.5 h-3.5" />
                <span>{link.label}</span>
              </Link>
            )
          })}
        </div>
      </div>
    </>
  )
}
