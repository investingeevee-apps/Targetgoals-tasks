import { registerRootComponent } from 'expo'
import Constants from 'expo-constants'
import App from './App'

registerRootComponent(App)

// The home-screen widget uses a native module that ISN'T present in Expo Go
// (react-native-android-widget calls TurboModuleRegistry.getEnforcing at import,
// which would crash Expo Go). So we load + register it lazily, and only outside
// Expo Go. In a dev/preview/production build it registers normally.
const inExpoGo = Constants.executionEnvironment === 'storeClient'
if (!inExpoGo) {
  Promise.all([import('react-native-android-widget'), import('./src/widget/handler')])
    .then(([widgetLib, handler]) => {
      widgetLib.registerWidgetTaskHandler(handler.widgetTaskHandler)
    })
    .catch((e) => console.warn('[widget] registration skipped:', e?.message))
}
