import { z } from 'zod/v3';
import type { UserProfile } from '@/types/database';
import type { Habit } from '@/lib/ai/prompts/james-clear';

/**
 * "Lo que SOI sabe de ti": todo lo que los agentes guardaron sobre la persona (perfil, lo que entendió en las
 * conversaciones, propósito, hábitos, identidades, enemigos), reunido en un solo lugar para que lo vea, lo corrija
 * y lo borre. Es la mitad "quién eres hoy" del mapa y la base de la confianza: nada que SOI use queda escondido.
 */

export type KnownGroup = 'mueve' | 'frena' | 'siente' | 'construye';
export const KNOWN_GROUPS: { id: KnownGroup; label: string; empty: string }[] = [
  { id: 'mueve', label: 'Lo que te mueve', empty: 'Aún no me contaste qué quieres lograr.' },
  { id: 'frena', label: 'Lo que te frena', empty: 'Todavía no sé qué te cuesta.' },
  { id: 'siente', label: 'Cómo llegas últimamente', empty: 'Cuéntame cómo estás y lo voy entendiendo.' },
  { id: 'construye', label: 'Lo que estás construyendo', empty: 'Aún no eliges quién quieres ser.' },
];

/** Cómo se borra un dato (lo valida el servidor con `ForgetBody`). */
export type Forget =
  | { kind: 'memory'; id: string }
  | { kind: 'goal'; value: string }
  | { kind: 'blocker'; value: string }
  | { kind: 'emotion' }
  | { kind: 'habit'; name: string };

export const ForgetBody = z.discriminatedUnion('kind', [
  z.object({ kind: z.literal('memory'), id: z.string().uuid() }),
  z.object({ kind: z.literal('goal'), value: z.string().min(1).max(120) }),
  z.object({ kind: z.literal('blocker'), value: z.string().min(1).max(120) }),
  z.object({ kind: z.literal('emotion') }),
  z.object({ kind: z.literal('habit'), name: z.string().min(1).max(80) }),
]);

export type KnownItem = {
  key: string;
  group: KnownGroup;
  /** Qué es ("Tu meta", "Me contaste"…). */
  label: string;
  text: string;
  /** Quitarlo (si la persona dice "esto no es así"). Sin forget, se cambia en otra pantalla (`href`). */
  forget?: Forget;
  href?: string;
};

type Understanding = { id: string; content: string; created_at: string };

/** Lee "Situación: …\nQuiere: …" (lo que guarda understanding.ts) como campos. */
export function parseUnderstanding(content: string): Record<string, string> {
  const out: Record<string, string> = {};
  for (const line of content.split('\n')) {
    const m = line.match(/^([^:]{2,20}):\s*(.+)$/);
    if (m) out[m[1]!.trim().toLowerCase()] = m[2]!.trim();
  }
  return out;
}

const cut = (s: string, max = 160) => { const t = s.trim().replace(/\s+/g, ' '); return t.length > max ? `${t.slice(0, max - 1).trimEnd()}…` : t; };

/** Arma la lista (puro). */
export function buildKnown(input: {
  profile: Pick<UserProfile, 'goals' | 'blockers' | 'dominant_emotion'> | null;
  purpose: { id: string; aim: string } | null;
  understandings: Understanding[];
  habits: Habit[];
  identities: { id: string; name: string }[];
  enemy: { id: string; name: string } | null;
  values?: { label: string }[];
  beliefs?: { id: string; old: string; next: string | null }[];
}): KnownItem[] {
  const items: KnownItem[] = [];
  const p = input.profile;
  if (input.purpose) items.push({ key: `purpose:${input.purpose.id}`, group: 'mueve', label: 'Tu propósito', text: cut(input.purpose.aim), forget: { kind: 'memory', id: input.purpose.id } });
  if (input.values?.length) items.push({ key: 'values', group: 'mueve', label: 'Tus valores', text: input.values.map((v) => v.label).join(' · '), href: '/mi-vida?tab=mapa#values-h' });
  for (const g of (p?.goals ?? []).filter((x) => x.trim())) items.push({ key: `goal:${g}`, group: 'mueve', label: 'Tu meta', text: cut(g), forget: { kind: 'goal', value: g } });
  for (const b of (p?.blockers ?? []).filter((x) => x.trim())) items.push({ key: `blocker:${b}`, group: 'frena', label: 'Te frena', text: cut(b), forget: { kind: 'blocker', value: b } });
  for (const b of input.beliefs ?? []) {
    items.push({ key: `belief:${b.id}`, group: 'frena', label: b.next ? `Creencia que cambias por «${cut(b.next, 80)}»` : 'Una creencia que te frena', text: `«${cut(b.old)}»`, forget: { kind: 'memory', id: b.id } });
  }
  if (input.enemy) items.push({ key: `enemy:${input.enemy.id}`, group: 'frena', label: 'Últimamente aparece', text: input.enemy.name, href: `/mi-vida/batallas/${input.enemy.id}` });
  if (p?.dominant_emotion?.trim()) items.push({ key: 'emotion', group: 'siente', label: 'Lo que más sientes', text: cut(p.dominant_emotion), forget: { kind: 'emotion' } });
  for (const u of input.understandings.slice(0, 3)) {
    const f = parseUnderstanding(u.content);
    const text = [f['situación'] ?? f['situacion'], f['quiere'] && `Quieres: ${f['quiere']}`].filter(Boolean).join('. ');
    if (text) items.push({ key: `u:${u.id}`, group: 'siente', label: 'Me contaste', text: cut(text, 220), forget: { kind: 'memory', id: u.id } });
  }
  for (const i of input.identities) items.push({ key: `id:${i.id}`, group: 'construye', label: 'Quién eliges ser', text: cut(i.name), href: `/mi-vida/yo/${i.id}` });
  for (const h of input.habits.filter((x) => x.status !== 'automatic')) {
    items.push({ key: `habit:${h.name}`, group: 'construye', label: h.mode === 'break' ? 'Hábito que dejas' : 'Hábito que construyes', text: cut(`${h.name}${h.cue ? ` · ${h.cue}` : ''}`), forget: { kind: 'habit', name: h.name } });
  }
  return items;
}
