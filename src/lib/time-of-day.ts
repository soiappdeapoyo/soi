import { hourInTz } from '@/lib/utils';
import { partOfDay, type DayPart } from '@/lib/day-plan';

/** Qué conviene según la parte del día (marco SOI: Tracy, Elrod, Sharma, Dispenza, Neville). */
export const PART_GUIDANCE: Record<DayPart, string> = {
  manana: 'Es de MAÑANA: prioriza rituales matutinos (ritual de 5 minutos de Brian Tracy, Miracle Morning de Hal Elrod, Club de las 5 AM de Robin Sharma, protocolo de mañana de Joe Dispenza), intención del día, afirmaciones y manifestación. No propongas descompresión, recuperación ni rutinas de cierre de día salvo que la persona exprese carga, ansiedad o cansancio.',
  tarde: 'Es de TARDE: prioriza foco y avance (una prioridad, pomodoro, plan), o una pausa breve de reconexión con movimiento (Dispenza, tarde) si la persona viene cargada.',
  noche: 'Es de NOCHE: prioriza bajar el ritmo, gratitud, revisión del día (Dispenza, noche) y SATS de Neville Goddard antes de dormir. Nada de pendientes nuevos ni energía alta.',
};

/** Bloque del system prompt: fecha y hora local de la persona y lo que eso implica. */
export function timeContextPrompt(timeZone: string, now = new Date()) {
  const hour = hourInTz(timeZone, now);
  const part = partOfDay(hour);
  let when = '';
  try {
    when = new Intl.DateTimeFormat('es', { weekday: 'long', day: 'numeric', month: 'long', hour: 'numeric', minute: '2-digit', timeZone }).format(now);
  } catch { when = now.toISOString(); }
  return { part, hour, prompt: `AHORA (hora local de la persona, ${timeZone}): ${when}.\n${PART_GUIDANCE[part]}\nNunca supongas otra hora del día.` };
}
