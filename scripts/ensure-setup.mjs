import fs from 'node:fs'
import path from 'node:path'
import { execSync } from 'node:child_process'
import crypto from 'node:crypto'

const rootDir = process.cwd()
const envPath = path.join(rootDir, '.env')
const envExamplePath = path.join(rootDir, '.env.example')
const prismaDir = path.join(rootDir, 'prisma')
const dbPath = path.join(prismaDir, 'dev.db')

console.log('\n=============================================================')
console.log('🏥 BMH Pharmacy System - Auto Environment & Database Verifier')
console.log('=============================================================')

// 1. Ensure .env exists
if (!fs.existsSync(envPath)) {
  console.log('[Auto-Setup] ⚠️  .env file missing. Initializing from .env.example...')
  let envContent = ''
  if (fs.existsSync(envExamplePath)) {
    envContent = fs.readFileSync(envExamplePath, 'utf8')
    // Generate secure random secret if placeholder found
    const randomSecret = crypto.randomBytes(32).toString('hex')
    envContent = envContent.replace(
      'change-this-to-a-secure-random-string-in-production',
      randomSecret
    )
  } else {
    const randomSecret = crypto.randomBytes(32).toString('hex')
    envContent = `# Database connection for SQLite\nDATABASE_URL="file:./dev.db"\n\nSESSION_SECRET="${randomSecret}"\nCOOKIE_SECURE="false"\nPORT=3000\n`
  }
  fs.writeFileSync(envPath, envContent, 'utf8')
  console.log('[Auto-Setup] ✅ Created .env with default SQLite configuration.')
} else {
  console.log('[Auto-Setup] ✓ .env found.')
}

// 2. Ensure Prisma Client is generated
const prismaClientDir = path.join(rootDir, 'node_modules', '.prisma', 'client')
if (!fs.existsSync(prismaClientDir)) {
  console.log('[Auto-Setup] 🔄 Generating Prisma Client...')
  try {
    execSync('npx prisma generate', { stdio: 'inherit', cwd: rootDir })
    console.log('[Auto-Setup] ✅ Prisma Client generated.')
  } catch (err) {
    console.error('[Auto-Setup] ⚠️  Prisma generate error:', err.message)
  }
}

// 3. Ensure SQLite Database exists and is seeded
if (!fs.existsSync(dbPath)) {
  console.log('[Auto-Setup] 📦 Fresh clone detected: prisma/dev.db not found.')
  console.log('[Auto-Setup] 🚀 Initializing SQLite database schema (prisma db push)...')
  try {
    execSync('npx prisma db push --skip-generate', {
      stdio: 'inherit',
      cwd: rootDir,
      env: { ...process.env, DATABASE_URL: 'file:./dev.db' },
    })
    console.log('[Auto-Setup] ✅ Database tables created successfully.')

    console.log('[Auto-Setup] 🌱 Seeding default users (Admin: ADMIN / PIN: 1234) & medicines...')
    execSync('npx tsx prisma/seed.ts', {
      stdio: 'inherit',
      cwd: rootDir,
      env: { ...process.env, DATABASE_URL: 'file:./dev.db' },
    })
    console.log('[Auto-Setup] ✅ Seed completed successfully!')
  } catch (err) {
    console.error('[Auto-Setup] ❌ Database initialization failed:', err.message)
    process.exit(1)
  }
} else {
  console.log('[Auto-Setup] ✓ Database file prisma/dev.db is ready.')
}

console.log('=============================================================\n')
