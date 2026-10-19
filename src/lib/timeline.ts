/**
 * Tu historia (puro y testeado): la línea de vida que SOI va escribiendo con la persona durante años. No es un
 * historial de actividades: son los momentos que cuentan — empezar el mapa, cerrar un capítulo, elegir quién ser,
 * decisiones, creencias que se volvieron suyas, aprendizajes que funcionaron, hábitos que ya le salen solos,
 * logros y también las pausas (dichas sin culpa: "te alejaste y volviste").
 */

/** Decisiones importantes: agent_knowledge 'pensamiento' + este tag (las guarda la herramienta recordDecision). */
export const DECISION_TAG = 'decision';

export type TimelineKind =
  | 'inicio' | 'mapa' | 'medicion' | 'capitulo' | 'identidad' | 'primer_moment' | 'evidencia' | 'decision'
  | 'creencia' | 'creencia_tuya' | 'aprendizaje' | 'habito' | 'regreso' | 'foco';

export type TimelineEvent = {
  at: string;
  kind: TimelineKind;
  title: string;
  detail?: string | null;
  href?: string | null;
};

export const KIND_LABEL: Record<TimelineKind, string> = {
  inicio: 'Empezaste', mapa: 'Tu mapa', medicion: 'Te mediste', capitulo: 'Cerraste un capítulo', identidad: 'Elegiste quién ser',
  primer_moment: 'Tu primer Moment', evidencia: 'Un logro', decision: 'Decidiste', creencia: 'Viste una creencia',
  creencia_tuya: 'Una creencia nueva ya es tuya', aprendizaje: 'Aprendiste y lo aplicaste', habito: 'Un hábito ya te sale solo',
  regreso: 'Volviste', foco: 'Tu foco',
};

const DAY = 86_400_000;
const dayNum = (d: string) => Math.floor(Date.parse(`${d}T12:00:00Z`) / DAY);
const iso = (n: number) => new Date(n * DAY).toISOString().slice(0, 10);

/** Pausas de 7+ días entre días de práctica (fechas locales YYYY-MM-DD) → "volviste" el día que regresó. */
export const PAUSE_DAYS = 7;
export function pausesFrom(days: string[]): { from: string; to: string; days: number }[] {
  const nums = [...new Set(days)].map(dayNum).sort((a, b) => a - b);
  const out: { from: string; to: string; days: number }[] = [];
  for (let i = 1; i < nums.length; i++) {
    const gap = nums[i]! - nums[i - 1]! - 1;
    if (gap >= PAUSE_DAYS) out.push({ from: iso(nums[i - 1]!), to: iso(nums[i]!), days: gap });
  }
  return out;
}

export function pauseEvents(days: string[]): TimelineEvent[] {
  return pausesFrom(days).map((p) => ({
    at: `${p.to}T12:00:00.000Z`, kind: 'regreso' as const, title: `Te alejaste ${p.days} días y volviste`,
    detail: 'Volver es la habilidad más importante. Cada regreso también cuenta.',
  }));
}

const MONTHS = ['enero', 'febrero', 'marzo', 'abril', 'mayo', 'junio', 'julio', 'agosto', 'septiembre', 'octubre', 'noviembre', 'diciembre'];

function monthOf(at: string, timeZone: string): string {
  try {
    const p = new Intl.DateTimeFormat('en-CA', { year: 'numeric', month: '2-digit', timeZone }).format(new Date(at));
    return p.slice(0, 7);
  } catch { return at.slice(0, 7); }
}

export function monthLabel(key: string): string {
  const [y, m] = key.split('-');
  return `${MONTHS[Number(m) - 1] ?? ''} de ${y}`;
}

/** Agrupa por mes local, lo más reciente primero (dentro del mes también). Sin repetir el mismo hecho el mismo día. */
export function groupByMonth(events: TimelineEvent[], timeZone: string): { key: string; label: string; events: TimelineEvent[] }[] {
  const seen = new Set<string>();
  const sorted = [...events].filter((e) => !Number.isNaN(Date.parse(e.at))).sort((a, b) => Date.parse(b.at) - Date.parse(a.at))
    .filter((e) => { const k = `${e.kind}:${e.title}:${e.at.slice(0, 10)}`; if (seen.has(k)) return false; seen.add(k); return true; });
  const groups = new Map<string, TimelineEvent[]>();
  for (const e of sorted) {
    const k = monthOf(e.at, timeZone);
    groups.set(k, [...(groups.get(k) ?? []), e]);
  }
  return [...groups].map(([key, evs]) => ({ key, label: monthLabel(key), events: evs }));
}

/**
 * "Hace un año": lo que escribió o decidió hace ~12 meses (de 350 a 380 días), con texto propio.
 * Lo usan el saludo del chat y Tu historia. El más cercano a un año exacto.
 */
export function yearAgo(events: TimelineEvent[], now = Date.now()): TimelineEvent | null {
  const want = new Set<TimelineKind>(['decision', 'capitulo', 'mapa', 'aprendizaje', 'identidad', 'creencia_tuya', 'evidencia']);
  return events.filter((e) => want.has(e.kind)).map((e) => ({ e, d: (now - Date.parse(e.at)) / DAY }))
    .filter((x) => x.d >= 350 && x.d <= 380).sort((a, b) => Math.abs(a.d - 365) - Math.abs(b.d - 365))[0]?.e ?? null;
}
