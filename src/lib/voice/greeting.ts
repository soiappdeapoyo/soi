/**
 * Lo que SOI dice en voz alta en un recordatorio (puro y testeado), en lugar de una alarma:
 * "Mimy… Mimy… Hola, buenos días. Tu día está listo…". Suave, con su nombre y sin prisa ni culpa.
 * El volumen sube de menos a más al reproducirse (src/lib/voice/wake.ts).
 */

export type GreetingKind = 'moment' | 'nudge' | 'scheduled';

/** Primer nombre para llamarla ("María José Pérez" → "María"; correos y vacíos → null). */
export function firstName(display: string | null | undefined): string | null {
  const raw = (display ?? '').trim();
  if (!raw || raw.includes('@')) return null;
  const word = raw.split(/\s+/)[0]!.replace(/[^\p{L}'-]/gu, '');
  if (word.length < 2 || word.length > 20) return null;
  return word[0]!.toUpperCase() + word.slice(1);
}

/** Saludo según la hora local (minutos desde la medianoche). */
export function greetingFor(localMinutes: number): string {
  const h = Math.floor(localMinutes / 60);
  if (h >= 5 && h < 12) return 'Hola, buenos días.';
  if (h >= 12 && h < 19) return 'Hola, buenas tardes.';
  return 'Hola, buenas noches.';
}

/** El texto del aviso, dicho como se habla (sin comillas, sin "toca para empezar", sin "min"). */
function spoken(text: string): string {
  return text
    .replace(/[«»"“”]/g, '')
    .replace(/\s*·\s*/g, '. ')
    .replace(/\btoca para empezar\b/gi, 'Cuando quieras, empezamos')
    .replace(/(\d+)\s*min\b/g, (_, n: string) => `${n} ${n === '1' ? 'minuto' : 'minutos'}`)
    .replace(/\s+/g, ' ')
    .replace(/\.\s*\./g, '.')
    .trim();
}

const end = (s: string) => (/[.!?…]$/.test(s) ? s : `${s}.`);

/** El saludo completo de un recordatorio. */
export function reminderSpeech(i: { name: string | null; kind: GreetingKind; title: string; body: string; localMinutes: number }): string {
  const call = i.name ? `${i.name}… ${i.name}… ` : '';
  const hello = greetingFor(i.localMinutes);
  const title = end(spoken(i.title));
  const body = i.body ? end(spoken(i.body)) : '';
  const close = i.kind === 'nudge' ? ' Aquí estoy cuando quieras.' : '';
  return `${call}${hello} ${title} ${body}${close}`.replace(/\s+/g, ' ').trim().slice(0, 600);
}
