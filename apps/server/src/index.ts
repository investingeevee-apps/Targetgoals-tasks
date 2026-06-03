import { existsSync } from 'node:fs'
import { resolve } from 'node:path'
import express from 'express'
import type { Request, Response, NextFunction } from 'express'
import cors from 'cors'
import {
  PORT,
  PUBLIC_URL,
  SERVER_NAME,
  serverRoot,
} from './config.js'
import { initDb } from './db.js'
import { requireAuth } from './auth.js'
import { syncRouter } from './sync.js'
import { pairRouter } from './pair.js'

const app = express()
// Only allow browser cross-origin requests from local / Tailscale origins. The
// mobile app and curl send no Origin header (allowed); the bundled web app is
// same-origin. This keeps a random website from probing the open health route.
app.use(
  cors({
    origin(origin, cb) {
      if (!origin) return cb(null, true) // native app / curl / same-origin
      try {
        const h = new URL(origin).hostname
        const ok =
          h === 'localhost' ||
          h === '127.0.0.1' ||
          h.endsWith('.ts.net') ||
          /^192\.168\./.test(h) ||
          /^10\./.test(h) ||
          /^172\.(1[6-9]|2\d|3[01])\./.test(h)
        cb(null, ok)
      } catch {
        cb(null, false)
      }
    },
  }),
)
app.use(express.json({ limit: '8mb' }))

// --- health check (open, for connectivity/pairing probes) ---
app.get('/api/health', (_req: Request, res: Response) => {
  // Intentionally minimal: no serverId, so an unauthenticated probe can't
  // fingerprint this instance beyond "a TargetGoals server is here".
  res.json({ ok: true, name: SERVER_NAME, time: Date.now() })
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
  console.log(`  Token:    [configured]  (full token on the ${PUBLIC_URL}/pair page)`)
  console.log(line)
})
