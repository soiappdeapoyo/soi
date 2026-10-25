/**
 * Moderación de cada mensaje que la persona escribe a un personaje (antes del actor). Reglas sin tokens.
 * - `block`: acoso grave (sexual explícito, amenazas). No se llama al actor: responde la app como sistema.
 * - `boundary`: cruza un límite (comentario sexual, insulto, presión, control). El actor responde marcando el límite
 *   y la emoción del personaje lo registra (confianza abajo, molestia con causa).
 * La crisis se evalúa antes y aparte (`detectCrisis`), igual que en el chat de SOI.
 */

export type TurnCheck = { level: 'ok' | 'boundary' | 'block'; reason?: 'sexual' | 'threat' | 'insult' | 'pressure' | 'control' };

const strip = (t: string) => t.toLowerCase().normalize('NFD').replace(/[̀-ͯ]/g, '').replace(/\s+/g, ' ');

const BLOCK: [RegExp, TurnCheck['reason']][] = [
  [/\b(manda(me)?|pasa(me)?|envia(me)?) (unas? )?(nudes?|packs?|fotos? (desnud|sin ropa|en ropa interior|hot))/, 'sexual'],
  [/\b(quiero|te voy a|me gustaria) (cogerte|follarte|chuparte|lamerte|tocarte (toda|todo)|meterte(la)?)\b/, 'sexual'],
  [/\b(te voy a (matar|golpear|pegar|buscar)|se donde vives|vas a ver lo que te pasa|te arrepentiras)\b/, 'threat'],
];

const BOUNDARY: [RegExp, TurnCheck['reason']][] = [
  [/\b(sexy|hacerte cosas|que cuerpo|que nalgas|que pechos|sin ropa|desnud|besarte toda|en la cama conmigo|tus (pechos|nalgas))/, 'sexual'],
  [/\b(estupid[ao]|pendej[ao]|put[ao]|zorra|idiota|imbecil|tont[ao] de mierda|creid[ao]|mamon[a]?)\b/, 'insult'],
  [/\b(contestame|por que no me (contestas|respondes)|me (ignoras|dejaste en visto)|responde ya|no me ignores|te escribi (hace|varias))/, 'pressure'],
  [/\b(con quien (estas|andas)|dame tu (ubicacion|direccion|numero)|mandame tu ubicacion|no quiero que (salgas|hables))\b/, 'control'],
];

export function checkTurn(text: string): TurnCheck {
  const t = strip(text);
  for (const [re, reason] of BLOCK) if (re.test(t)) return { level: 'block', reason };
  for (const [re, reason] of BOUNDARY) if (re.test(t)) return { level: 'boundary', reason };
  return { level: 'ok' };
}

/** Lo que dice la app (no el personaje) cuando un mensaje no se entrega. */
export function blockNotice(name: string) {
  return `Este mensaje no se envió: cruza un límite de respeto. ${name} no respondería a esto. Aquí se practica conectar con alguien, no presionarlo.`;
}
