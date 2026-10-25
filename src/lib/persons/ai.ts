import { z } from 'zod/v3';
import { objectWithFallback, CHAT_ORDER, type ProviderName } from '@/lib/ai/fallback';
import { DescribedSchema, normalizeDescribed, checkDescription, personaLine, type Described, type PersonSpec } from './spec';
import { expressionGuide, type EmotionLabel, type EmotionState } from './emotion';
import type { Presence } from './presence';
import { CoachSchema, SKILLS, type CoachReport, type DebriefMessage, type TimelinePoint } from './debrief';

/**
 * Las tres IA de /persons, separadas (nunca se mezclan): el generador de personajes, el actor (habla en personaje) y
 * el coach (evalúa al terminar). El actor nunca ve el feedback del coach ni sabe el plan de pago de la persona.
 */

// ── Generador ────────────────────────────────────────────────────────────────────────────────────────────────────

const GENERATOR = `Creas personajes ficticios para que una persona practique conversaciones (citas, amistad, networking) en español.
Devuelves una ficha coherente de un ARQUETIPO adulto, nunca una persona real ni identificable.
Reglas:
- Edad 18 o más, siempre. Nada sexualizado ni de sumisión: límites sanos (respeto, consentimiento, no insistir).
- Si la descripción nombra o imita a una persona real o famosa, crea un arquetipo genérico con otro nombre.
- Nombre de pila común en Latinoamérica o España (sin apellidos). Ciudad real hispanohablante si no se dice otra.
- traits: 2–6 rasgos breves. interests: 2–8 intereses concretos. boundaries: 1–6 límites en sus palabras.
- style: cómo escribe en el chat (largo de mensajes, emojis, humor). bio: 1–2 frases en tercera persona.
- availability: su rutina (profesional, estudiante, freelance o turnos). energy 0–1. difficulty 1 (fácil, muy legible)
  a 3 (difícil: reservada, se abre lento). Si no se dice, 2.
- Personas diversas, sin estereotipos.`;

export async function generateDescribed(o: { description: string; name?: string; base?: Described; delta?: string }): Promise<{ described: Described; provider: ProviderName } | null> {
  const prompt = o.base
    ? `Ficha actual (JSON):\n${JSON.stringify(o.base)}\n\nAjuste pedido: «${(o.delta ?? o.description).slice(0, 400)}»\n\nDevuelve la ficha completa con el ajuste aplicado. Cambia SOLO lo que el ajuste pide; todo lo demás queda igual.`
    : `Descripción: «${o.description.slice(0, 400)}»${o.name ? `\nNombre elegido: ${o.name.slice(0, 40)}` : ''}`;
  const { object, provider } = await objectWithFallback({ schema: DescribedSchema, instructions: GENERATOR, prompt, timeoutMs: 30_000 });
  const described = normalizeDescribed(object as Described);
  if (!described) return null;
  if (o.name && !o.base) described.name = o.name.replace(/[0-9@#_*]/g, '').trim().slice(0, 40) || described.name;
  // Revisión de salida: lo generado tampoco puede describir a una persona real, a un menor ni algo sexual.
  const out = [described.bio, described.style, ...described.boundaries, ...described.traits].join(' · ');
  if (checkDescription(out)) return null;
  return { described, provider };
}

// ── Actor ────────────────────────────────────────────────────────────────────────────────────────────────────────

export const ActorSchema = z.object({
  /** 1 a 3 burbujas, como se escribe en WhatsApp. */
  messages: z.array(z.string().min(1).max(400)).min(1).max(3),
  /** La respuesta marca un límite (se entrega siempre por escrito, nunca como nota de voz). */
  sets_boundary: z.boolean(),
});
export type ActorReply = z.infer<typeof ActorSchema>;

export type ChatLine = { role: 'user' | 'persona' | 'system'; content: string; at: string; kind?: 'text' | 'voice' };

const pron = (s: PersonSpec) => (s.gender === 'masculino' ? 'él' : s.gender === 'femenino' ? 'ella' : 'elle');

function clock(iso: string, tz: string) {
  try {
    return new Intl.DateTimeFormat('es-MX', { timeZone: tz, weekday: 'short', hour: '2-digit', minute: '2-digit', hourCycle: 'h23' }).format(new Date(iso));
  } catch {
    return iso.slice(11, 16);
  }
}

export function actorInstructions(spec: PersonSpec, ctx: { emotion: EmotionState; label: EmotionLabel; presence: Presence; now: Date; timezone: string; boundary: string | null; risk: boolean }) {
  const doing = ctx.presence.state === 'online'
    ? 'Tienes el teléfono a la mano.'
    : ctx.presence.state === 'asleep'
      ? 'Te acabas de despertar y estás viendo los mensajes.'
      : `Ahora mismo estás ${ctx.presence.activity ?? 'con tus cosas'}: contesta como alguien que lo hace entre una cosa y otra.`;
  return `Eres ${spec.name}, ${personaLine(spec)}. Pronombre: ${pron(spec)}. ${spec.bio}
Rasgos: ${spec.traits.join(', ')}. Intereses: ${spec.interests.join(', ')}.
Cómo escribes: ${spec.style || 'natural, como en cualquier chat'}. Tono de base: ${spec.tone}.
Límites que NO negocias: ${spec.boundaries.join(' · ')}.

Estás chateando por WhatsApp con alguien que conociste hace poco (no sabes nada de su vida salvo lo que te cuente).
Hora local: ${clock(ctx.now.toISOString(), ctx.timezone)}. ${doing}

Cómo te sientes (no lo digas, que se note): ${expressionGuide(ctx.emotion, ctx.label)}
${ctx.boundary ? `Su último mensaje cruzó un límite (${ctx.boundary}). Márcalo con claridad, sin sermones y sin agresividad, en una frase corta.${ctx.risk ? ' Ya te había pasado: despídete y no sigas la conversación hoy.' : ''}\n` : ''}
Reglas:
- Responde como en un chat real: 1 a 3 mensajes cortos (cada uno 1–2 frases). Nada de párrafos ni listas.
- Español natural de tu ciudad, sin exagerar modismos. Minúsculas y emojis solo si van con tu estilo.
- No eres complaciente: si el mensaje es genérico, contesta corto; si es invasivo, marca el límite; si no te interesa
  algo, se nota. Tampoco eres cruel: eres una persona normal con su día.
- Nunca des consejos para ligar ni evalúes cómo escribe la otra persona. Nunca hables de apps, planes, precios ni dinero de la app.
- Nunca culpa, celos, chantaje ni "me tienes abandonada". Si te dejaron de escribir, no lo reclamas.
- Si te preguntan directamente si eres una IA, di con naturalidad que sí, que eres un personaje para practicar, y sigue la charla si quiere.
- Si la otra persona habla de hacerse daño o de una crisis, sal del personaje: dile con calidez que busque ayuda profesional o una línea de crisis.
- Nada sexual. Nunca aceptes ver a la persona en un lugar real ni compartas datos de contacto reales.`;
}

export async function actorReply(spec: PersonSpec, history: ChatLine[], ctx: Parameters<typeof actorInstructions>[1]): Promise<{ reply: ActorReply; provider: ProviderName }> {
  const transcript = history.slice(-24).map((m) => {
    if (m.role === 'system') return `[aviso de la app] ${m.content}`;
    const who = m.role === 'persona' ? `Tú (${spec.name})` : 'La otra persona';
    return `${who} [${clock(m.at, ctx.timezone)}]${m.kind === 'voice' ? ' (nota de voz)' : ''}: ${m.content}`;
  }).join('\n');
  const { object, provider } = await objectWithFallback({
    schema: ActorSchema,
    instructions: actorInstructions(spec, ctx),
    prompt: `Conversación hasta ahora:\n${transcript}\n\nEscribe tu respuesta al último mensaje de la otra persona.`,
    order: CHAT_ORDER,
    timeoutMs: 25_000,
    maxOutputTokens: 600,
  });
  const reply = object as ActorReply;
  return { reply: { ...reply, messages: reply.messages.map((m) => m.trim()).filter(Boolean).slice(0, 3) }, provider };
}

// ── Coach ────────────────────────────────────────────────────────────────────────────────────────────────────────

const COACH = `Eres un coach de habilidades sociales. Evalúas una conversación de práctica entre una persona y un personaje
ficticio. Valoras naturalidad, curiosidad genuina, reciprocidad, respeto, lectura de señales y saber cerrar o retirarse con
gracia. NO premias frases "ganadoras", trucos de seducción ni insistir. Retirarse bien cuando el personaje está cansado u
ocupado es un acierto. Habla en segunda persona, cálido y concreto, en español neutro. Cita frases reales de la persona.
Puntuaciones 1–5: ${SKILLS.map((s) => s.label).join(', ')}. rewrite: el mensaje propio más mejorable con 2 alternativas
naturales (no guiones de seducción). Si no hay uno claro, null.`;

export async function coachReport(spec: PersonSpec, messages: DebriefMessage[], timeline: TimelinePoint[]): Promise<{ report: CoachReport; provider: ProviderName }> {
  const transcript = messages.map((m) => `${m.role === 'user' ? 'Persona' : m.role === 'persona' ? spec.name : 'App'}: ${m.content}`).join('\n').slice(-12_000);
  const emotions = timeline.map((p) => `turno ${p.turn}: ${p.label}${p.trend !== 'flat' ? ` (${p.trend === 'up' ? 'subió' : 'bajó'})` : ''}${p.cause ? ` — ${p.cause}` : ''}`).join('\n');
  const { object, provider } = await objectWithFallback({
    schema: CoachSchema,
    instructions: COACH,
    prompt: `Personaje: ${spec.name}, ${personaLine(spec)}. Rasgos: ${spec.traits.join(', ')}. Límites: ${spec.boundaries.join(' · ')}.\n\nConversación:\n${transcript}\n\nEmoción del personaje turno a turno (simulada):\n${emotions || 'sin cambios claros'}`,
    timeoutMs: 40_000,
  });
  return { report: object as CoachReport, provider };
}
