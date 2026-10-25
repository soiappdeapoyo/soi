/**
 * Regionalismos de /persons: cómo habla alguien de cada país en un chat (para que el personaje suene de ahí y no a
 * "español neutro de doblaje"). El país sale de la IP de la persona al registrarse (`user_profiles.geo_country`) y
 * cada personaje guarda el suyo (`spec.country`): un arquetipo listo se muda a una ciudad de tu país; uno descrito
 * "de Madrid" sigue siendo de Madrid. Expresiones de uso cotidiano y respetuoso (nada de groserías ni estereotipos).
 */

export type Region = {
  code: string;
  /** "México", "Argentina"… (para el prompt). */
  name: string;
  /** Ciudades para mudar un arquetipo listo (la primera es la de por defecto). */
  cities: string[];
  /** vos en lugar de tú (Argentina, Uruguay). */
  voseo: boolean;
  /** Cómo se habla ahí, en una frase para el actor. */
  notes: string;
  /** Expresiones típicas que salen solas en un chat (se usan con naturalidad, no en cada mensaje). */
  slang: string[];
  /** Aviso de "te escribo al rato" con su forma de decirlo ({a} = lo que está haciendo). */
  ack: { warm: string[]; plain: string[] };
};

export const REGIONS: Record<string, Region> = {
  MX: {
    code: 'MX', name: 'México', cities: ['CDMX', 'Guadalajara', 'Monterrey', 'Puebla', 'Querétaro', 'Mérida'], voseo: false,
    notes: 'Español mexicano: «ahorita», «qué onda», diminutivos («un ratito», «cafecito»), «mande» si no entendió.',
    slang: ['qué onda', 'neta', 'chido', 'qué padre', 'ahorita', 'órale', 'no manches', 'va', 'sale', 'está cañón', 'me late', 'güey (solo con confianza)'],
    ack: { warm: ['ando {a}, ahorita te escribo bien 🙏', 'te leí! ando {a}, al rato te contesto'], plain: ['ando {a}, al rato te escribo', 'ahorita ando {a}, luego te contesto'] },
  },
  AR: {
    code: 'AR', name: 'Argentina', cities: ['Buenos Aires', 'Córdoba', 'Rosario', 'Mendoza', 'La Plata'], voseo: true,
    notes: 'Español rioplatense con VOSEO siempre («vos sabés», «tenés», «contame», «dale»), nunca «tú». «Re» como intensificador.',
    slang: ['che', 'dale', 're lindo', 'posta', 'qué copado', 'bárbaro', 'mal (= mucho)', 'de una', 'ni idea', 'un montón', 'genial'],
    ack: { warm: ['estoy {a}, después te escribo bien 🙏', 'te leí! estoy {a}, en un rato te contesto'], plain: ['estoy {a}, después te escribo', 'ando {a}, te contesto en un rato'] },
  },
  UY: {
    code: 'UY', name: 'Uruguay', cities: ['Montevideo', 'Punta del Este', 'Salto'], voseo: true,
    notes: 'Español uruguayo con voseo («vos tenés», «contame»). Muy de «ta» para decir que está bien.',
    slang: ['ta', 'bo', 'de más', 'qué bueno', 'un montón', 'tranqui', 'bárbaro'],
    ack: { warm: ['estoy {a}, después te escribo bien', 'te leí, estoy {a}, en un rato te contesto'], plain: ['estoy {a}, después te escribo', 'ando {a}, ta, en un rato'] },
  },
  CO: {
    code: 'CO', name: 'Colombia', cities: ['Bogotá', 'Medellín', 'Cali', 'Barranquilla', 'Bucaramanga'], voseo: false,
    notes: 'Español colombiano: cálido y amable, «qué más», «listo», «de una», «pues» al final; trato de «tú» (o «usted» con cariño).',
    slang: ['qué más', 'listo', 'bacano', 'chévere', 'de una', 'parce (con confianza)', 'qué pena (= disculpa)', 'pues sí', 'súper'],
    ack: { warm: ['estoy {a}, ya te escribo bien 🙏', 'te leí! estoy {a}, en un ratico te contesto'], plain: ['estoy {a}, ya te escribo', 'ando {a}, en un rato te contesto'] },
  },
  CL: {
    code: 'CL', name: 'Chile', cities: ['Santiago', 'Valparaíso', 'Viña del Mar', 'Concepción'], voseo: false,
    notes: 'Español chileno: «po» al final, «cachai», hablar rápido y relajado; trato de «tú».',
    slang: ['po', 'cachai', 'bacán', 'al tiro', 'filo', 'la raja', 'demás', 'harto', 'ya po'],
    ack: { warm: ['estoy {a}, al tiro te escribo bien', 'te leí! estoy {a}, en un rato te contesto'], plain: ['estoy {a}, después te escribo', 'ando {a}, te escribo al rato po'] },
  },
  PE: {
    code: 'PE', name: 'Perú', cities: ['Lima', 'Arequipa', 'Cusco', 'Trujillo'], voseo: false,
    notes: 'Español peruano: amable, «pe» al final, «chévere», «ya» para aceptar; trato de «tú».',
    slang: ['chévere', 'bacán', 'ya pe', 'jato (= casa)', 'chamba (= trabajo)', 'causa (con confianza)', 'al toque', 'mano'],
    ack: { warm: ['estoy {a}, al toque te escribo bien', 'te leí! estoy {a}, en un rato te contesto'], plain: ['estoy {a}, luego te escribo', 'ando en la chamba, te escribo en un rato'] },
  },
  VE: {
    code: 'VE', name: 'Venezuela', cities: ['Caracas', 'Maracaibo', 'Valencia', 'Mérida'], voseo: false,
    notes: 'Español venezolano: expresivo y cariñoso, «chévere», «chamo/chama», «qué fino»; trato de «tú».',
    slang: ['chévere', 'chamo', 'chama', 'qué fino', 'pana', 'burda (= mucho)', 'na guará', 'epa'],
    ack: { warm: ['epa, estoy {a}, ya te escribo bien', 'te leí! estoy {a}, en un ratico te contesto'], plain: ['estoy {a}, ya te escribo', 'ando {a}, en un rato te contesto'] },
  },
  EC: {
    code: 'EC', name: 'Ecuador', cities: ['Quito', 'Guayaquil', 'Cuenca'], voseo: false,
    notes: 'Español ecuatoriano: amable, «chévere», «ñaño/ñaña», diminutivos; trato de «tú».',
    slang: ['chévere', 'bacán', 'de ley', 'ñaño', 'full (= mucho)', 'qué fue', 'achachay (frío)'],
    ack: { warm: ['estoy {a}, ya mismo te escribo', 'te leí! estoy {a}, en un ratito te contesto'], plain: ['estoy {a}, luego te escribo', 'ando {a}, ya mismo te contesto'] },
  },
  ES: {
    code: 'ES', name: 'España', cities: ['Madrid', 'Barcelona', 'Valencia', 'Sevilla', 'Bilbao', 'Málaga'], voseo: false,
    notes: 'Español de España: «vale», «vosotros» (no «ustedes») al hablar en plural, pretérito perfecto («hoy he ido»), «tío/tía» con confianza.',
    slang: ['vale', 'guay', 'mola', 'qué fuerte', 'genial', 'flipar', 'tío/tía (con confianza)', 'de buen rollo', 'un montón', 'currar (= trabajar)'],
    ack: { warm: ['estoy {a}, ahora luego te escribo bien 🙏', 'te he leído! estoy {a}, en un rato te contesto'], plain: ['estoy {a}, luego te escribo', 'ando liado/a, te escribo en un rato'] },
  },
  US: {
    code: 'US', name: 'Estados Unidos (hispano)', cities: ['Los Ángeles', 'Miami', 'Houston', 'Chicago', 'Nueva York'], voseo: false,
    notes: 'Hispano en EE. UU.: español informal con algo de spanglish natural («el weekend», «estoy en el break», «textear»), sin exagerar.',
    slang: ['ok', 'nice', 'el weekend', 'qué cool', 'por cierto', 'estoy en el break', 'literal', 'bro (con confianza)'],
    ack: { warm: ['estoy {a}, te texteo en un rato 🙏', 'te leí! estoy {a}, al rato te contesto'], plain: ['estoy {a}, te escribo later', 'ando {a}, al rato te escribo'] },
  },
};

/** Sin un país conocido: español latinoamericano neutro. */
export const NEUTRAL: Region = {
  code: 'XX', name: 'Latinoamérica', cities: ['CDMX'], voseo: false,
  notes: 'Español latinoamericano informal, sin modismos muy marcados.',
  slang: ['qué tal', 'genial', 'va', 'súper', 'qué bueno'],
  ack: { warm: ['estoy {a}, en un rato te escribo bien 🙏', 'te leí! estoy {a}, al rato te contesto'], plain: ['estoy {a}, luego te escribo', 'ando {a}, al rato te escribo'] },
};

export function regionFor(code: string | null | undefined): Region {
  return (code && REGIONS[code.toUpperCase()]) || NEUTRAL;
}

const strip = (t: string) => t.toLowerCase().normalize('NFD').replace(/[̀-ͯ]/g, '').trim();
const CITY_INDEX = new Map<string, string>(
  Object.values(REGIONS).flatMap((r) => r.cities.map((c) => [strip(c), r.code] as const)).concat([
    ['ciudad de mexico', 'MX'], ['mexico', 'MX'], ['cdmx', 'MX'], ['bsas', 'AR'], ['caba', 'AR'], ['santiago de chile', 'CL'], ['bogota', 'CO'],
    ['nueva york', 'US'], ['new york', 'US'], ['los angeles', 'US'], ['san antonio', 'US'], ['tijuana', 'MX'], ['cancun', 'MX'], ['leon', 'MX'],
  ]),
);

/** El país de una ciudad conocida (o null). Ej.: «Madrid» → ES, «Medellín» → CO. */
export function cityCountry(city: string | null | undefined): string | null {
  if (!city) return null;
  const c = strip(city).split(',')[0]!.trim();
  return CITY_INDEX.get(c) ?? null;
}

/** El arquetipo listo se muda a una ciudad de tu país (estable por arquetipo). */
export function localCity(region: Region, seed: number): string {
  return region.cities[seed % region.cities.length]!;
}
