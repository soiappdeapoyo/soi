import type { MetadataRoute } from 'next';
import { appUrl } from '@/lib/utils';

export default function sitemap(): MetadataRoute.Sitemap {
  const base = appUrl();
  return ['', '/login', '/privacidad', '/terminos'].map((p) => ({ url: `${base}${p}`, changeFrequency: 'weekly', priority: p === '' ? 1 : 0.5 }));
}
