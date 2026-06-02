import { existsSync } from 'node:fs'
import { resolve } from 'node:path'
import express from 'express'
import type { Request, Response, NextFunction } from 'express'
import cors from 'cors'
import {
  PORT,
  PUBLIC_URL,
  SERVER_ID,
  SERVER_NAME,
  TOKEN,
  serverRoot,
} from './config.js'
import { initDb } from './db.js'
import { requireAuth } from './auth.js'
import { syncRouter } from './sync.js'
import { pairRouter } from './pair.js'

const app = express()
app.use(cors())
app.use(express.json({ limit: '8mb' }))

// --- health check (open, for connectivity/pairing probes) ---
app.get('/api/health', (_req: Request, res: Response) => {
  res.json({ ok: true, name: SERVER_NAME, serverId: SERVER_ID, time: Date.now() })
})

// --- pairing page (open; privacy via Tailscale) ---
app.use('/', pairRouter)

// --- protected data API ---
app.use('/api', requireAuth, syncRouter)

// --- optionally serve the built web app (apps/web/dist) ---
const webDist = resolve(serverRoot, '../web/dist')
const servesWeb = existsSync(webDist)
if (servesWeb) {
  app.use(express.static(webDist))
  // SPA fallback for non-API, non-pairing routes
  app.get('*', (req: Request, res: Response, next: NextFunction) => {
    if (req.path.startsWith('/api') || req.path.startsWith('/pair')) return next()
    res.sendFile(resolve(webDist, 'index.html'))
  })
}

// --- error handler ---
app.use((err: unknown, _req: Request, res: Response, _next: NextFunction) => {
  console.error('[server] error:', err)
  res.status(500).json({ error: 'internal_error' })
})

await initDb()

app.listen(PORT, () => {
  const line = '─'.repeat(54)
  console.log(line)
  console.log(`  ${SERVER_NAME} server running`)
  console.log(`  Local:    http://localhost:${PORT}`)
  console.log(`  Public:   ${PUBLIC_URL}`)
  console.log(`  Pair:     ${PUBLIC_URL}/pair`)
  console.log(`  Web app:  ${servesWeb ? `${PUBLIC_URL}/` : '(not built — run "npm run build" in apps/web)'}`)
  console.log(`  Token:    ${TOKEN.slice(0, 8)}…  (full token on the /pair page)`)
  console.log(line)
})
