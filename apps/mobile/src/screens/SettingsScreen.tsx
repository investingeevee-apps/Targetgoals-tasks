import { useEffect, useState } from 'react'
import { ScrollView, StyleSheet, Switch, Text, TextInput, View, Pressable } from 'react-native'
import { CameraView, useCameraPermissions } from 'expo-camera'
import type { BarcodeScanningResult } from 'expo-camera'
import * as Clipboard from 'expo-clipboard'
import * as FileSystem from 'expo-file-system/legacy'
import * as Sharing from 'expo-sharing'
import * as DocumentPicker from 'expo-document-picker'
import type { PairingPayload } from '@targetgoals/shared'
import { useSync } from '../sync/store'
import { useStore } from '../store'
import { formatTime, shiftTime, useNotifPrefs } from '../notifications/store'
import { colors } from '../theme'
import { QrCode } from '../components/QrCode'

function DataSection() {
  const exportData = useStore((s) => s.exportData)
  const importData = useStore((s) => s.importData)
  const [msg, setMsg] = useState<string | null>(null)
  const [isError, setIsError] = useState(false)

  function showImportResult(res: ReturnType<typeof importData>) {
    setIsError(!res.ok)
    setMsg(
      res.ok
        ? `Restored: ${res.counts!.tasks} tasks, ${res.counts!.dailyTasks} habits, ${res.counts!.completions} completions.`
        : res.error ?? 'Import failed.',
    )
  }

  async function onSendFile() {
    try {
      if (!(await Sharing.isAvailableAsync())) {
        setIsError(true)
        setMsg('Sharing is not available on this device — use "Copy to clipboard" instead.')
        return
      }
      const date = new Date().toISOString().slice(0, 10)
      const uri = `${FileSystem.cacheDirectory}targetgoals-backup-${date}.json`
      await FileSystem.writeAsStringAsync(uri, exportData())
      await Sharing.shareAsync(uri, {
        mimeType: 'application/json',
        dialogTitle: 'Send TargetGoals backup',
      })
      setIsError(false)
      setMsg('Backup file ready — sent via the app you picked.')
    } catch {
      setIsError(true)
      setMsg('Could not create the backup file. Try "Copy to clipboard" instead.')
    }
  }

  async function onRestoreFile() {
    try {
      const picked = await DocumentPicker.getDocumentAsync({
        // Backups arrive via email/Drive/Quick Share with inconsistent MIME types,
        // so accept broadly — importData validates the contents anyway.
        type: ['application/json', 'text/plain', 'application/octet-stream'],
        copyToCacheDirectory: true,
      })
      if (picked.canceled || !picked.assets[0]) return
      const text = await FileSystem.readAsStringAsync(picked.assets[0].uri)
      showImportResult(importData(text))
    } catch {
      setIsError(true)
      setMsg('Could not read that file.')
    }
  }

  async function onCopy() {
    await Clipboard.setStringAsync(exportData())
    setIsError(false)
    setMsg('Backup copied to clipboard. Paste it somewhere safe — notes, email, or a file.')
  }
  async function onPaste() {
    showImportResult(importData(await Clipboard.getStringAsync()))
  }

  return (
    <View style={styles.section}>
      <Text style={styles.sectionTitle}>Backup &amp; transfer</Text>
      <Text style={styles.subtle}>
        Your data lives on this device. Send a backup file to your new phone (Quick Share,
        Bluetooth, email…) and restore it there — or keep a copy somewhere safe.
      </Text>
      <View style={styles.btnRow}>
        <Pressable style={[styles.secondaryBtn, styles.flex]} onPress={onSendFile}>
          <Text style={styles.secondaryBtnText}>Send backup file</Text>
        </Pressable>
        <Pressable style={[styles.secondaryBtn, styles.flex]} onPress={onRestoreFile}>
          <Text style={styles.secondaryBtnText}>Restore from file</Text>
        </Pressable>
      </View>
      <View style={styles.btnRow}>
        <Pressable style={[styles.secondaryBtn, styles.flex]} onPress={onCopy}>
          <Text style={styles.secondaryBtnText}>Copy to clipboard</Text>
        </Pressable>
        <Pressable style={[styles.secondaryBtn, styles.flex]} onPress={onPaste}>
          <Text style={styles.secondaryBtnText}>Restore from clipboard</Text>
        </Pressable>
      </View>
      {msg ? <Text style={isError ? styles.error : styles.okMsg}>{msg}</Text> : null}
    </View>
  )
}

/** Shown when connected: generate a QR / copyable details so another device can join. */
function LinkDeviceSection({ url, token }: { url: string; token: string }) {
  const [copied, setCopied] = useState<string | null>(null)
  const payload = JSON.stringify({ url, token, name: 'TargetGoals Tasks' } satisfies PairingPayload)

  async function copy(label: string, text: string) {
    await Clipboard.setStringAsync(text)
    setCopied(label)
  }

  return (
    <View style={styles.linkBox}>
      <Text style={styles.sectionTitle}>Link another device</Text>
      <Text style={styles.subtle}>
        Scan this from another phone (Settings → Scan pairing QR), or copy the URL + token to
        set up the web app. Every paired device then syncs through your server.
      </Text>
      <View style={styles.qrWrap}>
        <View style={styles.qrCard}>
          <QrCode value={payload} size={216} />
        </View>
      </View>
      <View style={styles.btnRow}>
        <Pressable style={[styles.secondaryBtn, styles.flex]} onPress={() => copy('URL', url)}>
          <Text style={styles.secondaryBtnText}>Copy URL</Text>
        </Pressable>
        <Pressable style={[styles.secondaryBtn, styles.flex]} onPress={() => copy('Token', token)}>
          <Text style={styles.secondaryBtnText}>Copy token</Text>
        </Pressable>
      </View>
      {copied ? <Text style={styles.okMsg}>{copied} copied to clipboard.</Text> : null}
    </View>
  )
}

function TimeRow({ label, value, onChange }: { label: string; value: string; onChange: (t: string) => void }) {
  return (
    <View style={styles.timeRow}>
      <Text style={styles.timeLabel}>{label}</Text>
      <View style={styles.stepper}>
        <Pressable style={styles.stepBtn} onPress={() => onChange(shiftTime(value, -30))} hitSlop={6}>
          <Text style={styles.stepText}>−</Text>
        </Pressable>
        <Text style={styles.timeValue}>{formatTime(value)}</Text>
        <Pressable style={styles.stepBtn} onPress={() => onChange(shiftTime(value, 30))} hitSlop={6}>
          <Text style={styles.stepText}>＋</Text>
        </Pressable>
      </View>
    </View>
  )
}

function NotificationsSection() {
  const p = useNotifPrefs()
  const trackColor = { false: colors.surfaceAlt, true: colors.accent }
  return (
    <View style={styles.notifSection}>
      <Text style={styles.sectionTitle}>Notifications</Text>

      <View style={styles.switchRow}>
        <Text style={styles.switchLabel}>Enable notifications</Text>
        <Switch value={p.enabled} onValueChange={p.setEnabled} trackColor={trackColor} />
      </View>

      {p.enabled && (
        <>
          <View style={styles.switchRow}>
            <Text style={styles.switchLabel}>Daily reminder</Text>
            <Switch value={p.dailyReminder} onValueChange={p.setDailyReminder} trackColor={trackColor} />
          </View>
          {p.dailyReminder && (
            <TimeRow label="Remind me at" value={p.dailyTime} onChange={p.setDailyTime} />
          )}

          <View style={styles.switchRow}>
            <Text style={styles.switchLabel}>Streak-at-risk warning</Text>
            <Switch value={p.streakRisk} onValueChange={p.setStreakRisk} trackColor={trackColor} />
          </View>
          {p.streakRisk && (
            <TimeRow label="Warn me at" value={p.streakTime} onChange={p.setStreakTime} />
          )}
        </>
      )}
    </View>
  )
}

function relativeTime(ms: number): string {
  if (!ms) return 'never'
  const diff = Date.now() - ms
  const s = Math.floor(diff / 1000)
  if (s < 60) return 'just now'
  const m = Math.floor(s / 60)
  if (m < 60) return `${m}m ago`
  const h = Math.floor(m / 60)
  if (h < 24) return `${h}h ago`
  return `${Math.floor(h / 24)}d ago`
}

export function SettingsScreen() {
  const status = useSync((s) => s.status)
  const lastError = useSync((s) => s.lastError)
  const savedUrl = useSync((s) => s.url)
  const savedToken = useSync((s) => s.token)
  const connect = useSync((s) => s.connect)
  const disconnect = useSync((s) => s.disconnect)
  const syncNow = useSync((s) => s.syncNow)
  const lastSyncedAt = useStore((s) => s.lastSyncedAt)

  const connected = status === 'idle' || status === 'syncing'
  const [url, setUrl] = useState('')
  const [token, setToken] = useState('')
  const [scanning, setScanning] = useState(false)
  const [busy, setBusy] = useState(false)
  const [permission, requestPermission] = useCameraPermissions()

  useEffect(() => {
    setUrl(savedUrl ?? '')
    setToken(savedToken ?? '')
  }, [savedUrl, savedToken])

  async function onConnect(u = url, t = token) {
    setBusy(true)
    await connect(u, t)
    setBusy(false)
  }

  function onScanned(result: BarcodeScanningResult) {
    if (!scanning) return
    setScanning(false)
    try {
      const payload = JSON.parse(result.data) as PairingPayload
      if (payload.url && payload.token) {
        setUrl(payload.url)
        setToken(payload.token)
        void onConnect(payload.url, payload.token)
      }
    } catch {
      // ignore non-JSON / unrelated codes
    }
  }

  async function openScanner() {
    if (!permission?.granted) {
      const res = await requestPermission()
      if (!res.granted) return
    }
    setScanning(true)
  }

  if (scanning) {
    return (
      <View style={styles.scannerWrap}>
        <CameraView
          style={StyleSheet.absoluteFill}
          facing="back"
          barcodeScannerSettings={{ barcodeTypes: ['qr'] }}
          onBarcodeScanned={onScanned}
        />
        <View style={styles.scannerOverlay}>
          <Text style={styles.scannerText}>Point at the QR on your server's /pair page</Text>
          <Pressable style={styles.secondaryBtn} onPress={() => setScanning(false)}>
            <Text style={styles.secondaryBtnText}>Cancel</Text>
          </Pressable>
        </View>
      </View>
    )
  }

  return (
    <ScrollView style={styles.screen} contentContainerStyle={styles.content}>
      <Text style={styles.h1}>Settings</Text>
      <Text style={styles.subtle}>
        Your tasks and habits are stored on this device — no account needed.
      </Text>

      <NotificationsSection />

      <DataSection />

      <View style={styles.section}>
        <Text style={styles.sectionTitle}>Sync across devices (optional)</Text>
        <Text style={styles.subtle}>
          Run your own TargetGoals server and pair to sync between devices. Everything
          works without it — this is for power users. Open the server's{' '}
          <Text style={styles.code}>/pair</Text> page to scan or copy the URL + token.
        </Text>

        <View style={styles.statusRow}>
          <View style={[styles.dot, { backgroundColor: statusColor(status) }]} />
          <Text style={styles.statusText}>{statusLabel(status)}</Text>
          {connected ? <Text style={styles.subtle}>· synced {relativeTime(lastSyncedAt)}</Text> : null}
        </View>

        {!connected && (
          <Pressable style={styles.primaryBtn} onPress={openScanner}>
            <Text style={styles.primaryBtnText}>Scan pairing QR</Text>
          </Pressable>
        )}

        <Text style={styles.label}>Server URL</Text>
        <TextInput
          style={styles.input}
          value={url}
          onChangeText={setUrl}
          editable={!connected}
          autoCapitalize="none"
          autoCorrect={false}
          keyboardType="url"
          placeholder="https://your-pc.tailnet.ts.net"
          placeholderTextColor={colors.textFaint}
        />

        <Text style={styles.label}>Token</Text>
        <TextInput
          style={styles.input}
          value={token}
          onChangeText={setToken}
          editable={!connected}
          autoCapitalize="none"
          autoCorrect={false}
          secureTextEntry
          placeholder="paste the token from /pair"
          placeholderTextColor={colors.textFaint}
        />

        {lastError && status === 'error' ? <Text style={styles.error}>{lastError}</Text> : null}

        <View style={styles.btnRow}>
          {connected ? (
            <Pressable style={[styles.secondaryBtn, styles.flex]} onPress={disconnect}>
              <Text style={styles.secondaryBtnText}>Disconnect</Text>
            </Pressable>
          ) : (
            <Pressable
              style={[styles.primaryBtn, styles.flex, (busy || !url || !token) && styles.disabled]}
              disabled={busy || !url || !token}
              onPress={() => onConnect()}
            >
              <Text style={styles.primaryBtnText}>{busy ? 'Connecting…' : 'Connect'}</Text>
            </Pressable>
          )}
          <Pressable
            style={[styles.secondaryBtn, !connected && styles.disabled]}
            disabled={!connected}
            onPress={() => syncNow()}
          >
            <Text style={styles.secondaryBtnText}>Sync now</Text>
          </Pressable>
        </View>

        {connected && savedUrl && savedToken ? (
          <LinkDeviceSection url={savedUrl} token={savedToken} />
        ) : null}
      </View>
    </ScrollView>
  )
}

function statusLabel(s: string): string {
  return { disconnected: 'Local only', connecting: 'Connecting…', idle: 'Synced', syncing: 'Syncing…', error: 'Sync error' }[s] ?? s
}
function statusColor(s: string): string {
  return { disconnected: colors.textFaint, connecting: colors.amber, idle: colors.green, syncing: colors.accent, error: colors.rose }[s] ?? colors.textFaint
}

const styles = StyleSheet.create({
  screen: { flex: 1, backgroundColor: colors.bg },
  content: { padding: 20, paddingBottom: 40 },
  h1: { color: '#fff', fontSize: 24, fontWeight: '800' },
  subtle: { color: colors.textDim, fontSize: 13, marginTop: 4 },
  code: { color: colors.text, fontFamily: 'monospace' },
  statusRow: { flexDirection: 'row', alignItems: 'center', gap: 8, marginTop: 18 },
  dot: { width: 10, height: 10, borderRadius: 5 },
  statusText: { color: colors.text, fontWeight: '600' },
  label: { color: colors.textFaint, fontSize: 11, fontWeight: '600', marginTop: 18, marginBottom: 6 },
  input: {
    borderWidth: 1, borderColor: colors.border, backgroundColor: colors.surface,
    borderRadius: 10, paddingHorizontal: 12, paddingVertical: 10, color: colors.text, fontSize: 14,
  },
  error: { color: colors.rose, fontSize: 12, marginTop: 12 },
  okMsg: { color: colors.green, fontSize: 12, marginTop: 12 },
  section: { marginTop: 28, borderTopWidth: 1, borderTopColor: colors.border, paddingTop: 18 },
  btnRow: { flexDirection: 'row', gap: 10, marginTop: 20 },
  flex: { flex: 1 },
  primaryBtn: { backgroundColor: colors.accent, borderRadius: 10, paddingVertical: 12, alignItems: 'center', marginTop: 16 },
  primaryBtnText: { color: '#fff', fontWeight: '700' },
  secondaryBtn: { borderWidth: 1, borderColor: colors.border, borderRadius: 10, paddingVertical: 12, paddingHorizontal: 16, alignItems: 'center' },
  secondaryBtnText: { color: colors.text, fontWeight: '600' },
  disabled: { opacity: 0.5 },
  notifSection: { marginTop: 28, borderTopWidth: 1, borderTopColor: colors.border, paddingTop: 18 },
  sectionTitle: { color: '#fff', fontSize: 16, fontWeight: '700', marginBottom: 6 },
  switchRow: {
    flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between',
    paddingVertical: 10,
  },
  switchLabel: { color: colors.text, fontSize: 14 },
  timeRow: {
    flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between',
    paddingVertical: 6, paddingLeft: 12, marginBottom: 4,
  },
  timeLabel: { color: colors.textDim, fontSize: 13 },
  stepper: { flexDirection: 'row', alignItems: 'center', gap: 12 },
  stepBtn: {
    width: 30, height: 30, borderRadius: 8, borderWidth: 1, borderColor: colors.border,
    alignItems: 'center', justifyContent: 'center',
  },
  stepText: { color: colors.accent, fontSize: 16, fontWeight: '700' },
  timeValue: { color: colors.text, fontSize: 14, fontWeight: '600', minWidth: 72, textAlign: 'center' },
  linkBox: { marginTop: 22, borderWidth: 1, borderColor: colors.border, borderRadius: 12, padding: 14 },
  qrWrap: { alignItems: 'center', marginTop: 14 },
  qrCard: { backgroundColor: '#fff', padding: 12, borderRadius: 12 },
  scannerWrap: { flex: 1, backgroundColor: '#000' },
  scannerOverlay: { position: 'absolute', bottom: 60, left: 0, right: 0, alignItems: 'center', gap: 16 },
  scannerText: { color: '#fff', backgroundColor: 'rgba(0,0,0,0.6)', paddingHorizontal: 14, paddingVertical: 8, borderRadius: 10 },
})
