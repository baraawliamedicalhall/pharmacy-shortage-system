'use client'

import React, { useState, useEffect } from 'react'
import { Download, X } from 'lucide-react'

export function PwaInstallBanner() {
  const [deferredPrompt, setDeferredPrompt] = useState<any>(null)
  const [showBanner, setShowBanner] = useState(false)

  useEffect(() => {
    // Check if already in standalone mode
    const isStandalone = window.matchMedia('(display-mode: standalone)').matches || (window.navigator as any).standalone
    if (isStandalone) return

    const handleBeforeInstallPrompt = (e: Event) => {
      e.preventDefault()
      setDeferredPrompt(e)
      setShowBanner(true)
    }

    window.addEventListener('beforeinstallprompt', handleBeforeInstallPrompt)

    return () => {
      window.removeEventListener('beforeinstallprompt', handleBeforeInstallPrompt)
    }
  }, [])

  const handleInstallClick = async () => {
    if (!deferredPrompt) return
    deferredPrompt.prompt()
    const { outcome } = await deferredPrompt.userChoice
    if (outcome === 'accepted') {
      setShowBanner(false)
    }
    setDeferredPrompt(null)
  }

  if (!showBanner) return null

  return (
    <div className="pwa-banner bg-sky-900 text-white px-4 py-3 border-b border-sky-800 flex items-center justify-between text-xs sm:text-sm">
      <div className="flex items-center gap-2">
        <Download className="w-4 h-4 text-sky-300 shrink-0" />
        <span>Install <strong>Bara-Awlia Medical Hall</strong> app on home screen for 1-tap access!</span>
      </div>
      <div className="flex items-center gap-2">
        <button
          onClick={handleInstallClick}
          className="bg-sky-500 hover:bg-sky-400 text-white font-semibold px-3 py-1 rounded-lg text-xs transition-colors"
        >
          Install
        </button>
        <button
          onClick={() => setShowBanner(false)}
          className="text-sky-300 hover:text-white p-1"
          aria-label="Dismiss"
        >
          <X className="w-4 h-4" />
        </button>
      </div>
    </div>
  )
}
