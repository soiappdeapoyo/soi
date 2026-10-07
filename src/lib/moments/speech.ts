import type { ActionBlock } from '@/config/actions';
import type { VoiceStyle } from '@/config/voices';

type Cfg = Record<string, unknown>;
const ENERGY = new Set(['exercise', 'pomodoro', 'walk', 'celebration']);
const str = (v: unknown) => (typeof v === 'string' ? v.trim() : '');
const num = (v: unknown, d: number) => (typeof v === 'number' && Number.isFinite(v) ? v : d);
const list = (v: unknown) => (Array.isArray(v) ? v.filter((x): x is string => typeof x === 'string' && x.trim().length > 0) : []);
const sentence = (s: string) => (s && !/[.!?…]$/.test(s) ? `${s}.` : s);

/**
 * Todo lo que la voz lee de un bloque: el título y TODAS sus instrucciones (no solo el título).
 * `slow`: meditaciones, visualizaciones y respiración se leen más despacio y con pausas entre frases.
 */
export function blockSpeech(b: Pick<ActionBlock, 'type' | 'title' | 'config'>): { text: string; slow: boolean; style: VoiceStyle } {
  const c = (b.config ?? {}) as Cfg;
  const parts: string[] = [sentence(b.title)];
  let slow = false;
  switch (b.type) {
    case 'breathing': {
      const i = num(c.inhale, 4); const e = num(c.exhale, 6); const h = num(c.hold, 0); const ho = num(c.holdOut, 0);
      parts.push(`Inhala por la nariz durante ${i} segundos.${h ? ` Sostén el aire ${h} segundos.` : ''} Exhala lento durante ${e} segundos.${ho ? ` Quédate sin aire ${ho} segundos.` : ''} Sigue el círculo y mi voz.`);
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
      const items = list(c.items);
      const t = items[0] ?? str(c.text);
      if (t) parts.push(`Repite conmigo: ${sentence(t)}`);
      slow = true; break;
    }
    case 'manifestation':
      parts.push(`Lo que vas a manifestar: ${sentence(str(c.desire))}`, `Asúmelo así: ${sentence(str(c.assumption))}`,
        'Cierra los ojos.', str(c.scene), str(c.feeling) ? `Quédate en esa sensación: ${sentence(str(c.feeling))}` : '');
      slow = true; break;
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
    case 'book': {
      const by = str(c.author) ? ` de ${str(c.author)}` : '';
      parts.push(c.mode === 'read' ? `Lee ${num(c.pages, 10)} páginas de ${str(c.title)}${by}.` : `Ideas clave de ${str(c.title)}${by}.`);
      break;
    }
    case 'image': parts.push(str(c.caption)); break;
    case 'reframe': parts.push(c.thought ? `Vamos a mirar este pensamiento: ${str(c.thought)}.` : 'Escribe el pensamiento que hoy te frena.', 'Luego, los hechos a favor y en contra. Y al final, un pensamiento más justo y útil.'); break;
    case 'body_scan': parts.push('Cierra los ojos. Vamos a recorrer tu cuerpo, una zona a la vez, sin cambiar nada.'); slow = true; break;
    case 'letter': parts.push(`Escribe una carta para ${str(c.to)}.`, str(c.prompt)); break;
    case 'document': parts.push(`Lee el documento ${str(c.title)}.`, str(c.prompt)); break;
    case 'exercise': {
      const sets = num(c.sets, 3);
      parts.push(`${str(c.name)}: ${sets} series de ${c.seconds ? `${num(c.seconds, 30)} segundos` : `${num(c.reps, 10)} repeticiones`}${num(c.rest, 30) ? `, con ${num(c.rest, 30)} segundos de descanso` : ''}.`);
      break;
    }
    default: break;
  }
  const style: VoiceStyle = slow ? 'calm' : ENERGY.has(b.type) ? 'energy' : 'guide';
  return { text: parts.map((p) => p.trim()).filter(Boolean).map(sentence).join(' '), slow, style };
}
