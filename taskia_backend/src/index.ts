import 'reflect-metadata'
import { createApp } from './app.js'
import { env } from './config/env.js'
import { initDataSource } from './infrastructure/database/data-source.js'
import { initDb } from './infrastructure/database/pool.js'

async function main() {
  await initDb()
  await initDataSource()
  const app = createApp()
  app.listen(env.port, () => {
    console.log(`taskia_backend listening on http://localhost:${env.port}`)
  })
}

main().catch((err) => {
  console.error(err)
  process.exit(1)
})
