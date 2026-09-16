const CACHE_NAME = 'pharmacy-shortage-v2'
const STATIC_ASSETS = [
  '/manifest.json',
  '/icons/icon-192.png',
  '/icons/icon-512.png',
]

self.addEventListener('install', (event) => {
  event.waitUntil(
    caches.open(CACHE_NAME).then((cache) => {
      return cache.addAll(STATIC_ASSETS).catch((err) => {
        console.warn('Failed to pre-cache some assets:', err)
      })
    })
  )
  self.skipWaiting()
})

self.addEventListener('activate', (event) => {
  // Purge all old caches (including v1 and stale page caches)
  event.waitUntil(
    caches.keys().then((keys) => {
      return Promise.all(
        keys.filter((key) => key !== CACHE_NAME).map((key) => caches.delete(key))
      )
    })
  )
  self.clients.claim()
})

self.addEventListener('fetch', (event) => {
  const url = event.request.url

  // Never intercept or cache API requests, Next.js internal chunks/HMR/Turbopack, or auth routes
  if (
    url.includes('/api/') ||
    url.includes('/_next/') ||
    url.includes('__next') ||
    url.includes('/login')
  ) {
    return
  }

  // Only handle GET requests
  if (event.request.method !== 'GET') {
    return
  }

  // For page navigations, always fetch from network live to guarantee fresh auth state
  if (event.request.mode === 'navigate') {
    event.respondWith(
      fetch(event.request).catch((err) => {
        console.warn('Network navigation failed:', err)
        return new Response(
          '<!DOCTYPE html><html><body style="font-family:sans-serif;padding:2rem;text-align:center;"><h2>Offline</h2><p>Cannot reach the Pharmacy Local Server. Please ensure you are connected to the pharmacy Wi-Fi router.</p></body></html>',
          { headers: { 'Content-Type': 'text/html; charset=utf-8' } }
        )
      })
    )
    return
  }

  // Cache-first for icons and manifest
  event.respondWith(
    caches.match(event.request).then((cachedResponse) => {
      if (cachedResponse) {
        return cachedResponse
      }
      return fetch(event.request)
    })
  )
})
