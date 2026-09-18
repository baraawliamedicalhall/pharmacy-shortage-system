import { Role } from '@prisma/client'

export type EmployeeRole = 'ADMIN' | 'MANAGER' | 'PHARMACIST' | 'CASHIER' | 'SALES_REP' | 'EMPLOYEE' | 'RETAILER'

export interface RoleConfig {
  label: string
  shortTitle: string
  description: string
  badgeClass: string
  dotClass: string
  defaultPath: string
}

export const ROLE_CONFIGS: Record<Role, RoleConfig> = {
  ADMIN: {
    label: 'System Administrator',
    shortTitle: 'Admin',
    description: 'Unrestricted control over system settings, staff management, backups, and wholesale',
    badgeClass: 'bg-purple-100 text-purple-800 border-purple-200',
    dotClass: 'bg-purple-500',
    defaultPath: '/admin',
  },
  MANAGER: {
    label: 'Branch Manager',
    shortTitle: 'Manager',
    description: 'Oversees daily pharmacy operations, wholesale management, stock reports, and analytics',
    badgeClass: 'bg-sky-100 text-sky-800 border-sky-200',
    dotClass: 'bg-sky-500',
    defaultPath: '/admin',
  },
  PHARMACIST: {
    label: 'Licensed Pharmacist',
    shortTitle: 'Pharmacist',
    description: 'Manages medicine catalog, reviews shortage entries, and oversees counter dispensing',
    badgeClass: 'bg-emerald-100 text-emerald-800 border-emerald-200',
    dotClass: 'bg-emerald-500',
    defaultPath: '/pos',
  },
  CASHIER: {
    label: 'POS Cashier',
    shortTitle: 'Cashier',
    description: 'Front-desk point-of-sale counter billing, cash handling, and sales receipts',
    badgeClass: 'bg-amber-100 text-amber-800 border-amber-200',
    dotClass: 'bg-amber-500',
    defaultPath: '/pos',
  },
  SALES_REP: {
    label: 'Sales Representative',
    shortTitle: 'Sales Rep',
    description: 'Handles wholesale orders, retailer directory, dues collection, and delivery routes',
    badgeClass: 'bg-indigo-100 text-indigo-800 border-indigo-200',
    dotClass: 'bg-indigo-500',
    defaultPath: '/admin/wholesale',
  },
  EMPLOYEE: {
    label: 'Floor Staff / Assistant',
    shortTitle: 'Staff',
    description: 'Fast shortage reporting from mobile devices and shelf stock lookups',
    badgeClass: 'bg-slate-100 text-slate-700 border-slate-200',
    dotClass: 'bg-slate-500',
    defaultPath: '/',
  },
  RETAILER: {
    label: 'Wholesale Retailer (B2B)',
    shortTitle: 'Retailer',
    description: 'External client pharmacy ordering wholesale pharmaceutical supplies',
    badgeClass: 'bg-teal-100 text-teal-800 border-teal-200',
    dotClass: 'bg-teal-500',
    defaultPath: '/wholesale',
  },
}

export const STAFF_ROLES: Role[] = [
  'ADMIN',
  'MANAGER',
  'PHARMACIST',
  'CASHIER',
  'SALES_REP',
  'EMPLOYEE',
]

export function isAdministrativeRole(role?: Role | string | null): boolean {
  return role === 'ADMIN' || role === 'MANAGER'
}

export function canManageEmployees(role?: Role | string | null): boolean {
  return role === 'ADMIN'
}

export function canAccessPos(role?: Role | string | null): boolean {
  return role ? ['ADMIN', 'MANAGER', 'CASHIER', 'PHARMACIST', 'EMPLOYEE'].includes(role) : false
}

export function canManageWholesale(role?: Role | string | null): boolean {
  return role ? ['ADMIN', 'MANAGER', 'SALES_REP'].includes(role) : false
}
