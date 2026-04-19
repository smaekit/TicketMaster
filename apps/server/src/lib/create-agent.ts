import { auth } from './auth'
import { prisma } from './prisma'

async function createAgent() {
  const email = process.env.AGENT_EMAIL
  const password = process.env.AGENT_PASSWORD
  const name = process.env.AGENT_NAME ?? 'Agent'

  if (!email || !password) {
    throw new Error('AGENT_EMAIL and AGENT_PASSWORD must be set')
  }

  const existing = await prisma.user.findUnique({ where: { email } })
  if (existing) {
    console.log(`User already exists: ${email}`)
    await prisma.$disconnect()
    return
  }

  await auth.api.signUpEmail({ body: { email, password, name } })
  console.log(`Agent created: ${email}`)

  await prisma.$disconnect()
}

createAgent().catch((err) => {
  console.error(err)
  process.exit(1)
})
