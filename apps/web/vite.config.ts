import { defineConfig } from 'vite'
import react from '@vitejs/plugin-react'
import { VitePWA } from 'vite-plugin-pwa'

// https://vite.dev/config/
export default defineConfig({
  plugins: [
    react(),
    VitePWA({
      registerType: 'prompt',
      includeAssets: ['favicon.svg', 'icon-maskable.svg'],
      manifest: {
        name: 'TargetGoals Tasks',
        short_name: 'TargetGoals',
        description:
          'Local-first tasks with recurring daily tasks, streaks, and a completion overview.',
        theme_color: '#1a73e8',
        background_color: '#0b1220',
        display: 'standalone',
        orientation: 'portrait',
        start_url: '/',
        scope: '/',
        icons: [
          { src: 'favicon.svg', sizes: 'any', type: 'image/svg+xml', purpose: 'any' },
          {
            src: 'icon-maskable.svg',
            sizes: 'any',
            type: 'image/svg+xml',
            purpose: 'maskable',
          },
        ],
      },
      workbox: {
        globPatterns: ['**/*.{js,css,html,svg,woff,woff2}'],
        navigateFallback: '/index.html',
        // Don't let the SW hijack the sync API or the pairing page when the web
        // app is served by the server.
        navigateFallbackDenylist: [/^\/api/, /^\/pair/],
        cleanupOutdatedCaches: true,
        // Never cache the sync API or pairing page — always hit the network so a
        // stale 401/500 can't be served from cache (the web app and API share an
        // origin in production).
        runtimeCaching: [
          {
            urlPattern: ({ url }) =>
              url.pathname.startsWith('/api') || url.pathname.startsWith('/pair'),
            handler: 'NetworkOnly',
          },
        ],
      },
      devOptions: {
        enabled: false,
      },
    }),
  ],
})
