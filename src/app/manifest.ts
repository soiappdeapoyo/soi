import type { MetadataRoute } from 'next';

/**
 * SOI instalable como app (acceso directo en la pantalla de inicio). Android/Chrome piden PNG de 192 y 512;
 * iOS usa apple-touch-icon (layout). En iOS los avisos push solo funcionan con SOI instalada.
 */
export default function manifest(): MetadataRoute.Manifest {
  return {
    id: '/',
    name: 'SOI — Diseña tu identidad',
    short_name: 'SOI',
    description: 'Momentos de pocos minutos para tu mente y tu día, guiados por voz.',
    start_url: '/hoy?from=app',
    scope: '/',
    display: 'standalone',
    orientation: 'portrait',
    background_color: '#FFFFFF',
    theme_color: '#FFFFFF',
    lang: 'es',
    categories: ['health', 'lifestyle', 'productivity'],
    icons: [
      { src: '/icons/icon-192.png', sizes: '192x192', type: 'image/png', purpose: 'any' },
      { src: '/icons/icon-512.png', sizes: '512x512', type: 'image/png', purpose: 'any' },
      { src: '/icons/maskable-512.png', sizes: '512x512', type: 'image/png', purpose: 'maskable' },
      { src: '/icon.svg', sizes: 'any', type: 'image/svg+xml', purpose: 'any' },
    ],
    shortcuts: [
      { name: 'Hoy', url: '/hoy?from=shortcut', icons: [{ src: '/icons/icon-192.png', sizes: '192x192' }] },
      { name: 'Hablar con SOI', short_name: 'SOI', url: '/chat?nueva=1&from=shortcut', icons: [{ src: '/icons/icon-192.png', sizes: '192x192' }] },
    ],
  };
}
