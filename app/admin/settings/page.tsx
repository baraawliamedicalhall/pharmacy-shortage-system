'use client'

import React, { useState, useEffect } from 'react'
import {
  Wifi,
  Database,
  Download,
  ShieldCheck,
  QrCode,
  Copy,
  Check,
  RefreshCw,
  HardDrive,
  FileClock,
} from 'lucide-react'
import { ToastContainer, ToastMessage } from '@/components/Toast'

interface NetworkInfo {
  port: number
  primaryUrl: string
  qrDataUrl?: string
  interfaces: Array<{ name: string; ip: string; url: string }>
}

interface BackupFile {
  filename: string
  sizeBytes: number
  createdAt: string
}

interface AuditLogItem {
  id: string
  action: string
  details: string | null
  ipAddress: string | null
  createdAt: string
  user: {
    employeeId: string
    name: string
    role: string
  } | null
}

export default function AdminSettingsPage() {
  const [networkInfo, setNetworkInfo] = useState<NetworkInfo | null>(null)
  const [backups, setBackups] = useState<BackupFile[]>([])
  const [auditLogs, setAuditLogs] = useState<AuditLogItem[]>([])
  const [loading, setLoading] = useState(true)
  const [creatingBackup, setCreatingBackup] = useState(false)
  const [copiedUrl, setCopiedUrl] = useState(false)
  const [toasts, setToasts] = useState<ToastMessage[]>([])

  const addToast = (type: 'success' | 'error' | 'info', text: string) => {
    setToasts((prev) => [...prev, { id: Date.now().toString(), type, text }])
  }

  const loadData = async () => {
    try {
      setLoading(true)
      const [netRes, backupRes, logRes] = await Promise.all([
        fetch('/api/admin/network-info'),
        fetch('/api/admin/backup'),
        fetch('/api/admin/audit-logs'),
      ])

      if (netRes.ok) {
        const netData = await netRes.json()
        setNetworkInfo(netData)
      }

      if (backupRes.ok) {
        const bData = await backupRes.json()
        setBackups(bData.backups || [])
      }

      if (logRes.ok) {
        const lData = await logRes.json()
        setAuditLogs(lData.logs || [])
      }
    } catch (err) {
      console.error('Error loading settings:', err)
      addToast('error', 'Failed to load settings data')
    } finally {
      setLoading(false)
    }
  }

  useEffect(() => {
    loadData()
  }, [])

  // One-click database backup
  const handleCreateBackup = async () => {
    setCreatingBackup(true)
    try {
      const res = await fetch('/api/admin/backup', { method: 'POST' })
      const data = await res.json()

      if (!res.ok) {
        throw new Error(data.error || 'Backup creation failed')
      }

      addToast('success', data.message || 'Backup created successfully!')
      loadData()
    } catch (err: unknown) {
      const msg = err instanceof Error ? err.message : 'Error creating backup'
      addToast('error', msg)
    } finally {
      setCreatingBackup(false)
    }
  }

  const copyToClipboard = (text: string) => {
    navigator.clipboard.writeText(text)
    setCopiedUrl(true)
    addToast('info', 'URL copied to clipboard!')
    setTimeout(() => setCopiedUrl(false), 2000)
  }

  const formatFileSize = (bytes: number) => {
    if (bytes < 1024) return `${bytes} B`
    if (bytes < 1024 * 1024) return `${(bytes / 1024).toFixed(1)} KB`
    return `${(bytes / (1024 * 1024)).toFixed(2)} MB`
  }

  return (
    <div className="space-y-6">
      <ToastContainer toasts={toasts} onDismiss={(id) => setToasts((prev) => prev.filter((t) => t.id !== id))} />

      {/* Page Title */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div>
          <h1 className="text-2xl font-black text-slate-900 tracking-tight">System & Backup</h1>
          <p className="text-xs text-slate-500 mt-0.5">
            Local Wi-Fi server address, QR code for phone connection, and SQLite database backups
          </p>
        </div>

        <button
          onClick={loadData}
          className="p-2 bg-white hover:bg-slate-100 border border-slate-300 rounded-xl text-slate-700 shadow-xs transition-colors self-start"
          title="Reload system info"
        >
          <RefreshCw className={`w-4 h-4 ${loading ? 'animate-spin' : ''}`} />
        </button>
      </div>

      {/* Grid: Network Configuration (Left) + Database Backup (Right) */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        {/* Section 1: Local Network Configuration & QR Code */}
        <div className="bg-white rounded-2xl shadow-xs border border-slate-200 overflow-hidden flex flex-col">
          <div className="p-5 border-b border-slate-200 bg-slate-900 text-white flex items-center justify-between">
            <div className="flex items-center gap-2.5">
              <Wifi className="w-5 h-5 text-emerald-400 animate-pulse" />
              <div>
                <h2 className="text-sm font-bold">Local Wi-Fi Connection</h2>
                <p className="text-[11px] text-slate-400">How employee phones connect without internet</p>
              </div>
            </div>
            <span className="text-[10px] px-2 py-0.5 rounded bg-emerald-950 text-emerald-300 font-bold border border-emerald-800">
              OFFLINE LAN
            </span>
          </div>

          <div className="p-5 space-y-4 flex-1 flex flex-col justify-between text-xs">
            {networkInfo ? (
              <>
                <div className="flex flex-col sm:flex-row items-center gap-5 p-4 bg-slate-50 border border-slate-200 rounded-2xl">
                  {/* QR Code */}
                  {networkInfo.qrDataUrl && (
                    <div className="p-2 bg-white border border-slate-300 rounded-xl shadow-xs shrink-0 text-center">
                      <img
                        src={networkInfo.qrDataUrl}
                        alt="Scan with Phone"
                        className="w-32 h-32 mx-auto"
                      />
                      <div className="text-[10px] font-bold text-slate-600 mt-1 flex items-center justify-center gap-1">
                        <QrCode className="w-3 h-3" />
                        <span>Scan with Phone Camera</span>
                      </div>
                    </div>
                  )}

                  <div className="space-y-2 flex-1 w-full text-left">
                    <div>
                      <span className="font-bold text-slate-700 block uppercase tracking-wider text-[10px]">
                        Primary Connection URL
                      </span>
                      <div className="flex items-center gap-2 mt-1">
                        <code className="text-xs sm:text-sm font-bold font-mono bg-sky-50 text-sky-900 px-3 py-1.5 rounded-lg border border-sky-200 break-all flex-1">
                          {networkInfo.primaryUrl}
                        </code>
                        <button
                          onClick={() => copyToClipboard(networkInfo.primaryUrl)}
                          className="p-2 bg-slate-200 hover:bg-slate-300 text-slate-700 rounded-lg transition-colors shrink-0"
                          title="Copy URL"
                        >
                          {copiedUrl ? <Check className="w-4 h-4 text-emerald-600" /> : <Copy className="w-4 h-4" />}
                        </button>
                      </div>
                    </div>

                    <p className="text-[11px] text-slate-500 leading-relaxed">
                      Staff can connect their phones to the pharmacy Wi-Fi router, open the browser, and
                      type this address (or scan the QR code).
                    </p>
                  </div>
                </div>

                {/* Available Network Interfaces */}
                <div>
                  <span className="font-bold text-slate-700 uppercase tracking-wide text-[11px] block mb-1.5">
                    Server Network Interfaces
                  </span>
                  <div className="space-y-1.5">
                    {networkInfo.interfaces.map((iface) => (
                      <div
                        key={iface.ip}
                        className="p-2.5 bg-slate-50 border border-slate-200 rounded-xl flex items-center justify-between"
                      >
                        <div>
                          <span className="font-bold text-slate-800">{iface.name}</span>
                          <span className="text-slate-400 text-[11px] ml-2 font-mono">({iface.ip})</span>
                        </div>
                        <code className="font-mono text-[11px] text-sky-700 font-semibold">{iface.url}</code>
                      </div>
                    ))}
                  </div>
                </div>
              </>
            ) : (
              <div className="p-8 text-center text-slate-400">Loading network interfaces...</div>
            )}

            <div className="p-3 bg-amber-50 border border-amber-200 text-amber-900 rounded-xl text-[11px]">
              <strong>Important router tip:</strong> Assign a static or reserved IP address to this server
              computer in your router settings so the URL never changes when the router restarts.
            </div>
          </div>
        </div>

        {/* Section 2: SQLite Database Backup */}
        <div className="bg-white rounded-2xl shadow-xs border border-slate-200 overflow-hidden flex flex-col">
          <div className="p-5 border-b border-slate-200 bg-slate-900 text-white flex items-center justify-between">
            <div className="flex items-center gap-2.5">
              <Database className="w-5 h-5 text-sky-400" />
              <div>
                <h2 className="text-sm font-bold">Database Backup & Recovery</h2>
                <p className="text-[11px] text-slate-400">Instant timestamped local SQLite backups</p>
              </div>
            </div>
            <button
              onClick={handleCreateBackup}
              disabled={creatingBackup}
              className="px-3.5 py-1.5 bg-sky-600 hover:bg-sky-500 text-white font-bold rounded-xl text-xs flex items-center gap-1.5 shadow-xs transition-colors disabled:opacity-50 cursor-pointer"
            >
              <HardDrive className="w-3.5 h-3.5" />
              <span>{creatingBackup ? 'Backing up...' : 'Backup Database'}</span>
            </button>
          </div>

          <div className="p-5 space-y-4 flex-1 flex flex-col justify-between text-xs">
            <div>
              <div className="flex items-center justify-between mb-2">
                <span className="font-bold text-slate-700 uppercase tracking-wide text-[11px]">
                  Available Backup Files ({backups.length})
                </span>
                <span className="text-[11px] text-slate-400">Folder: `backup/`</span>
              </div>

              {backups.length === 0 ? (
                <div className="p-8 text-center bg-slate-50 rounded-xl border border-slate-200 text-slate-400">
                  <Database className="w-8 h-8 mx-auto mb-1.5 text-slate-300" />
                  <p className="font-semibold text-slate-600">No backups created yet</p>
                  <p className="text-[11px] mt-0.5">Click "Backup Database" above to create one now.</p>
                </div>
              ) : (
                <div className="space-y-2 max-h-64 overflow-y-auto pr-1">
                  {backups.map((b) => (
                    <div
                      key={b.filename}
                      className="p-3 bg-slate-50 hover:bg-slate-100/80 rounded-xl border border-slate-200 flex items-center justify-between transition-colors"
                    >
                      <div>
                        <div className="font-mono font-bold text-slate-900 text-[11px]">{b.filename}</div>
                        <div className="text-[10px] text-slate-500 mt-0.5 flex items-center gap-2">
                          <span>{formatFileSize(b.sizeBytes)}</span>
                          <span>•</span>
                          <span>{new Date(b.createdAt).toLocaleString()}</span>
                        </div>
                      </div>

                      <a
                        href={`/api/admin/backup?file=${encodeURIComponent(b.filename)}`}
                        download={b.filename}
                        className="px-2.5 py-1.5 bg-white hover:bg-sky-50 text-sky-700 font-bold border border-slate-300 hover:border-sky-300 rounded-lg text-xs flex items-center gap-1 shadow-2xs transition-colors"
                        title="Download backup file"
                      >
                        <Download className="w-3.5 h-3.5" />
                        <span>Download</span>
                      </a>
                    </div>
                  ))}
                </div>
              )}
            </div>

            {/* Manual Backup Instructions */}
            <div className="p-4 bg-slate-50 border border-slate-200 rounded-2xl space-y-1.5 text-[11px] text-slate-600">
              <strong className="text-slate-800 block text-xs">Manual Backup Procedure:</strong>
              <p>
                You can also manually copy the database file at any time without turning off the system:
              </p>
              <code className="block p-2 bg-white rounded border border-slate-200 font-mono text-[10px] text-slate-800">
                copy "prisma\dev.db" "backup\pharmacy-manual.db"
              </code>
              <p className="text-[10px] text-slate-500">
                Store backups on a local USB flash drive or separate hard drive regularly.
              </p>
            </div>
          </div>
        </div>
      </div>

      {/* Audit Log Section */}
      <div className="bg-white rounded-2xl shadow-xs border border-slate-200 overflow-hidden">
        <div className="p-4 border-b border-slate-200 flex items-center justify-between">
          <div className="flex items-center gap-2">
            <FileClock className="w-4 h-4 text-sky-600" />
            <h2 className="text-sm font-bold text-slate-900">
              Audit Logs & Administrative Actions ({auditLogs.length})
            </h2>
          </div>
          <span className="text-xs text-slate-400">Security audit history</span>
        </div>

        {auditLogs.length === 0 ? (
          <div className="p-8 text-center text-xs text-slate-400">No audit logs recorded yet.</div>
        ) : (
          <div className="overflow-x-auto max-h-80 overflow-y-auto">
            <table className="w-full text-left border-collapse text-xs">
              <thead className="sticky top-0 bg-slate-50 text-slate-600 border-b border-slate-200 font-bold text-[10px] uppercase">
                <tr>
                  <th className="p-3">Timestamp</th>
                  <th className="p-3">Action</th>
                  <th className="p-3">User</th>
                  <th className="p-3">Details</th>
                  <th className="p-3">IP</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-100 text-slate-700">
                {auditLogs.map((log) => (
                  <tr key={log.id} className="hover:bg-slate-50/60">
                    <td className="p-3 text-slate-500 font-mono text-[11px] whitespace-nowrap">
                      {new Date(log.createdAt).toLocaleString()}
                    </td>
                    <td className="p-3">
                      <span className="font-bold font-mono text-[10px] px-2 py-0.5 rounded bg-slate-100 text-slate-800">
                        {log.action}
                      </span>
                    </td>
                    <td className="p-3 font-semibold text-slate-800">
                      {log.user ? `${log.user.name} (${log.user.employeeId})` : 'System'}
                    </td>
                    <td className="p-3 text-slate-600">{log.details || '—'}</td>
                    <td className="p-3 font-mono text-[10px] text-slate-400">{log.ipAddress || 'local'}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
      </div>
    </div>
  )
}
