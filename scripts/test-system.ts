import { prisma } from '../lib/prisma'
import { hashPassword, verifyPassword, signSession, verifySession } from '../lib/auth'
import { checkRateLimit, resetRateLimit } from '../lib/rate-limit'
import { createDatabaseBackup, listDatabaseBackups } from '../lib/backup'
import { getLocalNetworkInterfaces } from '../lib/network'
import Papa from 'papaparse'

async function runTests() {
  console.log('====================================================')
  console.log('🧪 RUNNING COMPREHENSIVE INTEGRATION & UNIT TESTS')
  console.log('====================================================\n')

  let passed = 0
  let failed = 0

  const assert = (condition: boolean, message: string) => {
    if (condition) {
      console.log(`  ✓ ${message}`)
      passed++
    } else {
      console.error(`  ❌ FAILED: ${message}`)
      failed++
    }
  }

  // TEST 1: Password & PIN Hashing
  console.log('[Test Suite 1: Authentication & Password Security]')
  const pin = '1234'
  const hashedPin = await hashPassword(pin)
  assert(await verifyPassword('1234', hashedPin), 'Password verification succeeds for correct PIN')
  assert(!(await verifyPassword('9999', hashedPin)), 'Password verification rejects wrong PIN')

  // TEST 2: JWT Session Token
  console.log('\n[Test Suite 2: JWT Session Creation & Verification]')
  const sessionToken = await signSession({
    userId: 'test-user-id',
    employeeId: 'EMP001',
    name: 'Rahim Ahmed',
    role: 'EMPLOYEE' as any,
  })
  const verifiedPayload = await verifySession(sessionToken)
  assert(verifiedPayload !== null, 'Session JWT verified successfully')
  assert(verifiedPayload?.employeeId === 'EMP001', 'Session payload contains correct employeeId')
  assert(verifiedPayload?.role === 'EMPLOYEE', 'Session payload contains correct role')

  // TEST 3: Rate Limiting
  console.log('\n[Test Suite 3: Rate Limiter Protection]')
  const testIp = 'test_ip_192_168_1_50'
  resetRateLimit(testIp)
  const r1 = checkRateLimit(testIp, 3, 1000)
  assert(r1.success, 'Attempt 1 within limit allowed')
  const r2 = checkRateLimit(testIp, 3, 1000)
  assert(r2.success, 'Attempt 2 within limit allowed')
  const r3 = checkRateLimit(testIp, 3, 1000)
  assert(r3.success, 'Attempt 3 within limit allowed')
  const r4 = checkRateLimit(testIp, 3, 1000)
  assert(!r4.success, 'Attempt 4 blocked by rate limiter')
  resetRateLimit(testIp)

  // TEST 4: Database Users & Seed Data
  console.log('\n[Test Suite 4: Database Seed & User Existence]')
  const admin = await prisma.user.findUnique({ where: { employeeId: 'ADMIN' } })
  assert(admin !== null && admin.role === 'ADMIN', 'Admin user exists in database')
  const empRahim = await prisma.user.findUnique({ where: { employeeId: 'EMP001' } })
  assert(empRahim !== null && empRahim.role === 'EMPLOYEE', 'Employee EMP001 (Rahim) exists in database')

  // TEST 5: Fast Medicine Search & Spelling Variations
  console.log('\n[Test Suite 5: Fast Medicine Search Queries]')
  const napaMeds = await prisma.medicine.findMany({
    where: {
      isActive: true,
      OR: [
        { brandName: { contains: 'Napa' } },
        { genericName: { contains: 'Paracetamol' } },
        { searchKeywords: { contains: 'nappa' } },
      ],
    },
    include: { manufacturer: true },
  })
  assert(napaMeds.length >= 3, `Found ${napaMeds.length} Napa variations in database`)

  const secloMeds = await prisma.medicine.findMany({
    where: {
      isActive: true,
      brandName: { contains: 'Seclo' },
    },
  })
  assert(secloMeds.length >= 1, `Found ${secloMeds.length} Seclo variants`)

  // TEST 6: Consolidated Duplicate Handling
  console.log('\n[Test Suite 6: Duplicate Shortage Consolidation Logic]')
  const todayStr = new Date().toISOString().slice(0, 10)
  const allTodayShortages = await prisma.shortage.findMany({
    where: { reportedDate: todayStr },
    include: { medicine: true, employee: true },
  })
  assert(allTodayShortages.length > 0, `Found ${allTodayShortages.length} total today shortage records`)

  // Test consolidation grouping
  const groupMap = new Map<string, { count: number; employees: Set<string> }>()
  for (const s of allTodayShortages) {
    if (!groupMap.has(s.medicineId)) {
      groupMap.set(s.medicineId, { count: 0, employees: new Set() })
    }
    const entry = groupMap.get(s.medicineId)!
    entry.count++
    entry.employees.add(s.employee.name)
  }

  // Check Napa 500 consolidation
  const napa500 = napaMeds.find((m) => m.brandName === 'Napa' && m.strength === '500 mg')
  if (napa500 && groupMap.has(napa500.id)) {
    const entry = groupMap.get(napa500.id)!
    assert(entry.count >= 2, `Napa 500 consolidated correctly (${entry.count} reports merged into 1)`)
    assert(entry.employees.size >= 2, `Multiple employees detected for Napa 500: ${Array.from(entry.employees).join(', ')}`)
  } else {
    assert(false, 'Napa 500 shortage group found')
  }

  // TEST 7: Local Database Backup Functionality
  console.log('\n[Test Suite 7: SQLite Database Backup]')
  const backupResult = createDatabaseBackup()
  assert(backupResult.success, `Backup file created: ${backupResult.filename}`)
  const backups = listDatabaseBackups()
  assert(backups.length > 0, `Backups directory contains ${backups.length} backup file(s)`)
  assert(backups[0].sizeBytes > 0, `Backup file size is valid (${backups[0].sizeBytes} bytes)`)

  // TEST 8: Local Network Interface Detection
  console.log('\n[Test Suite 8: Local Network IP Discovery]')
  const netInterfaces = getLocalNetworkInterfaces(3000)
  assert(netInterfaces.length > 0, `Detected network interfaces: ${netInterfaces.map((i) => `${i.name} -> ${i.url}`).join(', ')}`)

  // TEST 9: CSV Parser Validation Logic
  console.log('\n[Test Suite 9: CSV Parsing & Validation]')
  const sampleCsv = `brand_name,generic_name,strength,dosage_form,manufacturer
TestBrandA,GenericA,100 mg,Tablet,Square Pharmaceuticals PLC
TestBrandB,GenericB,20 mg,Capsule,Beximco Pharmaceuticals Ltd.`

  const parsed = Papa.parse(sampleCsv.trim(), {
    header: true,
    skipEmptyLines: true,
  })
  assert(parsed.data.length === 2, `Parsed 2 rows successfully from CSV`)

  console.log('\n====================================================')
  console.log(`TEST SUMMARY: ${passed} Passed, ${failed} Failed`)
  console.log('====================================================')

  if (failed > 0) {
    process.exit(1)
  }
}

runTests()
  .catch((err) => {
    console.error('Test execution failed:', err)
    process.exit(1)
  })
  .finally(async () => {
    await prisma.$disconnect()
  })
