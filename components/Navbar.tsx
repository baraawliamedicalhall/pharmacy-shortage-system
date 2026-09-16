'use client'

import React from 'react'
import Link from 'next/link'
import { useRouter, usePathname } from 'next/navigation'
import { Pill, LogOut, Shield, Smartphone, Wifi } from 'lucide-react'

interface NavbarProps {
  user?: {
    employeeId: string
    name: string
    role: 'ADMIN' | 'EMPLOYEE'
  } | null
}

export function Navbar({ user }: NavbarProps) {
  const router = useRouter()
  const pathname = usePathname()

  const handleLogout = async () => {
    try {
      await fetch('/api/auth/logout', { method: 'POST' })
      router.push('/login')
      router.refresh()
    } catch (e) {
      console.error('Logout error:', e)
    }
  }

  const isAdmin = user?.role === 'ADMIN'
  const inAdminSection = pathname.startsWith('/admin')

  return (
    <header className="sticky top-0 z-40 bg-slate-900 text-white border-b border-slate-800 shadow-sm no-print">
      <div className="max-w-7xl mx-auto px-4 sm:px-6 h-14 flex items-center justify-between">
        {/* Brand & Logo */}
        <Link href={inAdminSection ? '/admin' : '/'} className="flex items-center gap-2.5 group">
          <div className="w-8 h-8 rounded-lg bg-sky-600 flex items-center justify-center text-white font-black shadow-md group-hover:bg-sky-500 transition-colors">
            <Pill className="w-5 h-5" />
          </div>
          <div>
            <div className="font-bold text-sm sm:text-base leading-tight tracking-tight flex items-center gap-1.5">
              <span>Pharmacy Short</span>
              <span className="hidden sm:inline-block px-1.5 py-0.5 rounded text-[10px] uppercase font-semibold bg-sky-950 text-sky-400 border border-sky-800">
                Local LAN
              </span>
            </div>
            <p className="text-[10px] text-slate-400 leading-none hidden sm:block">Shortage Collection System</p>
          </div>
        </Link>

        {/* User Info & Actions */}
        <div className="flex items-center gap-2 sm:gap-4">
          {user && (
            <>
              {/* Local network indicator */}
              <div className="hidden md:flex items-center gap-1 text-[11px] text-emerald-400 bg-emerald-950/60 border border-emerald-800/60 px-2 py-0.5 rounded-full">
                <Wifi className="w-3 h-3 animate-pulse" />
                <span>Local Router</span>
              </div>

              {/* Role Toggle for Admin */}
              {isAdmin && (
                <div className="flex items-center">
                  {inAdminSection ? (
                    <Link
                      href="/"
                      className="flex items-center gap-1.5 text-xs bg-slate-800 hover:bg-slate-700 text-sky-300 px-2.5 py-1.5 rounded-lg border border-slate-700 transition-colors"
                      title="Switch to Mobile Employee Entry View"
                    >
                      <Smartphone className="w-3.5 h-3.5" />
                      <span className="hidden sm:inline">Mobile Entry</span>
                    </Link>
                  ) : (
                    <Link
                      href="/admin"
                      className="flex items-center gap-1.5 text-xs bg-sky-900/80 hover:bg-sky-800 text-sky-200 px-2.5 py-1.5 rounded-lg border border-sky-700 transition-colors"
                      title="Go to Admin Dashboard"
                    >
                      <Shield className="w-3.5 h-3.5" />
                      <span className="hidden sm:inline">Admin Dashboard</span>
                    </Link>
                  )}
                </div>
              )}

              {/* User badge */}
              <div className="flex items-center gap-2 bg-slate-800/80 px-2.5 py-1 rounded-lg border border-slate-700/80 text-xs">
                <div className="w-6 h-6 rounded-full bg-sky-700 text-white font-bold flex items-center justify-center text-[11px]">
                  {user.name.charAt(0)}
                </div>
                <div className="text-left hidden xs:block">
                  <div className="font-semibold leading-none text-slate-100">{user.name}</div>
                  <div className="text-[10px] text-slate-400 leading-none mt-0.5">{user.employeeId}</div>
                </div>
              </div>

              {/* Logout button */}
              <button
                onClick={handleLogout}
                className="text-slate-400 hover:text-rose-300 p-1.5 rounded-lg hover:bg-slate-800 transition-colors"
                title="Sign out"
                aria-label="Sign out"
              >
                <LogOut className="w-4 h-4" />
              </button>
            </>
          )}

          {!user && (
            <Link
              href="/login"
              className="text-xs bg-sky-600 hover:bg-sky-500 text-white font-medium px-3 py-1.5 rounded-lg transition-colors"
            >
              Sign In
            </Link>
          )}
        </div>
      </div>
    </header>
  )
}
