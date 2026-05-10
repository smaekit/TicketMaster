import './instrument'
import app from './app'
import boss from './lib/boss'
import { startClassifyWorker } from './lib/classify'
import { startAutoResolveWorker } from './lib/auto-resolve'
import { startEmailWorker } from './lib/email-worker'

const PORT = process.env.PORT ?? 3000

await boss.start()
await startClassifyWorker()
await startAutoResolveWorker()
await startEmailWorker()

const server = app.listen(PORT, () => {
  console.log(`Server running on http://localhost:${PORT}`)
})

async function shutdown() {
  server.close()
  await boss.stop()
}

process.on('SIGTERM', shutdown)
process.on('SIGINT', shutdown)
