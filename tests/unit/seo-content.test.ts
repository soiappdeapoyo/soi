import { existsSync } from 'node:fs';
import { join } from 'node:path';
import { describe, expect, it } from 'vitest';
import { EMOTIONS, emotionBySlug } from '@/config/emotions';
import { GUIDES, POSTS, anchorFor, guideBySlug, plainText, postBySlug, readingMinutes } from '@/config/content';
import { GUIDE_WEEKS } from '@/config/content/guide-weeks';
import { PROTECTED_PREFIXES } from '@/config/navigation';

const GUIDE_SLUGS = [
  'ansiedad', 'procrastinacion', 'crear-habitos', 'manifestacion', 'visualizacion', 'rutina-mananas',
  'disciplina-personal', 'encontrar-proposito', 'mejorar-autoestima', 'mentalidad-ganadora', 'metas-personales', 'afirmaciones',
];

/** Todos los textos con marcas de una guía o un artículo. */
function texts(x: { intro: string[]; sections: { paragraphs: string[]; list?: string[] }[] }) {
  return [...x.intro, ...x.sections.flatMap((s) => [...s.paragraphs, ...(s.list ?? [])])];
}

/** Rutas públicas que el contenido puede enlazar. */
function isKnownRoute(href: string): boolean {
  const path = href.split('#')[0]!;
  if (['/', '/guias', '/blog', '/emociones', '/login'].includes(path)) return true;
  if (path.startsWith('/blog/')) return postBySlug(path.slice(6)) !== null;
  if (path.startsWith('/emociones/')) return emotionBySlug(path.slice(11)) !== null;
  return guideBySlug(path.slice(1)) !== null;
}

describe('guías SEO en la raíz', () => {
  it('tiene las 12 rutas pedidas, sin duplicados, cada una con su página', () => {
    expect([...GUIDES.map((g) => g.slug)].sort()).toEqual([...GUIDE_SLUGS].sort());
    for (const s of GUIDE_SLUGS) expect(existsSync(join(process.cwd(), 'src/app/(contenido)', s, 'page.tsx')), s).toBe(true);
  });

  it('no choca con rutas protegidas de la app', () => {
    for (const g of GUIDES) for (const p of PROTECTED_PREFIXES) {
      const path = `/${g.slug}`;
      expect(path === p || path.startsWith(`${p}/`), `${path} ↔ ${p}`).toBe(false);
    }
  });

  it('cumple los límites de SEO', () => {
    for (const g of GUIDES) {
      expect(g.title.length, g.slug).toBeLessThanOrEqual(54); // + " · SOI" ≤ 60
      expect(g.description.length, g.slug).toBeLessThanOrEqual(160);
      expect(g.description.length, g.slug).toBeGreaterThanOrEqual(110);
      const words = g.answer.split(/\s+/).length;
      expect(words, `${g.slug}: respuesta corta`).toBeGreaterThanOrEqual(35);
      expect(words, `${g.slug}: respuesta corta`).toBeLessThanOrEqual(75);
      expect(readingMinutes(g), g.slug).toBeGreaterThanOrEqual(3);
    }
  });

  it('no compite con /emociones: título distinto al de la emoción del mismo nombre', () => {
    for (const g of GUIDES) {
      const e = emotionBySlug(g.slug);
      if (e) expect(g.title).not.toBe(e.title);
    }
  });

  it('el método y toda sección con autor citan su fuente (Regla #8)', () => {
    for (const g of GUIDES) {
      expect(g.method.source.length, g.slug).toBeGreaterThan(10);
      expect(g.method.steps.length, g.slug).toBeGreaterThanOrEqual(4);
      expect(g.sections.some((s) => s.source), g.slug).toBe(true);
    }
  });

  it('las referencias existen y no se apuntan a sí mismas', () => {
    for (const g of GUIDES) {
      for (const r of g.related) { expect(guideBySlug(r), `${g.slug} → ${r}`).not.toBeNull(); expect(r).not.toBe(g.slug); }
      for (const e of g.emotions) expect(emotionBySlug(e), `${g.slug} → emociones/${e}`).not.toBeNull();
      for (const p of g.posts) expect(postBySlug(p), `${g.slug} → blog/${p}`).not.toBeNull();
    }
  });

  it('cada guía tiene su plan de 7 días (y no sobran planes)', () => {
    expect(Object.keys(GUIDE_WEEKS).sort()).toEqual([...GUIDE_SLUGS].sort());
    for (const s of GUIDE_SLUGS) expect(GUIDE_WEEKS[s]!.every((d) => d.length > 20), s).toBe(true);
  });

  it('las anclas de las secciones son únicas', () => {
    for (const g of GUIDES) {
      const ids = g.sections.map((s) => anchorFor(s.h2));
      expect(new Set([...ids, 'metodo', 'plan-7-dias', 'con-soi', 'preguntas']).size, g.slug).toBe(ids.length + 4);
    }
  });
});

describe('blog', () => {
  it('slugs únicos, fechas ISO y límites de SEO', () => {
    expect(new Set(POSTS.map((p) => p.slug)).size).toBe(POSTS.length);
    for (const p of POSTS) {
      expect(p.title.length, p.slug).toBeLessThanOrEqual(54);
      expect(p.description.length, p.slug).toBeLessThanOrEqual(160);
      expect(p.published).toMatch(/^\d{4}-\d{2}-\d{2}$/);
      expect(p.takeaways.length, p.slug).toBeGreaterThanOrEqual(3);
      expect(readingMinutes(p), p.slug).toBeGreaterThanOrEqual(3);
      for (const g of p.guides) expect(guideBySlug(g), `${p.slug} → ${g}`).not.toBeNull();
    }
  });

  it('cubre las 4 categorías', () => {
    expect(new Set(POSTS.map((p) => p.category))).toEqual(new Set(['Mentalidad', 'Hábitos', 'Manifestación', 'Dinero']));
  });
});

describe('texto enriquecido', () => {
  it('todo enlace interno apunta a una página que existe', () => {
    const all = [...GUIDES.map((g) => [g.slug, texts(g)] as const), ...POSTS.map((p) => [p.slug, texts(p)] as const)];
    for (const [slug, list] of all) for (const t of list) {
      for (const m of t.matchAll(/\]\(([^)]+)\)/g)) {
        expect(m[1]!.startsWith('/'), `${slug}: ${m[1]}`).toBe(true);
        expect(isKnownRoute(m[1]!), `${slug}: ${m[1]}`).toBe(true);
      }
      // Marcas bien cerradas: sin «**» ni corchetes sueltos en el texto plano.
      expect(plainText(t), slug).not.toMatch(/\*\*|\]\(/);
    }
  });

  it('cada guía y artículo enlaza al menos a otra página dentro del texto', () => {
    for (const g of GUIDES) expect(texts(g).some((t) => t.includes('](/')), g.slug).toBe(true);
    for (const p of POSTS) expect(texts(p).some((t) => t.includes('](/')), p.slug).toBe(true);
  });

  it('las emociones con guía la enlazan (sin huérfanas)', () => {
    for (const e of EMOTIONS) expect(GUIDES.some((g) => g.emotions.includes(e.slug)), e.slug).toBe(true);
  });
});
