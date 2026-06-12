import { View } from 'react-native'
import qrcodeFn from 'qrcode-generator'

// The shipped @types/qrcode-generator omit the matrix accessors the library
// actually exposes, so type the bits we use locally.
type QrModel = {
  addData(data: string): void
  make(): void
  getModuleCount(): number
  isDark(row: number, col: number): boolean
}
const makeQr = qrcodeFn as unknown as (type: number, ecl: string) => QrModel

/**
 * Renders a QR code using only React Native <View>s (no native modules), so it
 * ships fine over OTA. Each row is collapsed into runs of same-colour modules to
 * keep the view count low.
 */
export function QrCode({ value, size = 220 }: { value: string; size?: number }) {
  const qr = makeQr(0, 'M') // auto version, medium error correction
  qr.addData(value)
  qr.make()

  const count = qr.getModuleCount()
  const cell = Math.max(1, Math.floor(size / count))
  const dim = cell * count

  const rows: React.ReactNode[] = []
  for (let r = 0; r < count; r++) {
    const segs: React.ReactNode[] = []
    let c = 0
    while (c < count) {
      const dark = qr.isDark(r, c)
      let len = 1
      while (c + len < count && qr.isDark(r, c + len) === dark) len++
      segs.push(
        <View
          key={c}
          style={{ width: cell * len, height: cell, backgroundColor: dark ? '#000' : '#fff' }}
        />,
      )
      c += len
    }
    rows.push(
      <View key={r} style={{ flexDirection: 'row', height: cell }}>
        {segs}
      </View>,
    )
  }

  return <View style={{ width: dim, height: dim, backgroundColor: '#fff' }}>{rows}</View>
}
