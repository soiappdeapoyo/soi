import type { MetadataRoute } from 'next';
import { appUrl } from '@/lib/utils';

export default function robots(): MetadataRoute.Robots {
  const base = appUrl();
  return {
    rules: [{ userAgent: '*', allow: ['/', '/emociones', '/login', '/privacidad', '/terminos'], disallow: ['/api/', '/chat', '/hoy', '/impulso', '/mi-vida', '/yo', '/perfil', '/ajustes', '/evidencias', '/comunidad'] }],
    sitemap: `${base}/sitemap.xml`,
  };
}
