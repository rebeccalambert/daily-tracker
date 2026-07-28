import { defineConfig } from 'vite'
import react from '@vitejs/plugin-react'
import { VitePWA } from 'vite-plugin-pwa'

// Project page on GitHub Pages (https://<user>.github.io/daily-tracker/), not a user/org root page.
const base = '/daily-tracker/'

export default defineConfig({
  base,
  plugins: [
    react(),
    VitePWA({
      registerType: 'autoUpdate',
      manifest: {
        name: 'Daily Tracker',
        short_name: 'Daily',
        description: 'Personal daily tracker — main task, prayer requests, and Habitica to-dos',
        theme_color: '#3b6e64',
        background_color: '#eef0ec',
        display: 'standalone',
        start_url: base,
        icons: [
          { src: 'pwa-192x192.png', sizes: '192x192', type: 'image/png' },
          { src: 'pwa-512x512.png', sizes: '512x512', type: 'image/png' }
        ]
      },
      workbox: {
        globPatterns: ['**/*.{js,css,html,ico,png,svg}']
      }
    })
  ]
})
