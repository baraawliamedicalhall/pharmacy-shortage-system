'use client'

import React from 'react'
import Link from 'next/link'
import { useRouter, usePathname } from 'next/navigation'
import { Pill, LogOut, Shield, Smartphone, Wifi, CreditCard } from 'lucide-react'

import { Role } from '@prisma/client'
import { ROLE_CONFIGS, isAdministrativeRole } from '@/lib/roles'

interface NavbarProps {
  user?: {
    employeeId: string
    name: string
    role: Role | string
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

  const isAdmin = isAdministrativeRole(user?.role as Role)
  const inAdminSection = pathname.startsWith('/admin')
  const roleConfig = user?.role ? ROLE_CONFIGS[user.role as Role] : null

  return (
    <header className="sticky top-0 z-40 bg-slate-900 text-white border-b border-slate-800 shadow-sm no-print">
      <div className="max-w-7xl mx-auto px-4 sm:px-6 h-14 flex items-center justify-between">
        {/* Brand & Logo */}
        <Link href={inAdminSection ? '/admin' : '/'} className="flex items-center gap-2.5 group">
          <div className="w-8 h-8 rounded-lg overflow-hidden bg-white p-0.5 flex items-center justify-center shadow-md group-hover:ring-2 group-hover:ring-sky-400 transition-all shrink-0">
            <img
              src="/logo.png"
              alt="Bara-Awlia Medical Hall Logo"
              className="w-full h-full object-contain"
            />
          </div>
          <div>
            <div className="font-bold text-sm sm:text-base leading-tight tracking-tight flex items-center gap-1.5">
              <span>Bara-Awlia</span>
              <span className="hidden sm:inline-block px-1.5 py-0.5 rounded text-[10px] uppercase font-semibold bg-pink-950 text-pink-300 border border-pink-800">
                Medical Hall
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

              {/* POS Counter Link */}
              <Link
                href="/pos"
                className="flex items-center gap-1.5 text-xs bg-emerald-600 hover:bg-emerald-500 text-white font-bold px-2.5 py-1.5 rounded-lg shadow-sm transition-colors cursor-pointer"
                title="Open Retail POS Counter"
              >
                <CreditCard className="w-3.5 h-3.5" />
                <span>POS</span>
              </Link>

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
                  <div className="font-semibold leading-none text-slate-100 flex items-center gap-1.5">
                    <span>{user.name}</span>
                    {roleConfig && (
                      <span className="text-[9px] px-1.5 py-0.2 rounded font-semibold bg-slate-700/90 text-sky-300 border border-slate-600">
                        {roleConfig.shortTitle}
                      </span>
                    )}
                  </div>
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
