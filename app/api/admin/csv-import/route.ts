import { NextRequest, NextResponse } from 'next/server'
import { prisma } from '@/lib/prisma'
import { getCurrentUser } from '@/lib/auth'
import { Role } from '@prisma/client'
import Papa from 'papaparse'
import { createAuditLog } from '@/lib/audit'

interface RawCSVRow {
  brand_name?: string
  brandName?: string
  generic_name?: string
  genericName?: string
  strength?: string
  dosage_form?: string
  dosageForm?: string
  manufacturer?: string
  manufacturer_name?: string
  pack_description?: string
  purchase_unit?: string
  retail_unit?: string
  search_keywords?: string
  barcode?: string
  [key: string]: string | undefined
}


export async function POST(req: NextRequest) {
  try {
    const user = await getCurrentUser()
    if (!user || user.role !== Role.ADMIN) {
      return NextResponse.json({ error: 'Admin access required' }, { status: 403 })
    }

    const contentType = req.headers.get('content-type') || ''
    let csvText = ''
    let isDryRun = false

    if (contentType.includes('multipart/form-data')) {
      const formData = await req.formData()
      const file = formData.get('file') as File | null
      const mode = formData.get('mode') as string | null
      isDryRun = mode === 'validate'

      if (!file) {
        return NextResponse.json({ error: 'No CSV file provided' }, { status: 400 })
      }
      csvText = await file.text()
    } else {
      const json = await req.json()
      csvText = json.csv || ''
      isDryRun = json.mode === 'validate'
    }

    if (!csvText || !csvText.trim()) {
      return NextResponse.json({ error: 'Empty CSV content' }, { status: 400 })
    }

    const parseResult = Papa.parse<RawCSVRow>(csvText.trim(), {
      header: true,
      skipEmptyLines: true,
      transformHeader: (h) => h.trim().toLowerCase().replace(/[\s-]+/g, '_'),
    })

    if (parseResult.errors.length > 0 && parseResult.data.length === 0) {
      return NextResponse.json(
        { error: `CSV Parsing Error: ${parseResult.errors[0]?.message || 'Invalid format'}` },
        { status: 400 }
      )
    }

    const rows = parseResult.data
    const validRows: Array<{
      brandName: string
      genericName: string
      strength: string
      dosageForm: string
      manufacturerName: string
      packDescription?: string
      purchaseUnit?: string
      retailUnit?: string
      searchKeywords?: string
      barcode?: string
      rowNumber: number
    }> = []

    const rowErrors: Array<{ row: number; error: string }> = []
    const newManufacturers = new Set<string>()

    // Fetch existing manufacturers to detect new vs existing
    const existingMfgs = await prisma.manufacturer.findMany({
      select: { id: true, name: true, shortName: true },
    })
    const mfgLookup = new Map<string, string>()
    for (const m of existingMfgs) {
      mfgLookup.set(m.name.toLowerCase().trim(), m.id)
      if (m.shortName) {
        mfgLookup.set(m.shortName.toLowerCase().trim(), m.id)
      }
    }

    for (let i = 0; i < rows.length; i++) {
      const r = rows[i]
      const rowNum = i + 2 // considering 1-based indexing + header

      const brand = (r.brand_name || r.brandname || '').trim()
      const generic = (r.generic_name || r.genericname || '').trim()
      const strength = (r.strength || '').trim()
      const form = (r.dosage_form || r.dosageform || 'Tablet').trim()
      const mfg = (r.manufacturer || r.manufacturer_name || '').trim()

      if (!brand) {
        rowErrors.push({ row: rowNum, error: 'Missing brand name' })
        continue
      }
      if (!generic) {
        rowErrors.push({ row: rowNum, error: 'Missing generic name' })
        continue
      }
      if (!strength) {
        rowErrors.push({ row: rowNum, error: 'Missing strength' })
        continue
      }
      if (!mfg) {
        rowErrors.push({ row: rowNum, error: 'Missing manufacturer name' })
        continue
      }

      if (!mfgLookup.has(mfg.toLowerCase())) {
        newManufacturers.add(mfg)
      }

      validRows.push({
        brandName: brand,
        genericName: generic,
        strength,
        dosageForm: form,
        manufacturerName: mfg,
        packDescription: (r.pack_description || '').trim() || undefined,
        purchaseUnit: (r.purchase_unit || 'Box').trim(),
        retailUnit: (r.retail_unit || 'Tablet').trim(),
        searchKeywords: (r.search_keywords || '').trim() || undefined,
        barcode: (r.barcode || '').trim() || undefined,
        rowNumber: rowNum,
      })
    }

    // If dry run, return validation report only
    if (isDryRun) {
      return NextResponse.json({
        validationOnly: true,
        totalRows: rows.length,
        validCount: validRows.length,
        errorCount: rowErrors.length,
        errors: rowErrors.slice(0, 50),
        newManufacturers: Array.from(newManufacturers),
        preview: validRows.slice(0, 10),
      })
    }

    // Execute actual import
    // 1. Create missing manufacturers
    for (const newMfg of newManufacturers) {
      const lower = newMfg.toLowerCase()
      if (!mfgLookup.has(lower)) {
        const created = await prisma.manufacturer.create({
          data: { name: newMfg },
        })
        mfgLookup.set(lower, created.id)
      }
    }

    // 2. Import valid medicines (upsert or create)
    let importedCount = 0
    let updatedCount = 0

    for (const row of validRows) {
      const mfgId = mfgLookup.get(row.manufacturerName.toLowerCase())
      if (!mfgId) continue

      const existingMed = await prisma.medicine.findFirst({
        where: {
          brandName: { equals: row.brandName },
          strength: { equals: row.strength },
          manufacturerId: mfgId,
        },
      })

      if (existingMed) {
        await prisma.medicine.update({
          where: { id: existingMed.id },
          data: {
            genericName: row.genericName,
            dosageForm: row.dosageForm,
            packDescription: row.packDescription ?? existingMed.packDescription,
            purchaseUnit: row.purchaseUnit ?? existingMed.purchaseUnit,
            retailUnit: row.retailUnit ?? existingMed.retailUnit,
            searchKeywords: row.searchKeywords ?? existingMed.searchKeywords,
            barcode: row.barcode ?? existingMed.barcode,
            isActive: true,
          },
        })
        updatedCount++
      } else {
        await prisma.medicine.create({
          data: {
            brandName: row.brandName,
            genericName: row.genericName,
            strength: row.strength,
            dosageForm: row.dosageForm,
            manufacturerId: mfgId,
            packDescription: row.packDescription,
            purchaseUnit: row.purchaseUnit || 'Box',
            retailUnit: row.retailUnit || 'Tablet',
            searchKeywords: row.searchKeywords,
            barcode: row.barcode,
            isActive: true,
          },
        })
        importedCount++
      }
    }

    await createAuditLog('CSV_IMPORTED', {
      userId: user.userId,
      details: `Imported ${importedCount} new medicines, updated ${updatedCount} existing medicines from CSV (${rowErrors.length} errors).`,
    })

    return NextResponse.json({
      success: true,
      importedCount,
      updatedCount,
      errorCount: rowErrors.length,
      errors: rowErrors.slice(0, 50),
      newManufacturersCreated: newManufacturers.size,
    })
  } catch (error) {
    console.error('CSV import error:', error)
    return NextResponse.json({ error: 'Failed to process CSV file' }, { status: 500 })
  }
}
