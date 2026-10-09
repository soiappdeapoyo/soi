import type { MetadataRoute } from 'next';
import { appUrl } from '@/lib/utils';
import { EMOTIONS } from '@/config/emotions';

export default function sitemap(): MetadataRoute.Sitemap {
  const base = appUrl();
  const pages = ['', '/login', '/privacidad', '/terminos'].map((p) => ({ url: `${base}${p}`, changeFrequency: 'weekly' as const, priority: p === '' ? 1 : 0.5 }));
  // Hub de contenido SEO.
  const emotions = [
    { url: `${base}/emociones`, changeFrequency: 'weekly' as const, priority: 0.9 },
    ...EMOTIONS.map((e) => ({ url: `${base}/emociones/${e.slug}`, changeFrequency: 'monthly' as const, priority: 0.8 })),
  ];
  return [...pages, ...emotions];
}
