import { NextRequest, NextResponse } from 'next/server'
import { getCurrentUser } from '@/lib/auth'
import { Role } from '@prisma/client'
import { createDatabaseBackup, listDatabaseBackups } from '@/lib/backup'
import { createAuditLog } from '@/lib/audit'
import fs from 'fs'
import path from 'path'

export async function GET(req: NextRequest) {
  try {
    const user = await getCurrentUser()
    if (!user || user.role !== Role.ADMIN) {
      return NextResponse.json({ error: 'Admin access required' }, { status: 403 })
    }

    const { searchParams } = new URL(req.url)
    const file = searchParams.get('file')

    // Download requested backup file
    if (file) {
      // Validate filename to prevent path traversal
      const safeFilename = path.basename(file)
      if (!safeFilename.endsWith('.db') || !safeFilename.startsWith('pharmacy-')) {
        return NextResponse.json({ error: 'Invalid backup filename' }, { status: 400 })
      }

      const filePath = path.join(process.cwd(), 'backup', safeFilename)
      if (!fs.existsSync(filePath)) {
        return NextResponse.json({ error: 'Backup file does not exist' }, { status: 404 })
      }

      const fileBuffer = fs.readFileSync(filePath)
      return new NextResponse(fileBuffer, {
        headers: {
          'Content-Type': 'application/x-sqlite3',
          'Content-Disposition': `attachment; filename="${safeFilename}"`,
        },
      })
    }

    // List all existing backups
    const backups = listDatabaseBackups()
    return NextResponse.json({ backups })
  } catch (error) {
    console.error('Backup GET error:', error)
    return NextResponse.json({ error: 'Failed to retrieve backups' }, { status: 500 })
  }
}

export async function POST() {
  try {
    const user = await getCurrentUser()
    if (!user || user.role !== Role.ADMIN) {
      return NextResponse.json({ error: 'Admin access required' }, { status: 403 })
    }

    const result = createDatabaseBackup()

    if (!result.success) {
      return NextResponse.json({ error: result.error || 'Backup creation failed' }, { status: 500 })
    }

    await createAuditLog('BACKUP_CREATED', {
      userId: user.userId,
      details: `Created SQLite backup file: ${result.filename}`,
    })

    return NextResponse.json({
      success: true,
      message: `Database backup created successfully: ${result.filename}`,
      filename: result.filename,
    })
  } catch (error) {
    console.error('Backup POST error:', error)
    return NextResponse.json({ error: 'Failed to create database backup' }, { status: 500 })
  }
}
