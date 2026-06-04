import { Router } from 'express'
import type { NextFunction, Request, Response } from 'express'
import QRCode from 'qrcode'
import type { PairingPayload } from '@targetgoals/shared'
import { PUBLIC_URL, SERVER_NAME, TOKEN } from './config.js'

export const pairRouter = Router()

/**
 * Tiny in-memory sliding-window rate limiter. The /pair routes serve the plaintext
 * token, so even though Tailscale is the real boundary, throttle them so a
 * network-adjacent caller can't just script-scrape the token. No external dep.
 */
function rateLimit(max: number, windowMs: number) {
  const hits = new Map<string, number[]>()
  return (req: Request, res: Response, next: NextFunction): void => {
    const ip = req.ip ?? 'unknown'
    const now = Date.now()
    const recent = (hits.get(ip) ?? []).filter((t) => now - t < windowMs)
    recent.push(now)
    hits.set(ip, recent)
    if (recent.length > max) {
      res.status(429).json({ error: 'rate_limited' })
      return
    }
    next()
  }
}

const pairLimit = rateLimit(10, 60_000) // 10 requests / minute / IP

/**
 * Pairing page. Shows a QR encoding the server URL + token for the Android app to
 * scan. The token is visible here, so only open this where you trust the network —
 * over Tailscale that means your own devices.
 */
pairRouter.get('/pair', pairLimit, (_req: Request, res: Response, next: NextFunction) => {
  void (async () => {
    const payload: PairingPayload = { url: PUBLIC_URL, token: TOKEN, name: SERVER_NAME }
    const qrSvg = await QRCode.toString(JSON.stringify(payload), {
      type: 'svg',
      margin: 1,
      width: 264,
      color: { dark: '#0f172a', light: '#ffffff' },
    })
    res.type('html').send(renderPage(payload, qrSvg))
  })().catch(next)
})

// JSON form, in case a client wants to fetch it programmatically.
pairRouter.get('/pair.json', pairLimit, (_req: Request, res: Response) => {
  const payload: PairingPayload = { url: PUBLIC_URL, token: TOKEN, name: SERVER_NAME }
  res.json(payload)
})

function renderPage(payload: PairingPayload, qrSvg: string): string {
  const localhost = payload.url.includes('localhost')
  return `<!doctype html>
<html lang="en">
<head>
<meta charset="utf-8" />
<meta name="viewport" content="width=device-width, initial-scale=1" />
<title>Pair · ${escapeHtml(payload.name)}</title>
<style>
  :root { color-scheme: dark; }
  * { box-sizing: border-box; }
  body {
    margin: 0; min-height: 100vh; display: grid; place-items: center;
    background: #0b1220; color: #e2e8f0;
    font-family: Inter, system-ui, -apple-system, Segoe UI, sans-serif;
    padding: 24px;
  }
  .card {
    width: 100%; max-width: 420px; background: #0f172a;
    border: 1px solid #1e293b; border-radius: 20px; padding: 28px; text-align: center;
  }
  .brand { display:flex; align-items:center; justify-content:center; gap:10px; margin-bottom: 18px; }
  .dot { width: 34px; height: 34px; border-radius: 9px; background: #1E84E3; display:grid; place-items:center; }
  h1 { font-size: 18px; margin: 0; }
  .qr { background:#fff; padding:14px; border-radius:14px; display:inline-block; margin: 8px 0 18px; }
  .qr svg { display:block; }
  .label { font-size: 11px; text-transform: uppercase; letter-spacing: .12em; color:#64748b; margin: 14px 0 4px; text-align:left; }
  .value {
    font-family: ui-monospace, SFMono-Regular, Menlo, monospace; font-size: 13px;
    background:#0b1220; border:1px solid #1e293b; border-radius:10px; padding:10px 12px;
    word-break: break-all; text-align:left; color:#cbd5e1;
  }
  .hint { font-size: 12px; color:#94a3b8; margin-top: 18px; line-height: 1.5; }
  .warn { margin-top: 14px; font-size: 12px; color:#fbbf24; background:#78350f22; border:1px solid #78350f55; border-radius:10px; padding:10px 12px; text-align:left; }
</style>
</head>
<body>
  <div class="card">
    <div class="brand">
      <div class="dot">
        <svg width="20" height="20" viewBox="0 0 24 24" fill="none">
          <circle cx="12" cy="12" r="8" stroke="#fff" stroke-width="2"/>
          <circle cx="12" cy="12" r="3.2" fill="#fff"/>
        </svg>
      </div>
      <h1>Pair with ${escapeHtml(payload.name)}</h1>
    </div>

    <div class="qr">${qrSvg}</div>

    <div class="label">Server URL</div>
    <div class="value">${escapeHtml(payload.url)}</div>

    <div class="label">Token</div>
    <div class="value">${escapeHtml(payload.token)}</div>

    <p class="hint">Open the TargetGoals Tasks app on your phone and scan this code, or
      enter the URL and token manually under Settings → Pairing.</p>

    ${
      localhost
        ? `<div class="warn"><strong>Heads up:</strong> this URL is <code>localhost</code>, which
            only works on this computer. For your phone, set <code>PUBLIC_URL</code> to your
            Tailscale URL (ideally the <code>tailscale serve</code> HTTPS one) and reload.</div>`
        : ''
    }
  </div>
</body>
</html>`
}

function escapeHtml(s: string): string {
  return s
    .replace(/&/g, '&amp;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;')
    .replace(/"/g, '&quot;')
}
