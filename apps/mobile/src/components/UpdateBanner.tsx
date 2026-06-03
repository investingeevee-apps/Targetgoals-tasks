import { useEffect, useState } from 'react'
import { AppState, Pressable, StyleSheet, Text, View } from 'react-native'
import * as Updates from 'expo-updates'
import { colors } from '../theme'

/**
 * Checks for an over-the-air JS update on launch and when the app foregrounds.
 * If one is available it's downloaded, then a banner offers to restart into it.
 * No-ops in Expo Go / dev (Updates.isEnabled is false there).
 */
export function UpdateBanner() {
  const [ready, setReady] = useState(false)

  async function check() {
    if (!Updates.isEnabled) return
    try {
      const res = await Updates.checkForUpdateAsync()
      if (res.isAvailable) {
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
      <Text style={styles.text}>A new version is ready.</Text>
      <Pressable style={styles.btn} onPress={() => void Updates.reloadAsync()}>
        <Text style={styles.btnText}>Restart</Text>
      </Pressable>
      <Pressable onPress={() => setReady(false)}>
        <Text style={styles.later}>Later</Text>
      </Pressable>
    </View>
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
  text: { color: colors.text, fontSize: 14, flex: 1 },
  btn: { backgroundColor: colors.accent, borderRadius: 10, paddingHorizontal: 14, paddingVertical: 8 },
  btnText: { color: '#fff', fontWeight: '700' },
  later: { color: colors.textFaint, fontSize: 13 },
})
