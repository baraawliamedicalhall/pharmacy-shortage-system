import { PrismaClient } from '@prisma/client'

const prisma = new PrismaClient()

async function check() {
  const brands = [
    'Napa',
    'Napa Extra',
    'Mig',
    'Ace',
    'Ace Plus',
    'Seclo',
    'Maxpro',
    'Finix',
    'Sergel',
    'Pantonix',
    'Monas',
    'Fexo',
    'Coralcal-D',
    'Ceevit',
  ]

  const samples = await prisma.medicine.findMany({
    where: {
      brandName: { in: ['Mig', 'Napa', 'Napa Extra', 'Napa One', 'Seclo', 'Maxpro', 'Finix', 'Pantonix', 'Sergel', 'Monas'] },
    },
    take: 30,
    select: {
      brandName: true,
      strength: true,
      dosageForm: true,
      mrp: true,
      stripPrice: true,
      boxPrice: true,
      tradePrice: true,
      tradeBoxPrice: true,
      unitsPerStrip: true,
      stripsPerBox: true,
      unitsPerBox: true,
      packDescription: true,
    },
  })

  console.log('Sample verified priced medicines in database:')
  console.table(samples)

  // Also check overall DB price stats
  const totalCount = await prisma.medicine.count()
  const pricedCount = await prisma.medicine.count({
    where: {
      mrp: { not: null, gt: 0 },
      boxPrice: { not: null, gt: 0 },
      tradePrice: { not: null, gt: 0 },
    },
  })

  console.log(`\nOverall Price Stats: ${pricedCount} / ${totalCount} (${Math.round((pricedCount / totalCount) * 100)}%) priced!`)
}

check()
  .catch(console.error)
  .finally(() => prisma.$disconnect())
