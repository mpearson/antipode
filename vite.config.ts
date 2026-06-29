import { defineConfig } from 'vite';
import { VitePWA } from 'vite-plugin-pwa';

// GitHub Pages project site is served under /antipode/, so every absolute URL
// (assets, the service worker, manifest icons) must be prefixed. If this ever
// moves to a custom domain or user-site root, change base to '/' and update the
// manifest start_url/scope below to match.
export default defineConfig({
  base: '/antipode/',
  plugins: [
    VitePWA({
      registerType: 'autoUpdate',
      injectRegister: 'auto',
      workbox: {
        // `json` is what precaches the bundled countries-110m.json for offline.
        globPatterns: ['**/*.{js,css,html,json,svg,png,woff2}'],
        // the three.js bundle is large; raise the precache ceiling so nothing is
        // silently dropped from the offline cache.
        maximumFileSizeToCacheInBytes: 4 * 1024 * 1024,
      },
      manifest: {
        name: 'Antipode — see through the ground',
        short_name: 'Antipode',
        description: 'Point your phone at the ground and see the far side of Earth.',
        display: 'standalone',
        orientation: 'any',
        start_url: '/antipode/',
        scope: '/antipode/',
        theme_color: '#05070d',
        background_color: '#05070d',
        icons: [
          { src: 'icons/icon-192.png', sizes: '192x192', type: 'image/png' },
          { src: 'icons/icon-512.png', sizes: '512x512', type: 'image/png' },
          {
            src: 'icons/maskable-512.png',
            sizes: '512x512',
            type: 'image/png',
            purpose: 'maskable',
          },
        ],
      },
    }),
  ],
});
