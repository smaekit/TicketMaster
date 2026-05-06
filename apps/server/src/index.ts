import app from './app'
import boss from './lib/boss'
import { startClassifyWorker } from './lib/classify'

const PORT = process.env.PORT ?? 3000

await boss.start()
await startClassifyWorker()

const server = app.listen(PORT, () => {
  console.log(`Server running on http://localhost:${PORT}`)
})

async function shutdown() {
  server.close()
  await boss.stop()
}

process.on('SIGTERM', shutdown)
process.on('SIGINT', shutdown)
