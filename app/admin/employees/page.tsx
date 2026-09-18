'use client'

import React, { useState, useEffect, useMemo } from 'react'
import {
  Plus,
  Edit2,
  Trash2,
  Users,
  RefreshCw,
  X,
  Shield,
  KeyRound,
  Store,
  Pill,
  CreditCard,
  TrendingUp,
  Smartphone,
  Search,
  Check,
} from 'lucide-react'
import { ToastContainer, ToastMessage } from '@/components/Toast'
import { Role } from '@prisma/client'
import { ROLE_CONFIGS, STAFF_ROLES } from '@/lib/roles'

interface EmployeeRecord {
  id: string
  employeeId: string
  name: string
  role: Role
  isActive: boolean
  createdAt: string
  totalReports: number
  reportsToday: number
}

// Icon mapper for role badges and selector
const ROLE_ICONS: Record<Role, React.ComponentType<{ className?: string }>> = {
  ADMIN: Shield,
  MANAGER: Store,
  PHARMACIST: Pill,
  CASHIER: CreditCard,
  SALES_REP: TrendingUp,
  EMPLOYEE: Smartphone,
  RETAILER: Users,
}

export default function AdminEmployeesPage() {
  const [employees, setEmployees] = useState<EmployeeRecord[]>([])
  const [loading, setLoading] = useState(true)
  const [toasts, setToasts] = useState<ToastMessage[]>([])

  // Search & Filter
  const [searchQuery, setSearchQuery] = useState('')
  const [selectedRoleFilter, setSelectedRoleFilter] = useState<Role | 'ALL'>('ALL')

  // Modal State
  const [isModalOpen, setIsModalOpen] = useState(false)
  const [editingId, setEditingId] = useState<string | null>(null)
  const [employeeIdInput, setEmployeeIdInput] = useState('')
  const [nameInput, setNameInput] = useState('')
  const [passwordInput, setPasswordInput] = useState('')
  const [roleInput, setRoleInput] = useState<Role>('EMPLOYEE')
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
      } else {
        const data = await res.json()
        addToast('error', data.error || 'Failed to load employees')
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
    } catch {
      addToast('error', 'Network error deleting employee')
    }
  }

  // Filtered employees list
  const filteredEmployees = useMemo(() => {
    return employees.filter((emp) => {
      if (selectedRoleFilter !== 'ALL' && emp.role !== selectedRoleFilter) {
        return false
      }
      if (searchQuery.trim()) {
        const q = searchQuery.toLowerCase()
        return (
          emp.name.toLowerCase().includes(q) ||
          emp.employeeId.toLowerCase().includes(q)
        )
      }
      return true
    })
  }, [employees, selectedRoleFilter, searchQuery])

  // Count by role
  const roleCounts = useMemo(() => {
    const counts: Record<string, number> = { ALL: employees.length }
    for (const emp of employees) {
      counts[emp.role] = (counts[emp.role] || 0) + 1
    }
    return counts
  }, [employees])

  return (
    <div className="space-y-6">
      <ToastContainer toasts={toasts} onDismiss={(id) => setToasts((prev) => prev.filter((t) => t.id !== id))} />

      {/* Header */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div>
          <h1 className="text-2xl font-black text-slate-900 tracking-tight flex items-center gap-2">
            <Users className="w-7 h-7 text-sky-600" />
            <span>Staff & Employee Directory</span>
          </h1>
          <p className="text-xs text-slate-500 mt-0.5">
            Configure staff roles, access permissions, login codes, and counter authorization
          </p>
        </div>

        <button
          onClick={handleOpenCreate}
          className="px-4 py-2 bg-sky-600 hover:bg-sky-700 text-white font-bold rounded-xl text-xs shadow-sm flex items-center gap-1.5 transition-colors self-start cursor-pointer"
        >
          <Plus className="w-4 h-4" />
          <span>Add New Staff</span>
        </button>
      </div>

      {/* Role Filters & Search Toolbar */}
      <div className="bg-white p-4 rounded-2xl shadow-xs border border-slate-200 space-y-3">
        <div className="flex flex-col md:flex-row gap-3 items-stretch md:items-center justify-between">
          {/* Search box */}
          <div className="relative flex-1 max-w-md">
            <Search className="w-4 h-4 absolute left-3 top-1/2 -translate-y-1/2 text-slate-400" />
            <input
              type="text"
              placeholder="Search by staff name or login ID..."
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              className="w-full pl-9 pr-8 py-2 text-xs bg-slate-50 border border-slate-200 rounded-xl focus:outline-none focus:ring-2 focus:ring-sky-500 focus:bg-white transition-all font-medium text-slate-800"
            />
            {searchQuery && (
              <button
                onClick={() => setSearchQuery('')}
                className="absolute right-2.5 top-1/2 -translate-y-1/2 text-slate-400 hover:text-slate-600"
              >
                <X className="w-3.5 h-3.5" />
              </button>
            )}
          </div>

          <div className="flex items-center gap-2">
            <span className="text-xs text-slate-400 font-medium">
              Showing {filteredEmployees.length} of {employees.length} staff
            </span>
            <button
              onClick={loadEmployees}
              className="p-2 text-slate-400 hover:text-sky-600 hover:bg-sky-50 rounded-xl transition-colors cursor-pointer"
              title="Refresh staff directory"
            >
              <RefreshCw className={`w-4 h-4 ${loading ? 'animate-spin' : ''}`} />
            </button>
          </div>
        </div>

        {/* Role Pills */}
        <div className="flex items-center gap-1.5 overflow-x-auto pb-1 custom-scrollbar text-xs">
          <button
            onClick={() => setSelectedRoleFilter('ALL')}
            className={`px-3 py-1.5 rounded-xl font-bold flex items-center gap-1.5 whitespace-nowrap transition-colors cursor-pointer ${
              selectedRoleFilter === 'ALL'
                ? 'bg-slate-900 text-white shadow-xs'
                : 'bg-slate-100 hover:bg-slate-200 text-slate-600'
            }`}
          >
            <span>All Roles</span>
            <span
              className={`text-[10px] px-1.5 py-0.2 rounded-full font-bold ${
                selectedRoleFilter === 'ALL' ? 'bg-slate-700 text-slate-200' : 'bg-slate-200 text-slate-700'
              }`}
            >
              {roleCounts.ALL || 0}
            </span>
          </button>

          {STAFF_ROLES.map((role) => {
            const config = ROLE_CONFIGS[role]
            const Icon = ROLE_ICONS[role]
            const isSelected = selectedRoleFilter === role
            const count = roleCounts[role] || 0

            return (
              <button
                key={role}
                onClick={() => setSelectedRoleFilter(role)}
                className={`px-3 py-1.5 rounded-xl font-bold flex items-center gap-1.5 whitespace-nowrap transition-colors cursor-pointer ${
                  isSelected
                    ? 'bg-sky-600 text-white shadow-xs'
                    : 'bg-slate-100 hover:bg-slate-200 text-slate-600'
                }`}
              >
                <Icon className="w-3.5 h-3.5" />
                <span>{config.shortTitle}</span>
                <span
                  className={`text-[10px] px-1.5 py-0.2 rounded-full font-bold ${
                    isSelected ? 'bg-sky-800 text-sky-100' : 'bg-slate-200 text-slate-700'
                  }`}
                >
                  {count}
                </span>
              </button>
            )
          })}
        </div>
      </div>

      {/* Employees Table Card */}
      <div className="bg-white rounded-2xl shadow-xs border border-slate-200 overflow-hidden">
        {loading ? (
          <div className="p-12 text-center text-xs text-slate-400">Loading staff records...</div>
        ) : filteredEmployees.length === 0 ? (
          <div className="p-12 text-center text-slate-400">
            <Users className="w-10 h-10 mx-auto mb-2 text-slate-300" />
            <p className="text-sm font-semibold text-slate-700">No staff found matching filters</p>
            <p className="text-xs text-slate-400 mt-1">Try clearing your search query or role filter.</p>
          </div>
        ) : (
          <div className="overflow-x-auto">
            <table className="w-full text-left border-collapse text-xs">
              <thead>
                <tr className="bg-slate-50 text-slate-600 border-b border-slate-200 font-bold uppercase tracking-wider text-[11px]">
                  <th className="p-3.5">Employee ID</th>
                  <th className="p-3.5">Name</th>
                  <th className="p-3.5">Role &amp; Permissions</th>
                  <th className="p-3.5">Shortages Today</th>
                  <th className="p-3.5">Total Reports</th>
                  <th className="p-3.5">Account Status</th>
                  <th className="p-3.5 text-right">Actions</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-100 text-slate-800">
                {filteredEmployees.map((emp) => {
                  const roleConfig = ROLE_CONFIGS[emp.role] || ROLE_CONFIGS.EMPLOYEE
                  const RoleIcon = ROLE_ICONS[emp.role] || Smartphone

                  return (
                    <tr key={emp.id} className="hover:bg-slate-50/80 transition-colors">
                      <td className="p-3.5 font-mono font-bold text-slate-900">{emp.employeeId}</td>

                      <td className="p-3.5 font-bold text-slate-800">
                        <div>{emp.name}</div>
                        <div className="text-[10px] text-slate-400 font-normal">
                          Created {new Date(emp.createdAt).toLocaleDateString()}
                        </div>
                      </td>

                      <td className="p-3.5">
                        <div className="flex flex-col gap-1 items-start">
                          <span
                            className={`px-2 py-0.5 rounded-md text-[10px] font-bold uppercase flex items-center gap-1.5 border ${roleConfig.badgeClass}`}
                          >
                            <RoleIcon className="w-3 h-3" />
                            <span>{roleConfig.label}</span>
                          </span>
                          <span className="text-[10px] text-slate-500 font-medium line-clamp-1">
                            {roleConfig.description}
                          </span>
                        </div>
                      </td>

                      <td className="p-3.5 font-bold">
                        <span
                          className={`px-2 py-0.5 rounded-full ${
                            emp.reportsToday > 0 ? 'bg-emerald-100 text-emerald-800 font-bold' : 'text-slate-400'
                          }`}
                        >
                          {emp.reportsToday}
                        </span>
                      </td>

                      <td className="p-3.5 text-slate-600 font-semibold">{emp.totalReports}</td>

                      <td className="p-3.5">
                        <span
                          className={`px-2 py-0.5 rounded-full font-bold text-[10px] uppercase inline-flex items-center gap-1 ${
                            emp.isActive ? 'bg-emerald-100 text-emerald-800' : 'bg-slate-100 text-slate-400'
                          }`}
                        >
                          <span
                            className={`w-1.5 h-1.5 rounded-full ${emp.isActive ? 'bg-emerald-500' : 'bg-slate-400'}`}
                          />
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
                  )
                })}
              </tbody>
            </table>
          </div>
        )}
      </div>

      {/* Add / Edit Employee Modal */}
      {isModalOpen && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/60 backdrop-blur-xs overflow-y-auto">
          <div className="bg-white w-full max-w-lg rounded-2xl shadow-2xl border border-slate-200 overflow-hidden my-8">
            <div className="px-5 py-4 bg-slate-900 text-white flex items-center justify-between">
              <div>
                <h3 className="text-base font-bold">
                  {editingId ? 'Edit Employee & Role' : 'Add New Pharmacy Staff Member'}
                </h3>
                <p className="text-xs text-slate-400">
                  {editingId ? 'Update user profile or reassign staff role' : 'Enter login credentials and assign staff role'}
                </p>
              </div>
              <button onClick={() => setIsModalOpen(false)} className="text-slate-400 hover:text-white p-1 cursor-pointer">
                <X className="w-5 h-5" />
              </button>
            </div>

            <form onSubmit={handleSave} className="p-5 space-y-4 text-xs">
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                <div>
                  <label className="font-bold text-slate-700 block mb-1">
                    Employee ID / Login Code <span className="text-rose-600">*</span>
                  </label>
                  <input
                    type="text"
                    required
                    disabled={!!editingId}
                    placeholder="e.g. EMP005 or PHARM01"
                    value={employeeIdInput}
                    onChange={(e) => setEmployeeIdInput(e.target.value.toUpperCase())}
                    className="w-full h-10 px-3 bg-slate-50 border border-slate-300 rounded-xl font-mono uppercase font-bold disabled:bg-slate-200 text-slate-800"
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
                    className="w-full h-10 px-3 bg-slate-50 border border-slate-300 rounded-xl font-medium text-slate-800"
                  />
                </div>
              </div>

              <div>
                <label className="font-bold text-slate-700 block mb-1 flex items-center justify-between">
                  <span>{editingId ? 'New PIN / Password (leave blank to retain current)' : 'Login PIN / Password'}</span>
                  <KeyRound className="w-3.5 h-3.5 text-slate-400" />
                </label>
                <input
                  type="password"
                  placeholder={editingId ? 'Enter new 4+ digit PIN if changing' : 'e.g. 1234'}
                  value={passwordInput}
                  onChange={(e) => setPasswordInput(e.target.value)}
                  className="w-full h-10 px-3 bg-slate-50 border border-slate-300 rounded-xl font-medium text-slate-800"
                />
              </div>

              {/* Role Selection Grid */}
              <div>
                <label className="font-bold text-slate-700 block mb-1.5">
                  Select Assigned Role &amp; Permissions <span className="text-rose-600">*</span>
                </label>
                <div className="space-y-2 max-h-56 overflow-y-auto pr-1 custom-scrollbar">
                  {STAFF_ROLES.map((roleKey) => {
                    const cfg = ROLE_CONFIGS[roleKey]
                    const Icon = ROLE_ICONS[roleKey]
                    const isSelected = roleInput === roleKey

                    return (
                      <div
                        key={roleKey}
                        onClick={() => setRoleInput(roleKey)}
                        className={`p-2.5 rounded-xl border transition-all cursor-pointer flex items-start gap-3 ${
                          isSelected
                            ? 'bg-sky-50/70 border-sky-500 ring-1 ring-sky-400 shadow-xs'
                            : 'bg-slate-50/60 border-slate-200 hover:bg-slate-100/80'
                        }`}
                      >
                        <div
                          className={`w-7 h-7 rounded-lg flex items-center justify-center shrink-0 mt-0.5 ${
                            isSelected ? 'bg-sky-600 text-white' : 'bg-slate-200 text-slate-600'
                          }`}
                        >
                          <Icon className="w-4 h-4" />
                        </div>

                        <div className="flex-1 min-w-0">
                          <div className="flex items-center justify-between gap-1">
                            <span className="font-bold text-slate-900 text-xs">{cfg.label}</span>
                            <span
                              className={`text-[9px] px-1.5 py-0.2 rounded font-bold uppercase ${cfg.badgeClass}`}
                            >
                              {cfg.shortTitle}
                            </span>
                          </div>
                          <p className="text-[11px] text-slate-500 leading-snug mt-0.5">{cfg.description}</p>
                        </div>

                        <div className="pt-0.5 shrink-0">
                          <div
                            className={`w-4 h-4 rounded-full flex items-center justify-center border ${
                              isSelected ? 'bg-sky-600 border-sky-600 text-white' : 'border-slate-300'
                            }`}
                          >
                            {isSelected && <Check className="w-2.5 h-2.5 stroke-[3]" />}
                          </div>
                        </div>
                      </div>
                    )
                  })}
                </div>
              </div>

              <div className="flex items-center gap-2 pt-1">
                <input
                  type="checkbox"
                  id="empActive"
                  checked={isActiveInput}
                  onChange={(e) => setIsActiveInput(e.target.checked)}
                  className="w-4 h-4 rounded text-sky-600 cursor-pointer"
                />
                <label htmlFor="empActive" className="font-bold text-slate-700 cursor-pointer">
                  Account Active (Staff member can log in to their assigned portal)
                </label>
              </div>

              <div className="pt-3 border-t border-slate-100 flex items-center justify-end gap-2">
                <button
                  type="button"
                  onClick={() => setIsModalOpen(false)}
                  className="px-4 py-2 bg-slate-100 hover:bg-slate-200 text-slate-700 font-bold rounded-xl transition-colors cursor-pointer"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  disabled={saving}
                  className="px-4 py-2 bg-sky-600 hover:bg-sky-700 text-white font-bold rounded-xl disabled:opacity-50 transition-colors cursor-pointer"
                >
                  {saving ? 'Saving...' : editingId ? 'Update Staff Member' : 'Create Staff Member'}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  )
}
