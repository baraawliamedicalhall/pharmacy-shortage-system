import { prisma } from '../lib/prisma'

async function testSpeed() {
  console.log('Testing search speed on real dataset...')
  const queries = ['Napa', 'Seclo', 'Paracetamol', 'Square', 'Beximco', 'Monas', 'Ace', 'Ciprocin']

  for (const q of queries) {
    const t0 = performance.now()
    const results = await prisma.medicine.findMany({
      where: {
        isActive: true,
        OR: [
          { brandName: { contains: q } },
          { genericName: { contains: q } },
          { searchKeywords: { contains: q } },
        ],
      },
      include: {
        manufacturer: { select: { name: true, shortName: true } },
      },
      take: 20,
    })
    const elapsed = (performance.now() - t0).toFixed(1)
    console.log(`Query "${q}": found ${results.length} results in ${elapsed}ms. Sample: ${results[0]?.brandName} ${results[0]?.strength} (${results[0]?.manufacturer?.name})`)
  }

  const totalCount = await prisma.medicine.count()
  const mfgCount = await prisma.manufacturer.count()
  const shortageCount = await prisma.shortage.count()
  console.log(`\nTotal Medicines in DB: ${totalCount}`)
  console.log(`Total Manufacturers in DB: ${mfgCount}`)
  console.log(`Total Shortage Reports in DB: ${shortageCount} (Clean slate for live pharmacy reports)`)
}

testSpeed()
  .catch(console.error)
  .finally(async () => {
    await prisma.$disconnect()
  })
