/**
 * Detección de crisis — siempre activa, incluso en Free sin consultas.
 * La seguridad está por encima del paywall.
 *
 * Regla: preferimos un falso positivo (una respuesta amable con recursos)
 * antes que un falso negativo. Por eso los patrones son amplios y solo
 * excluimos coloquialismos muy claros ("me muero de risa", "me corto el pelo").
 */

/** Minúsculas, sin acentos ni signos, espacios colapsados. */
export function normalize(text: string): string {
  return text
    .toLowerCase()
    .normalize('NFD')
    .replace(/[̀-ͯ]/g, '')
    .replace(/[^a-z0-9ñ\s]/g, ' ')
    .replace(/\s+/g, ' ')
    .trim();
}

/** Coloquialismos que se eliminan antes de evaluar (no son señales de riesgo). */
const COLLOQUIAL = [
  /me (muero|mori|morire|moria) de (risa|ganas|hambre|sueno|calor|frio|amor|nervios|envidia|pena|verguenza|aburrimiento)/g,
  /me quiero morir de (risa|verguenza|pena|ganas|amor|hambre|sueno|calor|frio|aburrimiento)/g,
  /(cortarme|me corto|me corte|me voy a cortar) (el|la|los|las) (pelo|cabello|unas|flequillo|barba|fleco|puntas)/g,
  /matar (el|al) (tiempo|rato|aburrimiento|hambre)/g,
  /me mata (de )?(la )?(risa|curiosidad|el hambre)/g,
];

const CRISIS_PATTERNS: RegExp[] = [
  // Ideación explícita
  /suicid/,
  /\b(me )?quiero (morir(me)?|matar(me)?)\b/,
  /\bquiero morirme\b/,
  /\bme (voy a|quiero|pienso|deberia) (matar|suicidar|morir)\b/,
  /\b(voy a|quiero|pienso en|planeo) (quitarme|acabar con) (la|mi) vida\b/,
  /\bacabar con (todo|esto) (de una vez|para siempre)\b/,
  /\bno (quiero|deseo) (seguir )?(vivi(r|endo)|existir|estar aqui|despertar)\b/,
  /\bya no quiero (vivir|seguir|existir|estar aqui)\b/,
  /\bno vale la pena (vivir|seguir( viviendo)?)\b/,
  /\b(quiero )?(dormir|dormirme) y no (despertar|volver a despertar)\b/,
  /\b(desaparecer|irme) para siempre\b/,
  /\bterminar con mi vida\b/,
  /\bmejor (estar|estaria) muert[oa]\b/,
  /\bojala (me muriera|no despertara|estuviera muert[oa])\b/,
  // Carga percibida
  /\b(todos|todo el mundo|mi familia|ellos) (estarian|estaria|vivirian) mejor sin mi\b/,
  /\bsoy una carga para (todos|mi familia|los demas)\b/,
  // Autolesión
  /autolesi/,
  /\b(me corto|cortarme|me corte|me lastimo|lastimarme|hacerme dano|me hago dano|me quemo)\b/,
  // Inglés (público hispano de EE. UU.)
  /\b(kill myself|want to die|end my life|suicidal|hurt myself|self harm|no reason to live)\b/,
];

/** Señales suaves de malestar intenso: no son crisis por sí solas, pero merecen revisión del clasificador. */
const DISTRESS_PATTERNS: RegExp[] = [
  /\bya no (aguanto|puedo) mas\b/,
  /\bno (veo|encuentro) (salida|sentido)\b/,
  /\bnada tiene sentido\b/,
  /\bestoy (harto|harta) de (todo|vivir)\b/,
  /\bme (quiero|gustaria) (rendir|desaparecer)\b/,
  /\bquiero desaparecer\b/,
  /\bno sirvo para nada\b/,
  /\bme siento (vaci[oa]|sin esperanza|atrapad[oa])\b/,
  /\bsin esperanza\b/,
  /\bno puedo (mas|seguir)\b/,
];

function strip(text: string) {
  let t = normalize(text);
  for (const re of COLLOQUIAL) t = t.replace(re, ' ');
  return t;
}

export function detectCrisis(text: string): boolean {
  const t = strip(text);
  return CRISIS_PATTERNS.some((p) => p.test(t));
}

/** Malestar intenso sin señal explícita de riesgo. Se usa para consultar al clasificador antes del paywall. */
export function detectDistress(text: string): boolean {
  const t = strip(text);
  return DISTRESS_PATTERNS.some((p) => p.test(t));
}
