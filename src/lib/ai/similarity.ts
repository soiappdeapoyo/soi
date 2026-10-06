/**
 * Similitud por reglas (sin IA ni tokens): palabras con contenido, normalizadas y recortadas a su raíz
 * ("ansiedad"/"ansiosa" → "ansi", "dormir"/"dormirme" → "dorm"; los verbos irregulares como "duermo" no). Sirve para
 * relacionar conversaciones y Moments parecidos antes de gastar en el modelo.
 */
const STOP = new Set(('a al algo algun alguna alguno ante antes aqui asi aun bien cada como con contigo cual cuando de del desde donde dos el ella ellas ellos en entre era eres es esa ese eso esta estas este esto estoy fue hace hacer hasta hay hoy la las le les lo los mas me mi mis mucho muy nada ni no nos o otra otro para pero poco por porque que quiero quien se sea ser si sido sin sobre solo soy su sus tambien tan tanto te tener tengo ti tiene todo todos tu tus un una uno unos y ya yo ' +
  'cosa cosas dia dias vez veces quiero puedo puedes necesito siento estar estaba estado algo gracias hola favor ayuda ayudame soi momento moment moments minutos minuto').split(' '));

// Terminaciones frecuentes (de la más larga a la más corta): "ansiedad"/"ansiosa" → "ansi", "dormirme"/"dormir" → "dorm".
const CLITIC = /(me|te|se|lo|la|le|nos)$/;
const SUFFIX = /(amente|mente|aciones|acion|iones|ion|idades|idad|edad|osas|osos|osa|oso|ando|iendo|adas|ados|ada|ado|idas|idos|ida|ido|ar|er|ir|es|as|os|o|a|e|s)$/;

export function stem(word: string): string {
  let w = word;
  if (w.length >= 7 && CLITIC.test(w)) w = w.replace(CLITIC, '');
  const cut = w.replace(SUFFIX, '');
  if (cut.length >= 4) w = cut;
  return w.slice(0, 5);
}

export function stems(text: string): Set<string> {
  const words = text.toLowerCase().normalize('NFD').replace(/[̀-ͯ]/g, '').match(/[a-zñ]{4,}/g) ?? [];
  return new Set(words.filter((w) => !STOP.has(w)).map(stem));
}

/** 0–1: cuánto del texto corto se repite en el otro (con un mínimo de 2 raíces en común, o 1 si el texto es muy corto). */
export function overlap(a: Set<string>, b: Set<string>): number {
  if (!a.size || !b.size) return 0;
  let common = 0;
  for (const w of a) if (b.has(w)) common++;
  const need = Math.min(a.size, b.size) <= 2 ? 1 : 2;
  if (common < need) return 0;
  return common / Math.min(a.size, b.size);
}

/** Los `max` elementos más parecidos al texto (score ≥ min), del más al menos parecido. */
export function rankBySimilarity<T>(text: string, items: T[], textOf: (x: T) => string, max = 3, min = 0.34): (T & { score: number })[] {
  const q = stems(text);
  return items.map((x) => ({ ...x, score: overlap(q, stems(textOf(x))) }))
    .filter((x) => x.score >= min).sort((a, b) => b.score - a.score).slice(0, max);
}
