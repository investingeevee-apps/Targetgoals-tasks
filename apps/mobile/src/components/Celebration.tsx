import { useEffect } from 'react'
import { Modal, Pressable, StyleSheet, Text, View } from 'react-native'
import { useStore } from '../store'
import { colors } from '../theme'

export function Celebration() {
  const celebration = useStore((s) => s.celebration)
  const dismiss = useStore((s) => s.dismissCelebration)

  useEffect(() => {
    if (!celebration) return
    const big = celebration.kind === 'allDone' || celebration.kind === 'goal'
    const timer = setTimeout(dismiss, big ? 4200 : 3200)
    return () => clearTimeout(timer)
  }, [celebration, dismiss])

  if (!celebration) return null
  const allDone = celebration.kind === 'allDone'
  const goal = celebration.kind === 'goal'
  const streakLabel = `${celebration.streak} day${celebration.streak === 1 ? '' : 's'}`

  return (
    <Modal transparent animationType="fade" visible onRequestClose={dismiss}>
      <Pressable style={styles.backdrop} onPress={dismiss}>
        <View style={styles.card}>
          <Text style={styles.emoji}>{goal ? '🏆' : allDone ? '🎉' : '🔥'}</Text>
          <Text style={styles.title}>
            {goal ? 'Goal achieved!' : allDone ? 'Perfect day!' : "You're on a hot streak!"}
          </Text>
          <Text style={styles.body}>
            {goal
              ? `You reached “${celebration.title ?? 'your goal'}”. That's the whole point.`
              : allDone
                ? `All ${celebration.total} daily tasks complete.`
                : 'First task logged today — keep it going.'}
          </Text>
          {!goal && (
            <View style={[styles.chip, { backgroundColor: allDone ? 'rgba(16,185,129,0.15)' : 'rgba(249,115,22,0.15)' }]}>
              <Text style={[styles.chipText, { color: allDone ? colors.green : colors.orange }]}>
                🔥 {streakLabel} streak
              </Text>
            </View>
          )}
        </View>
      </Pressable>
    </Modal>
  )
}

const styles = StyleSheet.create({
  backdrop: { flex: 1, backgroundColor: 'rgba(0,0,0,0.55)', alignItems: 'center', justifyContent: 'center', padding: 24 },
  card: { width: '100%', maxWidth: 340, backgroundColor: colors.surface, borderRadius: 24, borderWidth: 1, borderColor: colors.border, padding: 28, alignItems: 'center' },
  emoji: { fontSize: 52 },
  title: { color: '#fff', fontSize: 22, fontWeight: '800', marginTop: 8, textAlign: 'center' },
  body: { color: colors.textDim, fontSize: 13, marginTop: 6, textAlign: 'center' },
  chip: { marginTop: 18, paddingHorizontal: 16, paddingVertical: 9, borderRadius: 999 },
  chipText: { fontWeight: '800' },
})
