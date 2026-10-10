import type { ActionBlock } from '@/config/actions';
import { officialCover, type MomentFlow } from '@/lib/moments/types';

/**
 * Retos oficiales de 7 días: la puerta de entrada de quien llega desde TikTok con un autor en la cabeza
 * (Neville Goddard, Brian Tracy, Napoleon Hill). Cada día repite la práctica núcleo del autor y suma UNA
 * enseñanza suya. Un bloque con `day` es solo de ese día; sin `day`, se repite (src/lib/moments/challenge.ts).
 * Cada bloque cita su fuente (Regla #8).
 */

type Def = Pick<MomentFlow, 'title' | 'objective' | 'author' | 'eslabon' | 'source'> & { slug: string; blocks: ActionBlock[] };

const FTS = 'Neville Goddard — Feeling is the Secret';
const OOTW = 'Neville Goddard — Out of This World';
const GOALS = 'Brian Tracy — Goals!';
const FROG = 'Brian Tracy — Eat That Frog!';
const TGR = 'Napoleon Hill — Think and Grow Rich (1937), cap. 2: Deseo';

const NEVILLE: Def = {
  slug: 'reto_neville_7', title: '7 noches con Neville', author: 'Neville Goddard', eslabon: 'emocion', source: FTS,
  objective: 'Dormirte cada noche sintiendo tu deseo ya cumplido, con la técnica SATS, una enseñanza nueva por noche.',
  blocks: [
    { id: 'd1_desire', day: 1, type: 'writing', title: 'Tu deseo', minutes: 2, source: FTS,
      config: { prompt: '¿Qué deseo quieres sentir cumplido? Escríbelo en una frase, como si ya hubiera pasado.' } },
    { id: 'd1_scene', day: 1, type: 'writing', title: 'Tu escena', minutes: 2, source: FTS,
      config: { prompt: 'Elige una escena corta que solo pasaría si ya se cumplió: alguien te felicita, das las gracias, lo tienes en tus manos. Descríbela en pocas palabras.' } },
    { id: 'd2_feel', day: 2, type: 'writing', title: 'Siente, no solo veas', minutes: 2, source: FTS,
      config: { prompt: 'Sentir es el secreto. Si ya fuera tuyo, ¿qué sentirías en el cuerpo? Nómbralo en una palabra y llévala a tu escena esta noche.' } },
    { id: 'd3_revision', day: 3, type: 'reflection', title: 'La revisión', minutes: 3, source: 'Neville Goddard — The Law and the Promise (la revisión)',
      config: { question: 'Elige un momento de hoy que no salió como querías. Reescríbelo como te habría gustado que pasara, y míralo así antes de dormir.' } },
    { id: 'd4_inner', day: 4, type: 'reflection', title: 'Tu conversación interior', minutes: 3, source: 'Neville Goddard — dieta mental (conferencias)',
      config: { question: '¿Qué te dijiste hoy por dentro que no va con tu deseo? Escribe cómo te lo dirías si ya fuera real.' } },
    { id: 'd5_end', day: 5, type: 'writing', title: 'Piensa desde el final', minutes: 2, source: OOTW,
      config: { prompt: 'No pienses en tu deseo: piensa desde él. Ya cumplido, ¿qué es lo primero que harías mañana al despertar?' } },
    { id: 'd6_act', day: 6, type: 'reflection', title: 'La asunción se vuelve hecho', minutes: 2, source: `${OOTW} (las asunciones se vuelven hechos)`,
      config: { question: 'Una asunción sostenida se vuelve un hecho. ¿Qué gesto pequeño harías mañana como alguien que ya lo tiene?' } },
    { id: 'd7_look', day: 7, type: 'reflection', title: 'Tus 7 noches', minutes: 2, source: FTS,
      config: { question: 'Mira estas 7 noches: ¿qué cambió en cómo te sientes con tu deseo?' } },
    { id: 'relax', type: 'meditation', title: 'Relájate en tu cama', minutes: 3, source: `${FTS} (el estado parecido al sueño)`,
      config: { guide: 'Acuéstate y suelta el cuerpo, de los pies a la cabeza. Deja que la respiración se haga lenta. Busca ese punto de somnolencia en el que todavía estás consciente: ahí tu imaginación tiene más fuerza.' } },
    { id: 'scene', type: 'visualization', title: 'Tu escena del deseo cumplido', minutes: 8, source: FTS,
      config: { scene: 'Entra en tu escena desde dentro, no la mires desde fuera. Estás ahí, ya es tuyo. Escucha lo que te dicen, siente tus manos, siente el alivio. Quédate en la sensación de que ya pasó.' } },
    { id: 'sleep', type: 'visualization', title: 'Repítela hasta dormirte', minutes: 2, source: FTS,
      config: { scene: 'Repite la escena una y otra vez, como un bucle corto, hasta quedarte dormido en ella. No hay nada más que hacer: ya es tuyo.' } },
    { id: 'd7_done', day: 7, type: 'celebration', title: 'Completaste 7 noches', minutes: 1,
      config: { message: 'Siete noches durmiéndote en tu deseo cumplido. Eso ya no es un video: es tu práctica.' } },
  ],
};

const TRACY: Def = {
  slug: 'reto_tracy_7', title: '7 mañanas con Brian Tracy', author: 'Brian Tracy', eslabon: 'pensamiento', source: `${GOALS} / Eat That Frog!`,
  objective: 'Empezar cada mañana programando tu mente por escrito y terminar la semana con una meta principal y un plan.',
  blocks: [
    { id: 'wake', type: 'timer', title: 'Siéntate con papel', minutes: 1, seconds: 30, source: GOALS,
      config: { instruction: 'Siéntate con lápiz y papel. Antes de redes y mensajes, esto.' } },
    { id: 'say', type: 'affirmation', title: 'Dilo en voz alta', minutes: 1, seconds: 15, source: GOALS,
      config: { text: 'Hoy va a ser el mejor día de todos.', repeat: 1 } },
    { id: 'write_day', type: 'writing', title: 'Escribe tu día', minutes: 3, source: GOALS,
      config: { prompt: 'Escribe esa frase arriba de la página y luego cómo se desarrollará tu día. Específico y positivo.' } },
    { id: 'd1_ten', day: 1, type: 'writing', title: 'Tus 10 metas', minutes: 4, source: GOALS,
      config: { prompt: 'Escribe 10 metas para los próximos 12 meses, en presente y en primera persona, como si ya las hubieras logrado: «Gano…», «Corro…», «Termino…».' } },
    { id: 'd2_one', day: 2, type: 'goal', title: 'Tu meta principal', minutes: 2, source: GOALS,
      config: { prompt: 'De tus 10 metas, ¿cuál tendría el mayor impacto positivo en tu vida si la lograras? Esa es tu meta principal. Escríbela.' } },
    { id: 'd3_list', day: 3, type: 'writing', title: 'Todo lo que podrías hacer', minutes: 4, source: GOALS,
      config: { prompt: 'Haz una lista de todo lo que podrías hacer para lograr tu meta principal. Luego ordénala: ¿qué va primero?' } },
    { id: 'd4_frog', day: 4, type: 'next_step', title: 'Tu sapo de hoy', minutes: 2, source: FROG,
      config: { instruction: 'Tu sapo es la tarea más importante y la que más te cuesta. Decídela ahora y hazla antes que cualquier otra cosa.' } },
    { id: 'd5_abcde', day: 5, type: 'writing', title: 'El método ABCDE', minutes: 4, source: FROG,
      config: { prompt: 'Marca tus tareas de hoy: A = debes hacerla, B = deberías, C = sería bueno, D = delégala, E = elimínala. Empieza por tu A-1.' } },
    { id: 'd6_card', day: 6, type: 'writing', title: 'Tu tarjeta', minutes: 2, source: GOALS,
      config: { prompt: 'Escribe tu meta principal en una tarjeta pequeña, en presente, como si ya fuera real. Llévala contigo y léela al despertar y antes de dormir.' } },
    { id: 'd7_review', day: 7, type: 'reflection', title: 'Tu semana', minutes: 3, source: GOALS,
      config: { question: '¿Qué cambió esta semana al empezar el día por escrito? ¿Qué te llevas para la próxima?' } },
    { id: 'thank', type: 'affirmation', title: 'Gracias', minutes: 1, seconds: 15, source: GOALS,
      config: { text: 'Gracias.', repeat: 1 } },
    { id: 'd7_done', day: 7, type: 'celebration', title: 'Completaste 7 mañanas', minutes: 1,
      config: { message: 'Siete mañanas eligiendo tu día por escrito. Ya tienes tu meta principal y tu sapo: sigue así.' } },
  ],
};

const HILL: Def = {
  slug: 'reto_hill_7', title: '7 días con Napoleon Hill', author: 'Napoleon Hill', eslabon: 'pensamiento', source: TGR,
  objective: 'Convertir un deseo en un propósito definido con los seis pasos de Piense y hágase rico, uno por día.',
  blocks: [
    { id: 'breathe', type: 'breathing', title: 'Llega', minutes: 1, source: 'Respiración con exhalación prolongada',
      config: { pattern: 'calma' } },
    { id: 'd1_exact', day: 1, type: 'goal', title: 'Paso 1 · Lo que deseas, exacto', minutes: 3, source: TGR,
      config: { prompt: 'Fija en tu mente lo que deseas, con exactitud. Si es dinero, la cantidad exacta. No «más»: cuánto.' } },
    { id: 'd2_give', day: 2, type: 'writing', title: 'Paso 2 · Qué darás a cambio', minutes: 3, source: TGR,
      config: { prompt: 'No existe algo a cambio de nada. ¿Qué vas a dar a cambio de tu deseo: tiempo, servicio, aprendizaje, esfuerzo?' } },
    { id: 'd3_date', day: 3, type: 'writing', title: 'Paso 3 · Una fecha', minutes: 2, source: TGR,
      config: { prompt: 'Fija una fecha exacta en la que vas a tenerlo. Escríbela.' } },
    { id: 'd4_plan', day: 4, type: 'writing', title: 'Paso 4 · Un plan definido', minutes: 3, source: TGR,
      config: { prompt: 'Escribe un plan para lograrlo, aunque sea imperfecto. Tres pasos bastan.' } },
    { id: 'd4_begin', day: 4, type: 'next_step', title: 'Empieza hoy', minutes: 1, source: TGR,
      config: { instruction: 'Hill: empieza de inmediato, estés listo o no. ¿Cuál es el primer paso de tu plan que harás hoy?' } },
    { id: 'd5_statement', day: 5, type: 'writing', title: 'Paso 5 · Tu declaración', minutes: 4, source: TGR,
      config: { prompt: 'Escribe una declaración clara y breve: lo que deseas, la fecha, lo que darás a cambio y tu plan. Guárdala: la leerás cada día.' } },
    { id: 'd6_read', day: 6, type: 'visualization', title: 'Paso 6 · Léela y siéntela', minutes: 3, source: `${TGR} y cap. 4: Autosugestión`,
      config: { scene: 'Lee tu declaración en voz alta. Mientras la lees, vete, siéntete y créete ya en posesión de lo que deseas. Hill pide hacerlo dos veces al día: al despertar y antes de dormir.' } },
    { id: 'd7_read', day: 7, type: 'visualization', title: 'Léela otra vez', minutes: 3, source: 'Napoleon Hill — Think and Grow Rich (1937), cap. 4: Autosugestión',
      config: { scene: 'Lee tu declaración en voz alta, despacio. Siéntela como algo que ya es tuyo.' } },
    { id: 'd7_persist', day: 7, type: 'reflection', title: 'Persistencia', minutes: 2, source: 'Napoleon Hill — Think and Grow Rich (1937), cap. 9: Persistencia',
      config: { question: 'La duda va a aparecer. Cuando aparezca, ¿qué vas a hacer en lugar de rendirte?' } },
    { id: 'd7_done', day: 7, type: 'celebration', title: 'Completaste los 6 pasos', minutes: 1,
      config: { message: 'Tu deseo ya tiene cantidad, precio, fecha, plan y declaración. Ya no es un sueño: es un propósito.' } },
  ],
};

const DAYS = 7;

/** Minutos de un día del reto (lo que se repite + lo de ese día). */
export function dayMinutes(blocks: ActionBlock[], day: number): number {
  return blocks.filter((b) => b.day === undefined || b.day === day).reduce((s, b) => s + (b.seconds ?? b.minutes * 60), 0) / 60;
}

function build(d: Def): MomentFlow {
  // Los minutos que se muestran salen del contenido: el promedio de sus 7 días, nunca un número escrito a mano.
  const avg = Array.from({ length: DAYS }, (_, i) => dayMinutes(d.blocks, i + 1)).reduce((a, b) => a + b, 0) / DAYS;
  return {
    id: d.slug, slug: d.slug, official: true, creator_id: null, author: d.author,
    title: d.title, objective: d.objective, kind: 'challenge', eslabon: d.eslabon,
    blocks: d.blocks, source: d.source, required_minutes: Math.round(avg), duration_days: DAYS,
    tier: 'free', price_cents: 0, currency: 'usd', status: 'published', version: 1,
    parent_id: null, parent_slug: null, executions_count: 0, forks_count: 0,
    implementations_count: 0, completions_count: 0, is_demo: false, created_at: '2026-10-10T00:00:00.000Z',
    cover: officialCover(d.slug),
  };
}

export const OFFICIAL_CHALLENGES: MomentFlow[] = [NEVILLE, TRACY, HILL].map(build);

/** Los retos que ofrece la landing, por autor. */
export const CHALLENGE_SLUGS = { neville: 'reto_neville_7', tracy: 'reto_tracy_7', hill: 'reto_hill_7' } as const;
