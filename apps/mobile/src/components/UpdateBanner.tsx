import { useEffect, useState } from 'react'
import { AppState, Pressable, StyleSheet, Text, View } from 'react-native'
import * as Updates from 'expo-updates'
import Constants from 'expo-constants'
import { colors } from '../theme'

/** Display version we control per release (bumped in app.json -> extra.appVersion),
 * independent of the native version so OTA updates stay runtime-compatible. */
function manifestVersion(manifest: unknown): string | null {
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  const m = manifest as any
  return m?.extra?.expoClient?.extra?.appVersion ?? m?.extra?.appVersion ?? null
}

/**
 * Checks for an over-the-air JS update on launch and when the app foregrounds.
 * If one is available it's downloaded, then a banner offers to restart into it,
 * naming the version (Claude-style "Restart to update to x.x.x").
 * No-ops in Expo Go / dev (Updates.isEnabled is false there).
 */
export function UpdateBanner() {
  const [ready, setReady] = useState(false)
  const [version, setVersion] = useState<string | null>(null)

  async function check() {
    if (!Updates.isEnabled) return
    try {
      const res = await Updates.checkForUpdateAsync()
      if (res.isAvailable) {
        setVersion(manifestVersion(res.manifest))
        await Updates.fetchUpdateAsync()
        setReady(true)
      }
    } catch {
      // offline or update service unavailable — ignore
    }
  }

  useEffect(() => {
    void check()
    const sub = AppState.addEventListener('change', (s) => {
      if (s === 'active') void check()
    })
    return () => sub.remove()
  }, [])

  if (!ready) return null

  return (
    <View style={styles.banner}>
      <View style={styles.textCol}>
        <Text style={styles.title}>
          {version ? `Update available — version ${version}` : 'A new version is ready'}
        </Text>
        <Text style={styles.sub}>Restart to apply the update.</Text>
      </View>
      <Pressable style={styles.btn} onPress={() => void Updates.reloadAsync()}>
        <Text style={styles.btnText}>Restart</Text>
      </Pressable>
      <Pressable onPress={() => setReady(false)} hitSlop={8}>
        <Text style={styles.later}>Later</Text>
      </Pressable>
    </View>
  )
}

/** Current running version, for display elsewhere (e.g. Settings). */
export function currentAppVersion(): string {
  return (
    (Constants.expoConfig?.extra?.appVersion as string | undefined) ??
    Constants.expoConfig?.version ??
    '—'
  )
}

const styles = StyleSheet.create({
  banner: {
    position: 'absolute',
    left: 16,
    right: 16,
    bottom: 70,
    flexDirection: 'row',
    alignItems: 'center',
    gap: 12,
    backgroundColor: colors.surface,
    borderWidth: 1,
    borderColor: colors.border,
    borderRadius: 14,
    paddingHorizontal: 16,
    paddingVertical: 12,
  },
  textCol: { flex: 1 },
  title: { color: colors.text, fontSize: 14, fontWeight: '600' },
  sub: { color: colors.textFaint, fontSize: 12, marginTop: 1 },
  btn: { backgroundColor: colors.accent, borderRadius: 10, paddingHorizontal: 14, paddingVertical: 8 },
  btnText: { color: '#fff', fontWeight: '700' },
  later: { color: colors.textFaint, fontSize: 13 },
})
