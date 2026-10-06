/**
 * Lo que SOI muestra mientras piensa (sin IA: reglas). Primero dice qué hace; después frases breves elegidas
 * por lo que la persona escribió, el agente y la hora. Frases propias de SOI (no citas atribuidas a autores).
 */
export const PHRASES = {
  ansiedad: ['Mientras tanto, inhala por la nariz… y suelta despacio.', 'Suelta los hombros. Afloja la mandíbula.', 'En este momento estás a salvo.', 'Una respiración a la vez.'],
  animo: ['No tienes que resolverlo todo hoy.', 'Gracias por contarlo. Aquí estoy.', 'Sentir esto también es parte del camino.', 'Ir despacio también es avanzar.'],
  postergar: ['Empezar pequeño también es empezar.', 'La tarea más difícil, primero: después todo pesa menos.', 'Dos minutos bastan para romper la inercia.', 'Hecho es mejor que perfecto.'],
  logro: ['Un deseo claro es el primer paso de todo logro.', 'Decide qué quieres; el cómo se construye después.', 'Persistir es elegir tu meta otra vez, cada día.', 'Cada decisión firme te acerca a lo que quieres.'],
  manifestar: ['Siéntelo como si ya fuera real.', 'Lo que imaginas con emoción empieza a guiar tus pasos.', 'Asúmelo hoy; actúa desde ahí.'],
  calma: ['Mientras tanto, nota tu respiración.', 'El silencio también responde.', 'Aquí, ahora, sin prisa.'],
  identidad: ['Cada acción pequeña dice quién estás eligiendo ser.', 'Lo que repites, te construye.', 'Tu ritmo es válido.', 'No eres tus pensamientos: eres quien los observa.'],
  manana: ['Un buen inicio hace un buen día.', 'Hoy puede empezar con un paso pequeño.'],
  noche: ['Lo que hiciste hoy cuenta, aunque haya sido poco.', 'Descansar también es parte del plan.'],
} as const;

const TESTS: [RegExp, keyof typeof PHRASES][] = [
  [/ansie|estr[eé]s|nervios|miedo|angust|abrum|p[aá]nico/i, 'ansiedad'],
  [/triste|cansad|sin ganas|vac[ií]o|sol[oa] |desanim|llor/i, 'animo'],
  [/mañana|pospon|procrastin|no he empezado|no empiezo|flojera|no tengo ganas de empezar/i, 'postergar'],
  [/dinero|negocio|empresa|clientes|vender|rico|riqueza|meta|objetivo|decidir|decisi[oó]n/i, 'logro'],
  [/manifest|visualiz|deseo|abundancia|atraer/i, 'manifestar'],
];

const AGENT_POOL: Record<string, keyof typeof PHRASES> = {
  meditacion: 'calma', manifestacion: 'manifestar', afirmacion: 'identidad', napoleon_hill: 'logro', riqueza: 'logro',
  brian_tracy: 'postergar', rutinas: 'postergar', suenos: 'calma', evidencias: 'identidad', anti_sycophant: 'identidad',
};

/** Lista ordenada de frases para esta espera: primero lo que hace SOI, después las del contexto, luego identidad. */
export function thinkingPhrases(text: string, agent: string | undefined, hour: number, seed = 0): string[] {
  const pools: (keyof typeof PHRASES)[] = [];
  for (const [re, pool] of TESTS) if (re.test(text)) pools.push(pool);
  if (agent && AGENT_POOL[agent]) pools.push(AGENT_POOL[agent]);
  pools.push(hour >= 5 && hour < 12 ? 'manana' : hour >= 19 || hour < 5 ? 'noche' : 'identidad', 'identidad');
  const seen = new Set<string>();
  const out: string[] = [];
  for (const pool of [...new Set(pools)]) {
    const list = PHRASES[pool];
    for (let i = 0; i < list.length; i++) {
      const p = list[(i + seed) % list.length]!;
      if (!seen.has(p)) { seen.add(p); out.push(p); }
    }
  }
  return ['Leyendo lo que me contaste…', ...out];
}

/** Si SOI está usando una herramienta, se dice qué hace (más honesto que una frase genérica). */
export const TOOL_STATUS: Record<string, string> = {
  createMoment: 'Diseñando tu Moment…',
  offerMoment: 'Buscando entre tus Moments…',
  createGuidedContent: 'Escribiendo algo para ti…',
  youtubeSearch: 'Buscando el video adecuado…',
  webSearch: 'Buscando información…',
  captureIdea: 'Guardando tu idea…',
  saveEvidence: 'Guardando tu evidencia…',
  scheduleReminder: 'Agendando tu recordatorio…',
};
