'use client'

import React, { useState, useEffect, Suspense } from 'react'
import { useRouter, useSearchParams } from 'next/navigation'
import { Pill, Lock, User, AlertCircle, Wifi, ArrowRight } from 'lucide-react'

function LoginForm() {
  const router = useRouter()
  const searchParams = useSearchParams()
  const rawRedirect = searchParams.get('redirect') || '/'
  const urlError = searchParams.get('error')
  let safeRedirect = '/'
  if (rawRedirect.startsWith('/') && !rawRedirect.startsWith('//')) {
    safeRedirect = rawRedirect
  } else {
    try {
      const parsed = new URL(rawRedirect, 'http://localhost')
      safeRedirect = parsed.pathname + parsed.search
    } catch {
      safeRedirect = '/'
    }
  }

  const [employeeId, setEmployeeId] = useState('')
  const [password, setPassword] = useState('')
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState<string | null>(urlError || null)

  // Update error if query param changes
  useEffect(() => {
    if (urlError) setError(decodeURIComponent(urlError))
  }, [urlError])

  const handleLogin = async (e: React.FormEvent) => {
    e.preventDefault()
    if (!employeeId || !password) {
      setError('Please enter Employee ID and PIN/Password')
      return
    }

    setLoading(true)
    setError(null)

    try {
      const res = await fetch('/api/auth/login', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          employeeId: employeeId.trim(),
          password,
          redirect: safeRedirect,
        }),
      })

      const data = await res.json()

      if (!res.ok) {
        throw new Error(data.error || 'Login failed')
      }

      // Hard redirect ensuring relative navigation on the active host (e.g. 192.168.1.159:3000)
      const target = data.user?.role === 'ADMIN' && safeRedirect === '/' ? '/admin' : safeRedirect
      window.location.href = target
    } catch (err: unknown) {
      const msg = err instanceof Error ? err.message : 'Error logging in'
      setError(msg)
      setLoading(false)
    }
  }

  // Quick fill helper for mobile testing
  const handleQuickFill = (id: string, pass: string) => {
    setEmployeeId(id)
    setPassword(pass)
    setError(null)
  }

  return (
    <div className="w-full max-w-md bg-white rounded-3xl shadow-xl border border-slate-200 overflow-hidden">
      {/* Header */}
      <div className="bg-slate-900 text-white p-6 text-center">
        <div className="w-14 h-14 bg-sky-600 rounded-2xl mx-auto flex items-center justify-center shadow-lg mb-3">
          <Pill className="w-8 h-8 text-white" />
        </div>
        <h1 className="text-2xl font-black tracking-tight">Pharmacy Short</h1>
        <p className="text-xs text-slate-400 mt-1">Medicine Shortage Reporting System</p>

        <div className="inline-flex items-center gap-1.5 px-3 py-1 bg-emerald-950/80 border border-emerald-800/80 rounded-full text-[11px] text-emerald-300 mt-3 font-medium">
          <Wifi className="w-3 h-3 text-emerald-400 animate-pulse" />
          <span>Local Pharmacy Network</span>
        </div>
      </div>

      {/* Form */}
      <form
        action="/api/auth/login"
        method="POST"
        onSubmit={handleLogin}
        className="p-6 space-y-4"
      >
        <input type="hidden" name="redirect" value={safeRedirect} />
        {error && (
          <div className="p-3.5 bg-rose-50 border border-rose-200 text-rose-700 text-xs rounded-xl flex items-start gap-2.5">
            <AlertCircle className="w-4 h-4 shrink-0 mt-0.5" />
            <span>{error}</span>
          </div>
        )}

        <div>
          <label
            htmlFor="employeeId"
            className="block text-xs font-bold text-slate-700 uppercase tracking-wider mb-1.5"
          >
            Employee ID or Username
          </label>
          <div className="relative flex items-center">
            <User className="w-5 h-5 text-slate-400 absolute left-3.5 pointer-events-none" />
            <input
              id="employeeId"
              name="employeeId"
              type="text"
              autoComplete="username"
              autoCapitalize="characters"
              autoCorrect="off"
              spellCheck="false"
              placeholder="e.g. EMP001 or ADMIN"
              value={employeeId}
              onChange={(e) => setEmployeeId(e.target.value.toUpperCase())}
              required
              className="w-full h-12 pl-11 pr-4 text-base font-semibold bg-slate-50 border border-slate-300 focus:border-sky-600 focus:bg-white rounded-xl focus:outline-hidden transition-all uppercase"
            />
          </div>
        </div>

        <div>
          <label
            htmlFor="password"
            className="block text-xs font-bold text-slate-700 uppercase tracking-wider mb-1.5"
          >
            PIN or Password
          </label>
          <div className="relative flex items-center">
            <Lock className="w-5 h-5 text-slate-400 absolute left-3.5 pointer-events-none" />
            <input
              id="password"
              name="password"
              type="password"
              autoComplete="current-password"
              placeholder="Enter PIN (e.g. 1234)"
              value={password}
              onChange={(e) => setPassword(e.target.value)}
              required
              className="w-full h-12 pl-11 pr-4 text-base font-semibold bg-slate-50 border border-slate-300 focus:border-sky-600 focus:bg-white rounded-xl focus:outline-hidden transition-all"
            />
          </div>
        </div>

        <button
          type="submit"
          disabled={loading}
          className="w-full h-13 bg-sky-600 hover:bg-sky-700 active:bg-sky-800 text-white font-bold rounded-xl text-base shadow-md flex items-center justify-center gap-2 transition-all disabled:opacity-50 mt-2 cursor-pointer"
        >
          {loading ? (
            <div className="w-5 h-5 border-2 border-white border-t-transparent rounded-full animate-spin" />
          ) : (
            <>
              <span>Sign In</span>
              <ArrowRight className="w-5 h-5" />
            </>
          )}
        </button>

        {/* Quick Credentials Buttons for Fast Staff Login */}
        <div className="pt-3 border-t border-slate-100">
          <p className="text-[11px] font-bold text-slate-400 uppercase tracking-wider text-center mb-2">
            Quick Auto-Fill
          </p>
          <div className="grid grid-cols-2 gap-2">
            <button
              type="button"
              onClick={() => handleQuickFill('EMP001', '1234')}
              className="px-2.5 py-1.5 text-[11px] font-semibold bg-slate-50 hover:bg-slate-100 border border-slate-200 text-slate-700 rounded-lg text-center transition-colors cursor-pointer"
            >
              Staff: <strong>EMP001</strong> (1234)
            </button>
            <button
              type="button"
              onClick={() => handleQuickFill('ADMIN', 'admin123')}
              className="px-2.5 py-1.5 text-[11px] font-semibold bg-slate-50 hover:bg-slate-100 border border-slate-200 text-slate-700 rounded-lg text-center transition-colors cursor-pointer"
            >
              Admin: <strong>ADMIN</strong> (admin123)
            </button>
          </div>
        </div>

        <div className="pt-3 border-t border-slate-100 text-center text-xs text-slate-500">
          <p className="text-[11px] text-slate-400">
            Pharmacy Shortage System • Local Wi-Fi Network
          </p>
          <p className="text-[10px] text-slate-400 mt-0.5">
            Employees log in with assigned ID & PIN • Admin logs in with Administrator credentials
          </p>
        </div>
      </form>
    </div>
  )
}

export default function LoginPage() {
  return (
    <div className="min-h-screen bg-slate-100 flex items-center justify-center p-4">
      <Suspense fallback={<div className="text-xs text-slate-500">Loading...</div>}>
        <LoginForm />
      </Suspense>
    </div>
  )
}
