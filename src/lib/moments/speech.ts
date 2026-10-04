import type { ActionBlock } from '@/config/actions';

type Cfg = Record<string, unknown>;
const str = (v: unknown) => (typeof v === 'string' ? v.trim() : '');
const num = (v: unknown, d: number) => (typeof v === 'number' && Number.isFinite(v) ? v : d);
const list = (v: unknown) => (Array.isArray(v) ? v.filter((x): x is string => typeof x === 'string' && x.trim().length > 0) : []);
const sentence = (s: string) => (s && !/[.!?…]$/.test(s) ? `${s}.` : s);

/**
 * Todo lo que la voz lee de un bloque: el título y TODAS sus instrucciones (no solo el título).
 * `slow`: meditaciones, visualizaciones y respiración se leen más despacio y con pausas entre frases.
 */
export function blockSpeech(b: Pick<ActionBlock, 'type' | 'title' | 'config'>): { text: string; slow: boolean } {
  const c = (b.config ?? {}) as Cfg;
  const parts: string[] = [sentence(b.title)];
  let slow = false;
  switch (b.type) {
    case 'breathing': {
      const i = num(c.inhale, 4); const e = num(c.exhale, 6);
      parts.push(`Inhala por la nariz durante ${i} segundos. Exhala lento durante ${e} segundos. Sigue el círculo.`);
      slow = true; break;
    }
    case 'meditation': parts.push(str(c.guide)); slow = true; break;
    case 'visualization': parts.push(str(c.scene)); slow = true; break;
    case 'timer': case 'walk': case 'rest': case 'next_step': parts.push(str(c.instruction)); break;
    case 'writing': case 'canvas': case 'photo': case 'goal': case 'agenda': parts.push(str(c.prompt)); break;
    case 'reflection': case 'emotion_log': parts.push(str(c.question)); break;
    case 'checklist': parts.push(...list(c.items).map(sentence)); break;
    case 'gratitude': parts.push(`Escribe ${num(c.count, 3)} cosas por las que agradeces hoy.`); break;
    case 'reading': parts.push(`Lee ${c.pages ? `${num(c.pages, 10)} páginas de ` : ''}${str(c.book)}.`); break;
    case 'affirmation': {
      const t = str(c.text);
      if (t) parts.push(`Repite conmigo: ${sentence(t)}`);
      slow = true; break;
    }
    case 'celebration': parts.push(str(c.message)); break;
    case 'mind_map': parts.push(`En el centro escribe: ${sentence(str(c.center))} Agrega ${num(c.branches, 4)} ramas.`); break;
    case 'audio': case 'music': parts.push(str(c.prompt)); break;
    case 'pomodoro': parts.push(`${num(c.focus, 25)} minutos de foco total. Después, ${num(c.rest, 5)} minutos de descanso.`); break;
    case 'contract': parts.push(`Tu compromiso: ${sentence(str(c.commitment))}`); break;
    case 'weekly_review': parts.push(str(c.focus) || 'Revisa tu semana: qué funcionó, qué no y cuál es tu prioridad.'); break;
    case 'tracking': parts.push(`Registra ${str(c.metric)}${str(c.unit) ? ` en ${str(c.unit)}` : ''}.`); break;
    case 'stretching': {
      const seq = list(c.sequence);
      parts.push(`${seq.length} estiramientos de ${num(c.secondsEach, 40)} segundos cada uno.`, ...seq.map(sentence));
      slow = true; break;
    }
    case 'quiz': {
      const n = Array.isArray(c.questions) ? c.questions.length : 0;
      if (n) parts.push(`${n} ${n === 1 ? 'pregunta' : 'preguntas'}.`);
      break;
    }
    default: break;
  }
  return { text: parts.map((p) => p.trim()).filter(Boolean).map(sentence).join(' '), slow };
}
