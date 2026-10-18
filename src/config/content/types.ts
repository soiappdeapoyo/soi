import type { Eslabon } from '@/config/agents';

/**
 * Contenido SEO (guías en la raíz y artículos del blog). Cada página ataca UNA búsqueda de dolor
 * ("cómo dejar de procrastinar"), la lleva al Principio SOI y cita sus fuentes (Regla #8).
 * El texto admite `**negritas**` y enlaces internos `[texto](/ruta)` (ver `RichText`).
 */

export type ContentSection = {
  h2: string;
  paragraphs: string[];
  list?: string[];
  /** Lista numerada en vez de viñetas. */
  ordered?: boolean;
  /** Fuente de lo que dice la sección. */
  source?: string;
};

export type Faq = { q: string; a: string };

export type Guide = {
  slug: string;
  /** Nombre corto (menú, tarjetas). */
  name: string;
  /** Búsqueda principal que ataca. */
  keyword: string;
  /** Título SEO (≤ 60 caracteres; la plantilla agrega « · SOI»). */
  title: string;
  /** Meta descripción (≤ 160 caracteres). */
  description: string;
  h1: string;
  /** Respuesta directa de 40–70 palabras (fragmento destacado de Google). */
  answer: string;
  intro: string[];
  eslabon: Eslabon;
  sections: ContentSection[];
  method: { name: string; minutes: number; source: string; steps: string[] };
  /** El Moment que SOI armaría (vista previa estática). */
  moment: { title: string; blocks: { label: string; minutes: number }[] };
  cta: { heading: string; text: string; button: string };
  /** Agente con el que abre el chat después del registro. */
  agent: string;
  faq: Faq[];
  /** Otras guías (slugs). */
  related: string[];
  /** Páginas de `/emociones` relacionadas. */
  emotions: string[];
  /** Artículos del blog relacionados. */
  posts: string[];
};

export const POST_CATEGORIES = ['Mentalidad', 'Hábitos', 'Manifestación', 'Dinero'] as const;
export type PostCategory = (typeof POST_CATEGORIES)[number];

export type Post = {
  slug: string;
  category: PostCategory;
  /** Título SEO (≤ 60 caracteres). */
  title: string;
  /** Meta descripción (≤ 160 caracteres). */
  description: string;
  h1: string;
  intro: string[];
  /** Lo esencial en 3–5 puntos (arriba del artículo). */
  takeaways: string[];
  sections: ContentSection[];
  faq?: Faq[];
  /** Guías relacionadas (slugs). */
  guides: string[];
  /** ISO (AAAA-MM-DD). */
  published: string;
  updated?: string;
};

/**
 * Página de autor (`/neville-goddard`, `/brian-tracy`, `/napoleon-hill`, `/james-clear`): quién fue, sus ideas parafraseadas
 * (nunca su texto), cómo aplicarlas hoy y su reto de 7 días. Centro del clúster: enlaza a guías y artículos.
 */
export type Author = {
  slug: string;
  /** Clave del reto (`AUTHOR_CHALLENGES`; las de la landing también son su `?de=`). */
  key: 'neville' | 'tracy' | 'hill' | 'clear';
  name: string;
  /** Título SEO (≤ 54 caracteres; la plantilla agrega « · SOI»). */
  title: string;
  /** Meta descripción (110–160 caracteres). */
  description: string;
  h1: string;
  /** Quién fue y su idea central, en 35–75 palabras (fragmento destacado). */
  answer: string;
  intro: string[];
  /** Datos breves (nacimiento, obra clave…). */
  facts: { label: string; value: string }[];
  /** Fuentes externas sobre la persona (JSON-LD `sameAs`). */
  sameAs: string[];
  books: { title: string; year: number; idea: string }[];
  sections: ContentSection[];
  cta: { heading: string; text: string; button: string };
  faq: Faq[];
  guides: string[];
  posts: string[];
};

/** Fecha de la última revisión del contenido de las guías. */
export const GUIDES_UPDATED = '2026-10-16';
