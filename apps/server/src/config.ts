import { fileURLToPath } from 'node:url'
import { dirname, resolve } from 'node:path'
import { existsSync, mkdirSync, readFileSync, writeFileSync } from 'node:fs'
import { randomBytes, randomUUID } from 'node:crypto'
import dotenv from 'dotenv'

const here = dirname(fileURLToPath(import.meta.url))
/** Package root (works whether run from src/ via tsx or dist/ via node). */
export const serverRoot = resolve(here, '..')

dotenv.config({ path: resolve(serverRoot, '.env') })

export const PORT = Number(process.env.PORT ?? 4000)

/** Directory that holds the database, config, and logs. Never committed. */
export const DATA_DIR = process.env.DATA_DIR
  ? resolve(process.env.DATA_DIR)
  : resolve(serverRoot, 'data')

if (!existsSync(DATA_DIR)) mkdirSync(DATA_DIR, { recursive: true })

export const DB_PATH = resolve(DATA_DIR, 'targetgoals.db')

/**
 * Public base URL clients should call. Defaults to localhost, but for real
 * pairing set PUBLIC_URL to your Tailscale URL (or the `tailscale serve` HTTPS
 * URL) so the QR points somewhere the phone can actually reach.
 */
export const PUBLIC_URL = (
  process.env.PUBLIC_URL ?? `http://localhost:${PORT}`
).replace(/\/+$/, '')

export const SERVER_NAME = process.env.SERVER_NAME ?? 'TargetGoals Tasks'

interface ServerConfig {
  token: string
  serverId: string
  createdAt: string
}

const CONFIG_PATH = resolve(DATA_DIR, 'config.json')

/** Load the persisted server config, generating it (token + id) on first run. */
function loadOrCreateConfig(): ServerConfig {
  if (existsSync(CONFIG_PATH)) {
    try {
      return JSON.parse(readFileSync(CONFIG_PATH, 'utf8')) as ServerConfig
    } catch {
      // fall through and regenerate if the file is corrupt
    }
  }
  const config: ServerConfig = {
    token: randomBytes(32).toString('hex'),
    serverId: randomUUID(),
    createdAt: new Date().toISOString(),
  }
  writeFileSync(CONFIG_PATH, JSON.stringify(config, null, 2), 'utf8')
  return config
}

const config = loadOrCreateConfig()

export const TOKEN = config.token
export const SERVER_ID = config.serverId
