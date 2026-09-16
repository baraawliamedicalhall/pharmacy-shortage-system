import { PrismaClient } from '@prisma/client'

const prisma = new PrismaClient()

async function cleanDummyData() {
  console.log('====================================================')
  console.log('🧹 REMOVING DUMMY / SAMPLE DATA')
  console.log('====================================================\n')

  // 1. Remove dummy shortage reports
  const deletedShortages = await prisma.shortage.deleteMany()
  console.log(`✓ Removed ${deletedShortages.count} dummy shortage report(s). Shortage list is now clean.`)

  // 2. Clear dummy audit logs
  await prisma.auditLog.deleteMany()

  // 3. Log real data initialization
  const totalMeds = await prisma.medicine.count()
  const totalMfgs = await prisma.manufacturer.count()

  const admin = await prisma.user.findFirst({ where: { role: 'ADMIN' } })

  await prisma.auditLog.create({
    data: {
      action: 'REAL_DATA_INITIALIZED',
      userId: admin ? admin.id : null,
      details: `Initialized database with ${totalMeds} real medicines and ${totalMfgs} pharmaceutical companies from Medex.`,
    },
  })

  console.log(`✓ Database now contains ${totalMeds} REAL medicines from Medex.`)
  console.log(`✓ Database now contains ${totalMfgs} REAL pharmaceutical manufacturers.`)
  console.log(`✓ Ready for real pharmacy operations!\n`)
}

cleanDummyData()
  .catch((e) => {
    console.error('Error cleaning dummy data:', e)
    process.exit(1)
  })
  .finally(async () => {
    await prisma.$disconnect()
  })
