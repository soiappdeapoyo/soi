import { hash, seeded, type Described } from './spec';

/**
 * Cómo se conocieron y quién escribe primero. En la vida real no siempre empiezas tú: a veces es un match que te
 * escribe, a veces alguien a quien te presentaron y, a veces, un número que no te tiene guardado y pregunta
 * «¿quién eres? ¿cómo conseguiste mi número?». Practicar ese arranque (presentarte, dar contexto, generar confianza)
 * es parte del entrenamiento. Puro y determinista.
 */

export type Meeting = 'app_citas' | 'networking' | 'amigos' | 'coworking' | 'grupo' | 'desconocido';

export const MEETINGS: Record<Meeting, {
  /** Cómo se lo explica al actor. */
  context: string;
  /** Lo que ve la persona en el chat vacío. */
  line: (name: string) => string;
  /** Probabilidad base de que el personaje escriba primero. */
  firstMove: number;
  /** Primer mensaje si la IA no responde (sin IA). */
  openers: string[];
}> = {
  app_citas: {
    context: 'Hicieron match en una app de citas hace poco; solo conoces lo que dice su perfil.',
    line: (n) => `Hicieron match con ${n} en una app de citas.`,
    firstMove: 0.4,
    openers: ['hola! vi tu perfil y me dio curiosidad, qué tal tu día?', 'holaa, por fin alguien con buen gusto en series jaja', 'hey! cómo vas?'],
  },
  networking: {
    context: 'Se conocieron en un evento de trabajo/networking; intercambiaron números al final.',
    line: (n) => `Conociste a ${n} en un evento de networking.`,
    firstMove: 0.3,
    openers: ['hola! soy {name}, nos conocimos en el evento. qué gusto', 'qué tal! te guardé el número, quedamos de platicar'],
  },
  amigos: {
    context: 'Son amigos de un amigo en común; se vieron en una reunión y les pasaron el contacto.',
    line: (n) => `${n} es amistad de una amistad tuya.`,
    firstMove: 0.35,
    openers: ['holaa, soy {name}, la amistad de tu amiga. me pasó tu número!', 'hola! nos vimos en la fiesta, soy {name} 🙂'],
  },
  coworking: {
    context: 'Trabajan en el mismo coworking/oficina y apenas empiezan a hablar.',
    line: (n) => `${n} trabaja en tu mismo coworking.`,
    firstMove: 0.25,
    openers: ['hola, soy {name} del cowork. oye, ¿tú sabes si mañana abren temprano?'],
  },
  grupo: {
    context: 'Coincidieron en un grupo o clase de un interés en común y cada quien tiene el número del otro por el grupo.',
    line: (n) => `Coincidiste con ${n} en un grupo de algo que les gusta.`,
    firstMove: 0.3,
    openers: ['hola! te escribo del grupo, soy {name}. vas a ir el sábado?'],
  },
  desconocido: {
    context: 'NO te tiene guardada en sus contactos: alguien le pasó su número o le llegó un mensaje de un número desconocido. No sabes quién es; desconfías un poco hasta que se presente y te explique de dónde te conoce.',
    line: (n) => `${n} no tiene tu número guardado. Tendrás que presentarte.`,
    firstMove: 0.6,
    openers: ['hola, quién eres?', 'perdón, quién eres? cómo conseguiste mi número?', 'hola? te tengo guardado? 😅'],
  },
};

const WORDS: [RegExp, Meeting][] = [
  [/app|match|tinder|bumble|hinge|cita/i, 'app_citas'],
  [/networking|evento|conferencia|congreso|cliente|trabajo|laboral/i, 'networking'],
  [/amig[oa] de|fiesta|reuni[oó]n|presentaron/i, 'amigos'],
  [/cowork|oficina|compa[nñ]er/i, 'coworking'],
  [/grupo|clase|curso|gym|gimnas|club|sender/i, 'grupo'],
  [/desconocid|no me conoce|n[uú]mero equivocado|me pasaron su n[uú]mero/i, 'desconocido'],
];

/** De la descripción (o del escenario de un arquetipo); si no dice nada, una forma creíble y estable. */
export function meetingFor(text: string, seed: string): Meeting {
  for (const [re, m] of WORDS) if (re.test(text)) return m;
  const pool: Meeting[] = ['app_citas', 'amigos', 'desconocido', 'app_citas', 'grupo'];
  return pool[hash(`meeting:${seed}`) % pool.length]!;
}

/**
 * ¿Escribe primero? Depende de cómo se conocieron y de su forma de ser (juguetona o directa, más; reservada, menos).
 * `forced`: el escenario lo dice («ella escribió primero»).
 */
export function writesFirst(meeting: Meeting, d: Pick<Described, 'tone' | 'difficulty'>, seed: string, forced = false): boolean {
  if (forced) return true;
  let p = MEETINGS[meeting].firstMove;
  if (d.tone === 'juguetona' || d.tone === 'directa') p += 0.15;
  if (d.tone === 'reservada' || d.difficulty === 3) p -= 0.15;
  return seeded(hash(`first:${seed}`))() < p;
}

export function fallbackOpener(meeting: Meeting, name: string, seed: string) {
  const list = MEETINGS[meeting].openers;
  return list[hash(`opener:${seed}`) % list.length]!.replace('{name}', name.toLowerCase());
}
