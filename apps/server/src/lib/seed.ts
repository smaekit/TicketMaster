import { auth } from './auth'
import { prisma } from './prisma'

async function seed() {
  console.log('Seeding database...')

  const existing = await prisma.user.findUnique({
    where: { email: 'admin@ticketmaster.local' },
  })

  if (!existing) {
    await auth.api.signUpEmail({
      body: { email: 'admin@ticketmaster.local', password: 'admin123', name: 'Admin' },
    })
    console.log('Admin seeded: admin@ticketmaster.local')
  } else {
    console.log('Admin already exists, skipping.')
  }

  await prisma.$disconnect()
}

seed().catch((err) => {
  console.error(err)
  process.exit(1)
})
