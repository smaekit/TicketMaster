import { prisma } from './prisma'

async function seed() {
  console.log('Seeding database...')

  const admin = await prisma.user.upsert({
    where: { email: 'admin@ticketmaster.local' },
    update: {},
    create: {
      email: 'admin@ticketmaster.local',
      name: 'Admin',
      // TODO: replace with a hashed password before production
      password: 'admin123',
      role: 'ADMIN',
    },
  })

  console.log(`Admin seeded: ${admin.email}`)
  await prisma.$disconnect()
}

seed().catch((err) => {
  console.error(err)
  process.exit(1)
})
