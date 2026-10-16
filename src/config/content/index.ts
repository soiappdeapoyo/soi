import { GUIDES_ACTION } from './guides-action';
import { GUIDES_MIND } from './guides-mind';
import { GUIDES_IDENTITY } from './guides-identity';
import { POSTS_MIND_HABITS } from './posts-mind-habits';
import { POSTS_MANIFEST_MONEY } from './posts-manifest-money';
import { POST_CATEGORIES, type ContentSection, type Guide, type Post, type PostCategory } from './types';

export * from './types';

/** Guías en la raíz (`/ansiedad`, `/procrastinacion`…), en el orden del menú. */
export const GUIDES: Guide[] = [...GUIDES_ACTION, ...GUIDES_MIND, ...GUIDES_IDENTITY];

/** Artículos del blog (`/blog/<slug>`). */
export const POSTS: Post[] = [...POSTS_MIND_HABITS, ...POSTS_MANIFEST_MONEY];

export function guideBySlug(slug: string): Guide | null {
  return GUIDES.find((g) => g.slug === slug) ?? null;
}

export function postBySlug(slug: string): Post | null {
  return POSTS.find((p) => p.slug === slug) ?? null;
}

export function postsByCategory(category: PostCategory): Post[] {
  return POSTS.filter((p) => p.category === category);
}

export const CATEGORY_SLUG: Record<PostCategory, string> = {
  Mentalidad: 'mentalidad',
  Hábitos: 'habitos',
  Manifestación: 'manifestacion',
  Dinero: 'dinero',
};

export { POST_CATEGORIES };

/** Texto plano sin marcas (`**`, enlaces): para JSON-LD y conteo de palabras. */
export function plainText(text: string): string {
  return text.replace(/\[([^\]]+)\]\([^)]+\)/g, '$1').replace(/\*\*([^*]+)\*\*/g, '$1');
}

/** Minutos de lectura (≈ 200 palabras por minuto en español). */
export function readingMinutes(parts: { intro: string[]; sections: ContentSection[] }): number {
  const text = [...parts.intro, ...parts.sections.flatMap((s) => [s.h2, ...s.paragraphs, ...(s.list ?? [])])].join(' ');
  return Math.max(1, Math.round(plainText(text).split(/\s+/).length / 200));
}

/** Ancla estable para un título (tabla de contenido). */
export function anchorFor(text: string): string {
  return plainText(text)
    .toLowerCase()
    .normalize('NFD')
    .replace(/[̀-ͯ]/g, '')
    .replace(/[^a-z0-9]+/g, '-')
    .replace(/^-+|-+$/g, '')
    .slice(0, 60);
}
