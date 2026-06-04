import { Modal, Pressable, StyleSheet, Text, View } from 'react-native'
import { useOnboarding } from '../onboarding'
import { colors } from '../theme'

/** One-time welcome that frames the app as offline-first (no account/server needed). */
export function WelcomeModal() {
  const done = useOnboarding((s) => s.done)
  const hydrated = useOnboarding((s) => s.hydrated)
  const finish = useOnboarding((s) => s.finish)

  if (!hydrated || done) return null

  return (
    <Modal transparent visible animationType="fade" onRequestClose={finish}>
      <View style={styles.backdrop}>
        <View style={styles.card}>
          <View style={styles.mark}>
            <Text style={styles.markText}>◎</Text>
          </View>
          <Text style={styles.title}>Welcome to TargetGoals</Text>
          <Text style={styles.body}>
            Track your tasks and daily habits, and watch your streak grow. Everything is
            stored <Text style={styles.bold}>on this device</Text> — no account, works
            fully offline.
          </Text>
          <View style={styles.points}>
            <Text style={styles.point}>✓  Lists, tasks, and subtasks</Text>
            <Text style={styles.point}>🔁  Daily habits with streaks & overview</Text>
            <Text style={styles.point}>🔒  Your data stays private on your phone</Text>
          </View>
          <Text style={styles.note}>
            Want it on more than one device? You can connect your own sync server later in
            Settings — it's optional.
          </Text>
          <Pressable style={styles.btn} onPress={finish}>
            <Text style={styles.btnText}>Get started</Text>
          </Pressable>
        </View>
      </View>
    </Modal>
  )
}

const styles = StyleSheet.create({
  backdrop: {
    flex: 1,
    backgroundColor: 'rgba(0,0,0,0.6)',
    justifyContent: 'center',
    padding: 24,
  },
  card: {
    backgroundColor: colors.surface,
    borderRadius: 22,
    borderWidth: 1,
    borderColor: colors.border,
    padding: 24,
  },
  mark: {
    alignSelf: 'center',
    width: 56,
    height: 56,
    borderRadius: 16,
    backgroundColor: colors.accent,
    alignItems: 'center',
    justifyContent: 'center',
    marginBottom: 16,
  },
  markText: { color: '#fff', fontSize: 30, lineHeight: 34 },
  title: { color: '#fff', fontSize: 22, fontWeight: '800', textAlign: 'center' },
  body: { color: colors.textDim, fontSize: 14, lineHeight: 20, textAlign: 'center', marginTop: 10 },
  bold: { color: colors.text, fontWeight: '700' },
  points: { marginTop: 18, gap: 10 },
  point: { color: colors.text, fontSize: 14 },
  note: { color: colors.textFaint, fontSize: 12, lineHeight: 17, marginTop: 18 },
  btn: {
    backgroundColor: colors.accent,
    borderRadius: 12,
    paddingVertical: 14,
    alignItems: 'center',
    marginTop: 20,
  },
  btnText: { color: '#fff', fontWeight: '700', fontSize: 15 },
})
