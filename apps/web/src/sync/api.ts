import type { SyncPullResponse, SyncPushRequest } from '@targetgoals/shared'

export function normalizeUrl(url: string): string {
  return url.trim().replace(/\/+$/, '')
}

/** Open health probe — confirms the server is reachable. */
export async function checkHealth(url: string): Promise<{ ok: boolean; name: string }> {
  const res = await fetch(`${normalizeUrl(url)}/api/health`)
  if (!res.ok) throw new Error(`Server not reachable (${res.status})`)
  return res.json()
}

/** Push local changes and pull everything newer than `since` in one call. */
export async function postSync(
  url: string,
  token: string,
  body: SyncPushRequest,
): Promise<SyncPullResponse & { applied?: number }> {
  const res = await fetch(`${normalizeUrl(url)}/api/sync`, {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
      Authorization: `Bearer ${token}`,
    },
    body: JSON.stringify(body),
  })
  if (res.status === 401) throw new Error('Invalid token')
  if (!res.ok) throw new Error(`Sync failed (${res.status})`)
  return res.json()
}

/** Verify a URL + token pair by attempting an authenticated pull. */
export async function verifyConnection(url: string, token: string): Promise<void> {
  await checkHealth(url)
  const res = await fetch(`${normalizeUrl(url)}/api/sync?since=0`, {
    headers: { Authorization: `Bearer ${token}` },
  })
  if (res.status === 401) throw new Error('Invalid token')
  if (!res.ok) throw new Error(`Server error (${res.status})`)
}
