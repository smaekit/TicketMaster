import { auth } from './auth'
import { prisma } from './prisma'

async function seed() {
  const email = process.env.SEED_ADMIN_EMAIL
  const password = process.env.SEED_ADMIN_PASSWORD
  if (!email || !password) {
    throw new Error('SEED_ADMIN_EMAIL and SEED_ADMIN_PASSWORD must be set')
  }

  console.log('Seeding database...')

  const existing = await prisma.user.findUnique({ where: { email } })

  if (!existing) {
    await auth.api.signUpEmail({
      body: { email, password, name: 'Admin' },
    })
  }
  await prisma.user.update({ where: { email }, data: { role: 'ADMIN' } })
  console.log(`Admin ensured: ${email}`)

  await prisma.$disconnect()
}

seed().catch((err) => {
  console.error(err)
  process.exit(1)
})
