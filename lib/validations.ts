import { z } from 'zod'

export const loginSchema = z.object({
  employeeId: z.string().min(1, 'Employee ID or Username is required').trim(),
  password: z.string().min(1, 'Password or PIN is required'),
})

export const shortageCreateSchema = z.object({
  medicineId: z.string().min(1, 'Medicine selection is required'),
  quantity: z.preprocess(
    (val) => (val === '' || val === null || val === undefined ? null : Number(val)),
    z.number().positive('Quantity must be greater than 0').nullable().optional()
  ),
  unit: z.string().trim().default('Box'),
  notes: z.string().trim().max(300, 'Notes cannot exceed 300 characters').nullable().optional(),
})

export const medicineSchema = z.object({
  brandName: z.string().min(1, 'Brand name is required').trim(),
  genericName: z.string().min(1, 'Generic name is required').trim(),
  strength: z.string().min(1, 'Strength is required').trim(),
  dosageForm: z.string().min(1, 'Dosage form is required').trim(),
  manufacturerId: z.string().min(1, 'Manufacturer is required'),
  packDescription: z.string().trim().nullable().optional(),
  purchaseUnit: z.string().trim().default('Box'),
  retailUnit: z.string().trim().default('Tablet'),
  searchKeywords: z.string().trim().nullable().optional(),
  barcode: z.string().trim().nullable().optional(),
  isActive: z.boolean().default(true),
  mrp: z.preprocess((v) => (v === '' || v === null || v === undefined ? null : Number(v)), z.number().nullable().optional()),
  stripPrice: z.preprocess((v) => (v === '' || v === null || v === undefined ? null : Number(v)), z.number().nullable().optional()),
  boxPrice: z.preprocess((v) => (v === '' || v === null || v === undefined ? null : Number(v)), z.number().nullable().optional()),
  tradePrice: z.preprocess((v) => (v === '' || v === null || v === undefined ? null : Number(v)), z.number().nullable().optional()),
  tradeBoxPrice: z.preprocess((v) => (v === '' || v === null || v === undefined ? null : Number(v)), z.number().nullable().optional()),
  unitsPerStrip: z.preprocess((v) => (v === '' || v === null || v === undefined ? null : Number(v)), z.number().int().nullable().optional()),
  stripsPerBox: z.preprocess((v) => (v === '' || v === null || v === undefined ? null : Number(v)), z.number().int().nullable().optional()),
})

export const manufacturerSchema = z.object({
  name: z.string().min(1, 'Manufacturer name is required').trim(),
  shortName: z.string().trim().nullable().optional(),
  isActive: z.boolean().default(true),
})

export const userCreateSchema = z.object({
  employeeId: z.string().min(2, 'Employee ID must be at least 2 characters').trim().toUpperCase(),
  name: z.string().min(2, 'Full name is required').trim(),
  password: z.string().min(4, 'Password or PIN must be at least 4 characters'),
  role: z.enum(['ADMIN', 'EMPLOYEE']).default('EMPLOYEE'),
  isActive: z.boolean().default(true),
})

export const userUpdateSchema = z.object({
  name: z.string().min(2, 'Full name is required').trim(),
  password: z.string().min(4, 'Password or PIN must be at least 4 characters').optional().or(z.literal('')),
  role: z.enum(['ADMIN', 'EMPLOYEE']).default('EMPLOYEE'),
  isActive: z.boolean().default(true),
})
