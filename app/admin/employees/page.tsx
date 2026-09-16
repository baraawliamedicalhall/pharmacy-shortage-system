'use client'

import React, { useState, useEffect } from 'react'
import { Plus, Edit2, Trash2, Users, RefreshCw, X, Shield, KeyRound } from 'lucide-react'
import { ToastContainer, ToastMessage } from '@/components/Toast'

interface EmployeeRecord {
  id: string
  employeeId: string
  name: string
  role: 'ADMIN' | 'EMPLOYEE'
  isActive: boolean
  createdAt: string
  totalReports: number
  reportsToday: number
}

export default function AdminEmployeesPage() {
  const [employees, setEmployees] = useState<EmployeeRecord[]>([])
  const [loading, setLoading] = useState(true)
  const [toasts, setToasts] = useState<ToastMessage[]>([])

  // Modal
  const [isModalOpen, setIsModalOpen] = useState(false)
  const [editingId, setEditingId] = useState<string | null>(null)
  const [employeeIdInput, setEmployeeIdInput] = useState('')
  const [nameInput, setNameInput] = useState('')
  const [passwordInput, setPasswordInput] = useState('')
  const [roleInput, setRoleInput] = useState<'ADMIN' | 'EMPLOYEE'>('EMPLOYEE')
  const [isActiveInput, setIsActiveInput] = useState(true)
  const [saving, setSaving] = useState(false)

  const addToast = (type: 'success' | 'error' | 'info', text: string) => {
    setToasts((prev) => [...prev, { id: Date.now().toString(), type, text }])
  }

  const loadEmployees = async () => {
    try {
      setLoading(true)
      const res = await fetch('/api/admin/employees')
      if (res.ok) {
        const data = await res.json()
        setEmployees(data.employees || [])
      }
    } catch (err) {
      console.error('Error loading employees:', err)
      addToast('error', 'Failed to load employees')
    } finally {
      setLoading(false)
    }
  }

  useEffect(() => {
    loadEmployees()
  }, [])

  const handleOpenCreate = () => {
    setEditingId(null)
    setEmployeeIdInput('')
    setNameInput('')
    setPasswordInput('1234') // standard default PIN
    setRoleInput('EMPLOYEE')
    setIsActiveInput(true)
    setIsModalOpen(true)
  }

  const handleOpenEdit = (emp: EmployeeRecord) => {
    setEditingId(emp.id)
    setEmployeeIdInput(emp.employeeId)
    setNameInput(emp.name)
    setPasswordInput('') // blank = don't change
    setRoleInput(emp.role)
    setIsActiveInput(emp.isActive)
    setIsModalOpen(true)
  }

  const handleSave = async (e: React.FormEvent) => {
    e.preventDefault()
    if (!nameInput.trim()) return

    setSaving(true)
    try {
      if (editingId) {
        // Update
        const payload: any = {
          name: nameInput.trim(),
          role: roleInput,
          isActive: isActiveInput,
        }
        if (passwordInput.trim()) {
          payload.password = passwordInput.trim()
        }

        const res = await fetch(`/api/admin/employees/${editingId}`, {
          method: 'PUT',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify(payload),
        })

        const data = await res.json()
        if (!res.ok) throw new Error(data.error || 'Failed to update employee')

        addToast('success', `Employee ${data.employee.name} updated`)
      } else {
        // Create
        if (!employeeIdInput.trim() || !passwordInput.trim()) {
          addToast('error', 'Please enter Employee ID and PIN')
          setSaving(false)
          return
        }

        const res = await fetch('/api/admin/employees', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({
            employeeId: employeeIdInput.trim().toUpperCase(),
            name: nameInput.trim(),
            password: passwordInput.trim(),
            role: roleInput,
            isActive: isActiveInput,
          }),
        })

        const data = await res.json()
        if (!res.ok) throw new Error(data.error || 'Failed to create employee')

        addToast('success', `Employee ${data.employee.name} created!`)
      }

      setIsModalOpen(false)
      loadEmployees()
    } catch (err: unknown) {
      const msg = err instanceof Error ? err.message : 'Error saving employee'
      addToast('error', msg)
    } finally {
      setSaving(false)
    }
  }

  const handleDelete = async (id: string, empName: string) => {
    if (!confirm(`Delete or deactivate employee "${empName}"?`)) return

    try {
      const res = await fetch(`/api/admin/employees/${id}`, { method: 'DELETE' })
      const data = await res.json()
      if (res.ok) {
        addToast('success', data.message || 'Employee removed')
        loadEmployees()
      } else {
        addToast('error', data.error || 'Failed to remove employee')
      }
    } catch (err) {
      addToast('error', 'Network error deleting employee')
    }
  }

  return (
    <div className="space-y-6">
      <ToastContainer toasts={toasts} onDismiss={(id) => setToasts((prev) => prev.filter((t) => t.id !== id))} />

      {/* Header */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div>
          <h1 className="text-2xl font-black text-slate-900 tracking-tight">Staff & Employees</h1>
          <p className="text-xs text-slate-500 mt-0.5">
            Manage pharmacy staff user accounts, mobile PINs, and permissions
          </p>
        </div>

        <button
          onClick={handleOpenCreate}
          className="px-3.5 py-2 bg-sky-600 hover:bg-sky-700 text-white font-bold rounded-xl text-xs shadow-xs flex items-center gap-1.5 transition-colors self-start cursor-pointer"
        >
          <Plus className="w-4 h-4" />
          <span>Add Employee</span>
        </button>
      </div>

      {/* Employees Table Card */}
      <div className="bg-white rounded-2xl shadow-xs border border-slate-200 overflow-hidden">
        <div className="p-4 border-b border-slate-200 flex items-center justify-between">
          <span className="text-xs font-bold text-slate-700 uppercase tracking-wide">
            Registered Pharmacy Staff ({employees.length})
          </span>
          <button onClick={loadEmployees} className="text-slate-400 hover:text-sky-600 p-1" title="Reload">
            <RefreshCw className={`w-4 h-4 ${loading ? 'animate-spin' : ''}`} />
          </button>
        </div>

        {loading ? (
          <div className="p-8 text-center text-xs text-slate-400">Loading staff...</div>
        ) : employees.length === 0 ? (
          <div className="p-12 text-center text-slate-400">
            <Users className="w-10 h-10 mx-auto mb-2 text-slate-300" />
            <p className="text-sm font-semibold text-slate-700">No staff accounts found</p>
          </div>
        ) : (
          <div className="overflow-x-auto">
            <table className="w-full text-left border-collapse text-xs">
              <thead>
                <tr className="bg-slate-50 text-slate-600 border-b border-slate-200 font-bold uppercase tracking-wider text-[11px]">
                  <th className="p-3.5">Employee ID</th>
                  <th className="p-3.5">Name</th>
                  <th className="p-3.5">Role</th>
                  <th className="p-3.5">Reports Today</th>
                  <th className="p-3.5">Total Reports</th>
                  <th className="p-3.5">Status</th>
                  <th className="p-3.5 text-right">Actions</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-100 text-slate-800">
                {employees.map((emp) => (
                  <tr key={emp.id} className="hover:bg-slate-50/80 transition-colors">
                    <td className="p-3.5 font-mono font-bold text-slate-900">{emp.employeeId}</td>

                    <td className="p-3.5 font-bold text-slate-800">{emp.name}</td>

                    <td className="p-3.5">
                      <span
                        className={`px-2 py-0.5 rounded text-[10px] font-bold uppercase flex items-center gap-1 w-fit ${
                          emp.role === 'ADMIN'
                            ? 'bg-purple-100 text-purple-800'
                            : 'bg-sky-100 text-sky-800'
                        }`}
                      >
                        {emp.role === 'ADMIN' && <Shield className="w-3 h-3" />}
                        <span>{emp.role}</span>
                      </span>
                    </td>

                    <td className="p-3.5 font-bold">
                      <span
                        className={`px-2 py-0.5 rounded-full ${
                          emp.reportsToday > 0 ? 'bg-emerald-100 text-emerald-800' : 'text-slate-400'
                        }`}
                      >
                        {emp.reportsToday}
                      </span>
                    </td>

                    <td className="p-3.5 text-slate-600 font-semibold">{emp.totalReports}</td>

                    <td className="p-3.5">
                      <span
                        className={`px-2 py-0.5 rounded-full font-bold text-[10px] uppercase ${
                          emp.isActive ? 'bg-emerald-100 text-emerald-800' : 'bg-slate-100 text-slate-400'
                        }`}
                      >
                        {emp.isActive ? 'Active' : 'Inactive'}
                      </span>
                    </td>

                    <td className="p-3.5 text-right space-x-1">
                      <button
                        onClick={() => handleOpenEdit(emp)}
                        className="p-1.5 text-slate-400 hover:text-sky-600 hover:bg-sky-50 rounded-lg transition-colors cursor-pointer"
                        title="Edit employee / Reset PIN"
                      >
                        <Edit2 className="w-4 h-4" />
                      </button>
                      <button
                        onClick={() => handleDelete(emp.id, emp.name)}
                        className="p-1.5 text-slate-400 hover:text-rose-600 hover:bg-rose-50 rounded-lg transition-colors cursor-pointer"
                        title="Deactivate / Delete"
                      >
                        <Trash2 className="w-4 h-4" />
                      </button>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
      </div>

      {/* Add / Edit Employee Modal */}
      {isModalOpen && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/60 backdrop-blur-xs">
          <div className="bg-white w-full max-w-md rounded-2xl shadow-2xl border border-slate-200 overflow-hidden">
            <div className="px-5 py-4 bg-slate-900 text-white flex items-center justify-between">
              <h3 className="text-base font-bold">
                {editingId ? 'Edit Employee / Reset PIN' : 'Add New Staff Member'}
              </h3>
              <button onClick={() => setIsModalOpen(false)} className="text-slate-400 hover:text-white p-1">
                <X className="w-5 h-5" />
              </button>
            </div>

            <form onSubmit={handleSave} className="p-5 space-y-4 text-xs">
              <div>
                <label className="font-bold text-slate-700 block mb-1">
                  Employee ID / Login Code <span className="text-rose-600">*</span>
                </label>
                <input
                  type="text"
                  required
                  disabled={!!editingId}
                  placeholder="e.g. EMP005"
                  value={employeeIdInput}
                  onChange={(e) => setEmployeeIdInput(e.target.value.toUpperCase())}
                  className="w-full h-10 px-3 bg-slate-50 border border-slate-300 rounded-xl font-mono uppercase font-bold disabled:bg-slate-200"
                />
              </div>

              <div>
                <label className="font-bold text-slate-700 block mb-1">
                  Full Name <span className="text-rose-600">*</span>
                </label>
                <input
                  type="text"
                  required
                  placeholder="e.g. Shakil Hossain"
                  value={nameInput}
                  onChange={(e) => setNameInput(e.target.value)}
                  className="w-full h-10 px-3 bg-slate-50 border border-slate-300 rounded-xl font-medium"
                />
              </div>

              <div>
                <label className="font-bold text-slate-700 block mb-1 flex items-center justify-between">
                  <span>{editingId ? 'New PIN / Password (leave blank to keep current)' : 'Login PIN / Password'}</span>
                  <KeyRound className="w-3.5 h-3.5 text-slate-400" />
                </label>
                <input
                  type="password"
                  placeholder={editingId ? 'Enter new PIN if changing' : 'e.g. 1234'}
                  value={passwordInput}
                  onChange={(e) => setPasswordInput(e.target.value)}
                  className="w-full h-10 px-3 bg-slate-50 border border-slate-300 rounded-xl font-medium"
                />
              </div>

              <div>
                <label className="font-bold text-slate-700 block mb-1">Role</label>
                <select
                  value={roleInput}
                  onChange={(e) => setRoleInput(e.target.value as any)}
                  className="w-full h-10 px-3 bg-slate-50 border border-slate-300 rounded-xl font-medium"
                >
                  <option value="EMPLOYEE">Employee (Mobile Shortage Entry Only)</option>
                  <option value="ADMIN">Administrator (Full System Access)</option>
                </select>
              </div>

              <div className="flex items-center gap-2 pt-1">
                <input
                  type="checkbox"
                  id="empActive"
                  checked={isActiveInput}
                  onChange={(e) => setIsActiveInput(e.target.checked)}
                  className="w-4 h-4 rounded text-sky-600"
                />
                <label htmlFor="empActive" className="font-bold text-slate-700 cursor-pointer">
                  Account Active (Can log in)
                </label>
              </div>

              <div className="pt-3 border-t border-slate-100 flex items-center justify-end gap-2">
                <button
                  type="button"
                  onClick={() => setIsModalOpen(false)}
                  className="px-4 py-2 bg-slate-100 hover:bg-slate-200 text-slate-700 font-bold rounded-xl"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  disabled={saving}
                  className="px-4 py-2 bg-sky-600 hover:bg-sky-700 text-white font-bold rounded-xl disabled:opacity-50"
                >
                  {saving ? 'Saving...' : editingId ? 'Update Staff' : 'Create Staff'}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  )
}
