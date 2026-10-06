import type { SupabaseClient } from '@supabase/supabase-js';
import type { DayPart } from '@/lib/day-plan';

/**
 * "Ahora no": cuando la persona rechaza la propuesta del saludo, SOI aprende. Se guarda en la memoria transversal
 * (agent_knowledge, perfil_usuario + tag "ahora_no") y el siguiente saludo cambia:
 * - el mismo Moment no se vuelve a proponer en 3 días (un reto o lo planeado, solo ese día);
 * - dos "ahora no" al mismo tipo de Moment en la misma parte del día (14 días) → ese tipo deja de proponerse a esa hora.
 */
export type Decline = { ref: string; title: string; kind: string; part: DayPart; at: string };

const DAY = 86_400_000;

export function declinedFilter(declines: Decline[], part: DayPart, now = Date.now()) {
  const recent = (d: Decline, days: number) => now - Date.parse(d.at) < days * DAY;
  const kindCount = new Map<string, number>();
  for (const d of declines) if (d.part === part && recent(d, 14)) kindCount.set(d.kind, (kindCount.get(d.kind) ?? 0) + 1);
  return {
    /** ¿Este tipo de Moment se puede proponer a esta hora? */
    allowsKind(kind: string): boolean { return (kindCount.get(kind) ?? 0) < 2; },
    /**
     * ¿Se puede proponer este Moment ahora? `sameDayOnly` (retos y lo planeado en Mi día): es su decisión,
     * así que solo se respeta el "ahora no" de hoy, sin bloquear el tipo.
     */
    allows(ref: string, kind: string, sameDayOnly = false): boolean {
      if (declines.some((d) => d.ref === ref && recent(d, sameDayOnly ? 1 : 3))) return false;
      return sameDayOnly || (kindCount.get(kind) ?? 0) < 2;
    },
  };
}

/** El último "ahora no" de los últimos 2 días (para reconocerlo en el saludo). */
export function lastDecline(declines: Decline[], now = Date.now()): Decline | null {
  const d = [...declines].sort((a, b) => Date.parse(b.at) - Date.parse(a.at))[0];
  return d && now - Date.parse(d.at) < 2 * DAY ? d : null;
}

export async function loadDeclines(supabase: SupabaseClient, userId: string): Promise<Decline[]> {
  const { data } = await supabase.from('agent_knowledge').select('metadata, created_at').eq('user_id', userId)
    .eq('category', 'perfil_usuario').contains('tags', ['ahora_no'])
    .gte('created_at', new Date(Date.now() - 14 * DAY).toISOString()).order('created_at', { ascending: false }).limit(30);
  return (data ?? []).map((r) => {
    const m = (r.metadata ?? {}) as Partial<Decline>;
    return { ref: String(m.ref ?? ''), title: String(m.title ?? ''), kind: String(m.kind ?? ''), part: (m.part ?? 'manana') as DayPart, at: r.created_at as string };
  }).filter((d) => d.ref);
}
