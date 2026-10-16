import type { MetadataRoute } from 'next';
import { appUrl } from '@/lib/utils';
import { EMOTIONS } from '@/config/emotions';
import { GUIDES, GUIDES_UPDATED, POSTS } from '@/config/content';

export default function sitemap(): MetadataRoute.Sitemap {
  const base = appUrl();
  const pages = ['', '/login', '/privacidad', '/terminos'].map((p) => ({ url: `${base}${p}`, changeFrequency: 'weekly' as const, priority: p === '' ? 1 : 0.5 }));
  // Hub de contenido SEO.
  const emotions = [
    { url: `${base}/emociones`, changeFrequency: 'weekly' as const, priority: 0.9 },
    ...EMOTIONS.map((e) => ({ url: `${base}/emociones/${e.slug}`, changeFrequency: 'monthly' as const, priority: 0.8 })),
  ];
  // Guías en la raíz (una búsqueda de dolor cada una) y blog.
  const guides = [
    { url: `${base}/guias`, changeFrequency: 'weekly' as const, priority: 0.9 },
    ...GUIDES.map((g) => ({ url: `${base}/${g.slug}`, lastModified: GUIDES_UPDATED, changeFrequency: 'monthly' as const, priority: 0.9 })),
  ];
  const blog = [
    { url: `${base}/blog`, changeFrequency: 'weekly' as const, priority: 0.8 },
    ...POSTS.map((p) => ({ url: `${base}/blog/${p.slug}`, lastModified: p.updated ?? p.published, changeFrequency: 'monthly' as const, priority: 0.7 })),
  ];
  return [...pages, ...emotions, ...guides, ...blog];
}
