import { defineConfig } from 'vite'
import react from '@vitejs/plugin-react'
import { VitePWA } from 'vite-plugin-pwa'

export default defineConfig({
  base: '/scarabeo/',
  plugins: [
    react(),
    VitePWA({
      registerType: 'autoUpdate',
      includeAssets: ['icon.svg', 'words-it.txt'],
      manifest: {
        name: 'Scarabeo Splash Solver',
        short_name: 'Scarabeo Solver',
        description: 'Trova parole valide nella griglia 4x4 di Scarabeo Splash.',
        theme_color: '#0f1b1d',
        background_color: '#0f1b1d',
        display: 'standalone',
        icons: [
          {
            src: 'icon.svg',
            sizes: '512x512',
            type: 'image/svg+xml',
            purpose: 'any maskable',
          },
        ],
      },
      workbox: {
        globPatterns: ['**/*.{js,css,html,svg,png,txt}'],
      },
      devOptions: {
        enabled: true,
      },
    }),
  ],
})
