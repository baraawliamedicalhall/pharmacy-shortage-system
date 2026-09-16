import fs from 'fs'
import path from 'path'

export interface BackupInfo {
  filename: string
  sizeBytes: number
  createdAt: string
}

const BACKUP_DIR = path.join(process.cwd(), 'backup')
const DB_FILE = path.join(process.cwd(), 'prisma', 'dev.db')

export function ensureBackupDir() {
  if (!fs.existsSync(BACKUP_DIR)) {
    fs.mkdirSync(BACKUP_DIR, { recursive: true })
  }
}

export function createDatabaseBackup(): { success: boolean; filename: string; filePath: string; error?: string } {
  try {
    ensureBackupDir()

    if (!fs.existsSync(DB_FILE)) {
      return { success: false, filename: '', filePath: '', error: 'Database file prisma/dev.db not found' }
    }

    const now = new Date()
    const pad = (n: number) => n.toString().padStart(2, '0')
    const timestamp = `${now.getFullYear()}-${pad(now.getMonth() + 1)}-${pad(now.getDate())}-${pad(now.getHours())}${pad(now.getMinutes())}${pad(now.getSeconds())}`
    const filename = `pharmacy-${timestamp}.db`
    const destPath = path.join(BACKUP_DIR, filename)

    fs.copyFileSync(DB_FILE, destPath)

    return { success: true, filename, filePath: destPath }
  } catch (err: unknown) {
    const errorMsg = err instanceof Error ? err.message : 'Unknown backup error'
    return { success: false, filename: '', filePath: '', error: errorMsg }
  }
}

export function listDatabaseBackups(): BackupInfo[] {
  try {
    ensureBackupDir()
    const files = fs.readdirSync(BACKUP_DIR)

    return files
      .filter((file) => file.endsWith('.db'))
      .map((file) => {
        const fullPath = path.join(BACKUP_DIR, file)
        const stat = fs.statSync(fullPath)
        return {
          filename: file,
          sizeBytes: stat.size,
          createdAt: stat.birthtime.toISOString(),
        }
      })
      .sort((a, b) => new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime())
  } catch (err) {
    console.error('Error listing backups:', err)
    return []
  }
}
