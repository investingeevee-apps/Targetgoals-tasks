import { useEffect } from 'react'
import { Pressable, StyleSheet, Text, View } from 'react-native'
import { SafeAreaProvider, SafeAreaView } from 'react-native-safe-area-context'
import { StatusBar } from 'expo-status-bar'
import Constants from 'expo-constants'
import { useStore, type MobileScreen } from './src/store'
import { initSync } from './src/sync/store'
import { DailyScreen } from './src/screens/DailyScreen'
import { OverviewScreen } from './src/screens/OverviewScreen'
import { SettingsScreen } from './src/screens/SettingsScreen'
import { Celebration } from './src/components/Celebration'
import { colors } from './src/theme'

const TABS: { key: MobileScreen; label: string; icon: string }[] = [
  { key: 'daily', label: 'Daily', icon: '🔁' },
  { key: 'overview', label: 'Overview', icon: '📊' },
  { key: 'settings', label: 'Sync', icon: '⚙️' },
]

export default function App() {
  const screen = useStore((s) => s.screen)
  const setScreen = useStore((s) => s.setScreen)

  useEffect(() => {
    initSync()
    // expo-notifications warns/limits in Expo Go (remote push removed in SDK 53),
    // so load the local-notification scheduler lazily and only outside Expo Go.
    // The Settings toggles still work in Expo Go; they take effect in a real build.
    if (Constants.executionEnvironment !== 'storeClient') {
      import('./src/notifications/scheduler')
        .then((m) => m.initNotifications())
        .catch(() => {})
    }
  }, [])

  return (
    <SafeAreaProvider>
      <StatusBar style="light" />
      <SafeAreaView style={styles.root} edges={['top', 'bottom']}>
        <View style={styles.body}>
          {screen === 'daily' && <DailyScreen />}
          {screen === 'overview' && <OverviewScreen />}
          {screen === 'settings' && <SettingsScreen />}
        </View>

        <View style={styles.tabBar}>
          {TABS.map((tab) => {
            const active = screen === tab.key
            return (
              <Pressable key={tab.key} style={styles.tab} onPress={() => setScreen(tab.key)}>
                <Text style={[styles.tabIcon, !active && styles.tabInactive]}>{tab.icon}</Text>
                <Text style={[styles.tabLabel, active ? styles.tabActive : styles.tabInactive]}>
                  {tab.label}
                </Text>
              </Pressable>
            )
          })}
        </View>

        <Celebration />
      </SafeAreaView>
    </SafeAreaProvider>
  )
}

const styles = StyleSheet.create({
  root: { flex: 1, backgroundColor: colors.bg },
  body: { flex: 1 },
  tabBar: {
    flexDirection: 'row',
    borderTopWidth: 1,
    borderTopColor: colors.border,
    backgroundColor: colors.surface,
    paddingTop: 8,
    paddingBottom: 6,
  },
  tab: { flex: 1, alignItems: 'center', gap: 2 },
  tabIcon: { fontSize: 18 },
  tabLabel: { fontSize: 11, fontWeight: '600' },
  tabActive: { color: colors.accent },
  tabInactive: { color: colors.textFaint, opacity: 0.8 },
})
