import express from 'express'
import cors from 'cors'
import cookieParser from 'cookie-parser'
import helmet from 'helmet'
import { env } from './config/env.js'
import { errorHandler } from './middlewares/error.middleware.js'
import { registerRoutes } from './routes/index.js'

export function createApp() {
  const app = express()
  app.use(helmet({ crossOriginResourcePolicy: false }))
  app.use(
    cors({
      origin: env.corsOrigin,
      credentials: true,
      allowedHeaders: [
        'Content-Type',
        'Authorization',
        'X-Timezone',
        'X-Timezone-Offset',
      ],
    }),
  )
  app.use(express.json({ limit: '8mb' }))
  app.use(cookieParser())

  app.get('/health', (_req, res) => {
    res.json({ ok: true })
  })

  registerRoutes(app)

  app.use(errorHandler)
  return app
}
