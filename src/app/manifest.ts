import type { MetadataRoute } from 'next';

export default function manifest(): MetadataRoute.Manifest {
  return {
    name: 'SOI — Diseña tu identidad',
    short_name: 'SOI',
    description: 'Sistema de transformación personal con IA.',
    start_url: '/hoy',
    display: 'standalone',
    background_color: '#FAF7F0',
    theme_color: '#1A1A2E',
    lang: 'es',
    icons: [
      { src: '/icon.svg', sizes: 'any', type: 'image/svg+xml', purpose: 'any' },
      { src: '/icon-maskable.svg', sizes: 'any', type: 'image/svg+xml', purpose: 'maskable' },
    ],
  };
}
