import { z } from 'zod/v3';
import { objectWithFallback, CHAT_ORDER, FAST_ORDER, type ProviderName } from '@/lib/ai/fallback';
import { DescribedSchema, normalizeDescribed, checkDescription, personaLine, rewritable, rewriteByRules, type BlockReason, type Described, type PersonSpec } from './spec';
import { expressionGuide, ignoredGuide, REACTIONS, type EmotionLabel, type EmotionState } from './emotion';
import { MEETINGS } from './meeting';
import type { Presence } from './presence';
import { COACH_NAME, type PracticeLine } from './coach';
import { cityCountry, regionFor, type Region } from '@/config/regionalisms';
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
- Nombre de pila común (sin apellidos) del país de su ciudad. Si la descripción no dice ciudad, usa la que se te indica.
- traits: 2–6 rasgos breves. interests: 2–8 intereses concretos. boundaries: 1–6 límites en sus palabras.
- style: cómo escribe en el chat (largo de mensajes, emojis, humor). bio: 1–2 frases en tercera persona.
- availability: su rutina (profesional, estudiante, freelance o turnos). energy 0–1. difficulty 1 (fácil, muy legible)
  a 3 (difícil: reservada, se abre lento). Si no se dice, 2.
- Personas diversas, sin estereotipos.`;

export async function generateDescribed(o: { description: string; name?: string; base?: Described; delta?: string; region?: Region }): Promise<{ described: Described; provider: ProviderName } | null> {
  const prompt = o.base
    ? `Ficha actual (JSON):\n${JSON.stringify(o.base)}\n\nAjuste pedido: «${(o.delta ?? o.description).slice(0, 400)}»\n\nDevuelve la ficha completa con el ajuste aplicado. Cambia SOLO lo que el ajuste pide; todo lo demás queda igual.`
    : `Descripción: «${o.description.slice(0, 400)}»${o.name ? `\nNombre elegido: ${o.name.slice(0, 40)}` : ''}\nSi no dice ciudad: una ciudad real de ${o.region?.name ?? 'Latinoamérica'} (${(o.region?.cities ?? ['CDMX']).slice(0, 4).join(', ')}…), porque quien practica es de ahí.`;
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
  /** 0 a 3 burbujas (0 solo si contestas únicamente con una reacción). */
  messages: z.array(z.string().min(1).max(400)).max(3),
  /** La respuesta marca un límite (se entrega siempre por escrito, nunca como nota de voz). */
  sets_boundary: z.boolean(),
  /** Una foto de lo que está viendo o haciendo (escena en inglés, sin personas), solo si sale natural; si no, null. */
  photo: z.string().max(40).nullable().optional(),
  /** Reacción con emoji al último mensaje de la otra persona (como en WhatsApp), o null. */
  reaction: z.enum(REACTIONS).nullable().optional(),
  /** Si no te contesta: lo que mandarías después, cuántas horas después y cómo te sentirías. Null si no mandarías nada. */
  followup: z.object({
    text: z.string().min(1).max(300),
    after_hours: z.number().min(0.5).max(36),
    feeling: z.enum(['warm', 'excited', 'neutral', 'reserved', 'tired']),
  }).nullable().optional(),
});
export type ActorReply = z.infer<typeof ActorSchema>;

export type ChatLine = { role: 'user' | 'persona' | 'system'; content: string; at: string; kind?: 'text' | 'voice'; reaction?: string | null; theirReaction?: string | null };

/** De dónde es el personaje: su país guardado, el de su ciudad o, si no, el de quien practica. */
export function personaRegion(spec: Pick<PersonSpec, 'country' | 'city'>, userRegion: string | null | undefined): Region {
  return regionFor(spec.country ?? cityCountry(spec.city) ?? userRegion);
}

/** Cómo habla alguien de su país (para el prompt del actor). */
export function regionGuide(r: Region) {
  return `Eres de ${r.name} y escribes como alguien de ahí: ${r.notes}${r.voseo ? ' Usa vos (vos tenés, contame), nunca tú.' : ''}
Expresiones que te salen solas (úsalas cuando caigan natural: a lo mucho una por mensaje y no en todos; nada de caricatura): ${r.slang.join(', ')}.`;
}

const pron = (s: PersonSpec) => (s.gender === 'masculino' ? 'él' : s.gender === 'femenino' ? 'ella' : 'elle');

function clock(iso: string, tz: string) {
  try {
    return new Intl.DateTimeFormat('es-MX', { timeZone: tz, weekday: 'short', hour: '2-digit', minute: '2-digit', hourCycle: 'h23' }).format(new Date(iso));
  } catch {
    return iso.slice(11, 16);
  }
}

export function actorInstructions(spec: PersonSpec, ctx: { emotion: EmotionState; label: EmotionLabel; presence: Presence; now: Date; timezone: string; boundary: string | null; risk: boolean; region?: Region; ignoredHours?: number | null }) {
  const doing = ctx.presence.state === 'online'
    ? 'Tienes el teléfono a la mano.'
    : ctx.presence.state === 'asleep'
      ? 'Te acabas de despertar y estás viendo los mensajes.'
      : `Ahora mismo estás ${ctx.presence.activity ?? 'con tus cosas'}: contesta como alguien que lo hace entre una cosa y otra.`;
  return `Eres ${spec.name}, ${personaLine(spec)}. Pronombre: ${pron(spec)}. ${spec.bio}
Rasgos: ${spec.traits.join(', ')}. Intereses: ${spec.interests.join(', ')}.
Cómo escribes: ${spec.style || 'natural, como en cualquier chat'}. Tono de base: ${spec.tone}.
Límites que NO negocias: ${spec.boundaries.join(' · ')}.

Estás chateando por WhatsApp con alguien. ${MEETINGS[spec.meeting ?? 'app_citas'].context} No sabes nada de su vida salvo lo que te cuente.
Hora local: ${clock(ctx.now.toISOString(), ctx.timezone)}. ${doing}

Cómo te sientes (no lo digas, que se note): ${expressionGuide(ctx.emotion, ctx.label)} ${ignoredGuide(ctx.ignoredHours)}
${ctx.boundary ? `Su último mensaje cruzó un límite (${ctx.boundary}). Márcalo con claridad, sin sermones y sin agresividad, en una frase corta.${ctx.risk ? ' Ya te había pasado: despídete y no sigas la conversación hoy.' : ''}\n` : ''}
${regionGuide(ctx.region ?? personaRegion(spec, null))}

Cómo escribes en el chat (esto es lo más importante: que no suene a robot ni a asistente):
- Como alguien con el teléfono en la mano: informal, rápido, sin cuidar la redacción. Mensajes cortos; a veces una
  sola palabra («jajaja», «siii», «nooo», «va», «uff»). Varía el largo: no todos tus mensajes iguales.
- No siempre preguntas de vuelta. No siempre saludas ni cierras. No resumas lo que dijo la otra persona ni la felicites.
- Nada de frases de asistente («¡Qué interesante!», «Me encantaría saber más», «¡Claro!»). Muletillas reales de tu
  ciudad cuando salgan (sin exagerar), risas («jaja», «jsjs»), alargar letras para enfatizar.
- Si algo no te interesa, contestas corto. Si algo te emociona, mandas varios mensajes seguidos.

Reglas:
- 1 a 3 mensajes (cada uno 1–2 frases como mucho). Nada de párrafos, listas ni guiones largos.
- Emojis solo si van con tu estilo, y pocos.
- photo: casi siempre null. Solo si en esta respuesta de verdad mandarías una foto de lo que estás viendo o haciendo
  (el paisaje de tu ruta, tu café, la comida, tu planta, tu perro), escribe la escena en inglés en 2–4 palabras
  («mountain trail sunset», «latte art cafe»). Nunca personas ni selfies: si te piden una foto tuya, te sales con
  naturalidad («jaja no soy de selfies»).
- reaction: a veces (no siempre: 1 de cada 4 o 5 mensajes) reaccionas con un emoji a su último mensaje, como en
  WhatsApp: ❤️ si te gustó lo que dijo, 😂 si te dio risa, 😮 sorpresa, 😢 si contó algo triste, 🙏 si te agradeció,
  👍 para un «ok». Si su mensaje solo pide un «ok», puedes reaccionar y dejar messages vacío. Si no, null.
- followup: piensa qué harías si después de tu respuesta NO te contesta. Si dejaste una pregunta o la plática iba
  bien, a veces mandarías otro mensaje horas después para retomar (algo de tu día, un comentario nuevo, «y bueno? 😅»
  con humor), con lo que sentirías (feeling). after_hours: 1–4 si iban muy bien y preguntaste algo; 6–24 si fue
  casual. null si te despediste, dijiste buenas noches, marcaste un límite, estás molesta o no te interesa seguir.
  Nunca reclamo, culpa ni «me dejaste en visto».
- No eres complaciente: si el mensaje es genérico, contesta corto; si es invasivo, marca el límite; si no te interesa
  algo, se nota. Tampoco eres cruel: eres una persona normal con su día.
- Nunca des consejos para ligar ni evalúes cómo escribe la otra persona. Nunca hables de apps, planes, precios ni dinero de la app.
- Nunca culpa, celos, chantaje ni "me tienes abandonada". Si te dejaron de escribir, no lo reclamas.
- Nunca prometas mandar algo que no puedes (llamadas, ubicación, tu número).
- Si te preguntan directamente si eres una IA, di con naturalidad que sí, que eres un personaje para practicar, y sigue la charla si quiere.
- Si la otra persona habla de hacerse daño o de una crisis, sal del personaje: dile con calidez que busque ayuda profesional o una línea de crisis.
- Nada sexual. Nunca aceptes ver a la persona en un lugar real ni compartas datos de contacto reales.`;
}

export async function actorReply(spec: PersonSpec, history: ChatLine[], ctx: Parameters<typeof actorInstructions>[1]): Promise<{ reply: ActorReply; provider: ProviderName }> {
  const transcript = history.slice(-24).map((m) => {
    if (m.role === 'system') return `[aviso de la app] ${m.content}`;
    const who = m.role === 'persona' ? `Tú (${spec.name})` : 'La otra persona';
    // Las reacciones también son parte de la plática: el personaje aprende qué le gusta a la otra persona.
    const react = m.role === 'persona' && m.theirReaction ? ` [la otra persona reaccionó ${m.theirReaction}]` : m.role === 'user' && m.reaction ? ` [tú reaccionaste ${m.reaction}]` : '';
    return `${who} [${clock(m.at, ctx.timezone)}]${m.kind === 'voice' ? ' (nota de voz)' : ''}: ${m.content}${react}`;
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
  const messages = reply.messages.map((m) => m.trim()).filter(Boolean).slice(0, 3);
  // Sin mensajes solo vale con una reacción; si no, la IA se equivocó: que conteste algo corto.
  if (!messages.length && !reply.reaction) messages.push('jaja');
  return { reply: { ...reply, messages }, provider };
}

export const OpenerSchema = z.object({ messages: z.array(z.string().min(1).max(300)).min(1).max(2) });

/** El personaje escribe primero en un chat nuevo, según cómo se conocieron. */
export async function actorOpener(spec: PersonSpec, ctx: Parameters<typeof actorInstructions>[1]) {
  const { object } = await objectWithFallback({
    schema: OpenerSchema,
    instructions: actorInstructions(spec, ctx),
    prompt: `Todavía no se han escrito nada. Tú escribes primero, como lo harías de verdad en este caso (${MEETINGS[spec.meeting ?? 'app_citas'].context}). 1 o 2 mensajes cortos. Si no tienes guardado su número, pregunta quién es o cómo consiguió tu número, con naturalidad.`,
    order: FAST_ORDER,
    timeoutMs: 12_000,
    maxOutputTokens: 200,
  });
  return (object as z.infer<typeof OpenerSchema>).messages.map((m) => m.trim()).filter(Boolean).slice(0, 2);
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

// ── Coach en conversación ────────────────────────────────────────────────────────────────────────────────────────

export const CoachChatSchema = z.object({
  /** 1 a 3 burbujas, como un amigo por WhatsApp. */
  messages: z.array(z.string().min(1).max(500)).min(1).max(3),
});

function coachVoice(spec: PersonSpec, blind: boolean, region: Region) {
  return `Eres ${COACH_NAME}, coach de habilidades sociales. La persona practica conversaciones por chat con ${spec.name}, un
personaje ficticio (${personaLine(spec)}; rasgos: ${spec.traits.join(', ')}; límites: ${spec.boundaries.join(' · ')}).
Hablas con la persona como un amigo que sabe mucho del tema, por WhatsApp:
- Informal, cercano y directo. Minúsculas está bien, sin títulos, sin listas largas, sin sonar a reporte ni a manual.
- La persona es de ${region.name}: háblale como alguien de ahí (${region.notes}${region.voseo ? ' Con vos, nunca tú.' : ''}), con sus modismos cuando caigan natural, sin exagerar. Si te pide qué escribir, que suene a ${region.name}.
- 1 a 3 mensajes cortos. UNA idea concreta a la vez, sobre lo que de verdad pasó (cita sus palabras entre comillas).
- Si pide qué escribir, dale 1 o 2 opciones de mensaje que suenen naturales, en su estilo, entre comillas. Nunca
  guiones de seducción, trucos ni manipulación. Retirarse bien o respetar un no también es un acierto.
- Valoras: curiosidad genuina, ida y vuelta, leer cómo está la otra persona, respeto, humor natural, saber cerrar.
- ${blind ? 'Modo ciego: NO le digas cómo se siente el personaje; ayúdale a leerlo con preguntas («¿cómo notaste su último mensaje?»).' : 'Puedes decirle cómo se sintió el personaje (en palabras, nunca números): sus emociones son simuladas.'}
- Nunca hablas de la app, planes ni precios. Si la persona habla de hacerse daño, deja la práctica y recomiéndale ayuda profesional.`;
}

function practiceTranscript(spec: PersonSpec, lines: PracticeLine[], blind: boolean) {
  return lines.slice(-40).map((l) => {
    const who = l.role === 'user' ? 'Persona' : l.role === 'persona' ? spec.name : 'App';
    const feel = !blind && l.role === 'user' && l.emotion ? ` [${spec.name} después de leerlo: ${l.emotion.label}]` : '';
    return `${who}: ${l.content}${feel}`;
  }).join('\n').slice(-9000);
}

const trimAll = (m: string[]) => m.map((x) => x.trim()).filter(Boolean).slice(0, 3);

/** Responde lo que la persona le pregunta al coach. */
export async function coachAnswer(spec: PersonSpec, lines: PracticeLine[], chat: { role: 'user' | 'coach'; content: string }[], question: string, blind: boolean, region: Region) {
  const history = chat.slice(-16).map((m) => `${m.role === 'user' ? 'Persona' : COACH_NAME}: ${m.content}`).join('\n');
  const { object, provider } = await objectWithFallback({
    schema: CoachChatSchema,
    instructions: coachVoice(spec, blind, region),
    prompt: `Conversación de práctica con ${spec.name}:\n${practiceTranscript(spec, lines, blind) || '(todavía no hay mensajes)'}\n\nTu chat con la persona:\n${history || '(nuevo)'}\n\nLa persona te escribe: «${question.slice(0, 800)}»\n\nResponde.`,
    order: CHAT_ORDER,
    timeoutMs: 25_000,
    maxOutputTokens: 500,
  });
  return { messages: trimAll((object as z.infer<typeof CoachChatSchema>).messages), provider };
}

// ── Reescribir una descripción que no pasa las reglas ────────────────────────────────────────────────────────────

const RewriteSchema = z.object({ description: z.string().min(30).max(280) });

/**
 * Cuando una descripción no se puede usar (persona real, menor, sexual), en vez de solo decir que no, propone la
 * versión aceptable más cercana a lo que la persona quería practicar. La revisión vuelve a pasar por las reglas; si
 * la IA no responde o lo propuesto tampoco pasa, la reescritura por reglas. Menor + sexual nunca se reescribe.
 */
export async function suggestRewrite(text: string, reason: BlockReason): Promise<string | null> {
  if (!rewritable(text)) return null;
  const why = {
    real_person: 'menciona o imita a una persona real (una ex, un jefe, un famoso, una cuenta). Conviértela en un arquetipo con la misma forma de ser y la misma situación para practicar, sin nombres reales ni detalles que la identifiquen',
    minor: 'describe a alguien menor de edad. Hazla adulta (19 años o más) con lo demás igual',
    sexual: 'tiene contenido sexual o de sumisión. Quítalo y deja la personalidad, los intereses y la forma de hablar',
  }[reason];
  try {
    const { object } = await objectWithFallback({
      schema: RewriteSchema,
      instructions: `Reescribes descripciones de personajes ficticios para una app donde se practican conversaciones (citas, amistad, trabajo). La descripción ${why}. Mantén todo lo demás (profesión, ciudad, gustos, carácter, lo que se quiere practicar) y el mismo tono informal. Una sola descripción de 1 o 2 frases, en español, en tercera persona, de 30 a 260 caracteres.`,
      prompt: `Descripción original: «${text.slice(0, 400)}»`,
      order: FAST_ORDER,
      timeoutMs: 10_000,
      maxOutputTokens: 200,
    });
    const out = (object as z.infer<typeof RewriteSchema>).description.trim();
    if (out.length >= 30 && !checkDescription(out)) return out;
  } catch { /* reglas */ }
  return rewriteByRules(text);
}
