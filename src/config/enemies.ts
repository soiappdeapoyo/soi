import type { ActionBlock, MomentKind } from '@/config/actions';
import type { Capacity } from '@/config/capacities';

/**
 * Enemigos interiores: patrones que todos experimentamos en mayor o menor medida (no diagnósticos).
 * SOI no lucha contra la persona: lucha junto a ella contra estos patrones.
 * Los aliados son las Capacidades de Mi Nuevo Yo. Cada enemigo tiene un Moment para combatirlo, con fuente.
 */
export type Enemy = {
  id: string;
  name: string;
  whisper: string;          // lo que susurra
  description: string;
  strengths: string[];      // cómo gana terreno
  allies: Capacity[];       // sus debilidades: las capacidades que lo vencen
  tactics: string[];        // qué funciona contra él
  /** Frases típicas (detección sin IA en el chat). */
  signals: RegExp;
  counter: { title: string; kind: MomentKind; source: string; blocks: Omit<ActionBlock, 'id'>[] };
};

const b = (type: ActionBlock['type'], title: string, minutes: number, config: Record<string, unknown>, source?: string): Omit<ActionBlock, 'id'> =>
  ({ type, title, minutes, config, ...(source ? { source } : {}) });

export const ENEMIES: Enemy[] = [
  {
    id: 'saboteador', name: 'El Saboteador', whisper: 'Mañana.', description: 'Siempre encuentra una razón para no empezar.',
    strengths: ['Convierte cualquier inicio en algo pesado', 'Te ofrece una excusa razonable', 'Aparece justo antes de empezar'],
    allies: ['Disciplina', 'Coraje', 'Enfoque'], tactics: ['Empezar con algo de 2 minutos', 'Decidir el primer paso antes de sentir ganas', 'Celebrar el inicio, no el final'],
    signals: /(mañana (lo|la) (hago|empiezo)|(lo|la) (hago|empiezo|termino) mañana|lo dejo para (mañana|despu[eé]s)|luego lo hago|no empec[eé]|no he empezado)/i,
    counter: { title: 'Empieza en 2 minutos', kind: 'growth', source: 'James Clear — Atomic Habits (regla de los 2 minutos)', blocks: [
      b('breathing', 'Llega al presente', 1, { inhale: 4, exhale: 6 }),
      b('next_step', 'Tu versión de 2 minutos', 2, { instruction: 'Escribe la versión más pequeña de lo que vienes posponiendo: algo que se haga en 2 minutos.' }, 'James Clear — Atomic Habits'),
      b('timer', 'Hazlo solo 5 minutos', 5, { instruction: 'Haz solo esa versión pequeña. Si después quieres seguir, sigue; si no, ya ganaste.' }),
      b('celebration', 'Empezaste', 1, { message: 'El Saboteador perdió esta: empezaste.' }),
    ] },
  },
  {
    id: 'critico', name: 'El Crítico', whisper: 'No eres suficientemente bueno.', description: 'Hace que nada sea suficiente.',
    strengths: ['Compara lo que haces con un ideal imposible', 'Habla con tu voz', 'Minimiza tus avances'],
    allies: ['Confianza', 'Gratitud', 'Calma'], tactics: ['Hablarte como a un amigo', 'Registrar evidencia de lo que sí haces', 'Separar la crítica útil del ataque'],
    signals: /(no soy (suficiente|lo suficientemente)|no sirvo|soy un fracaso|todo me sale mal|no soy capaz)/i,
    counter: { title: 'Háblate como a un amigo', kind: 'recovery', source: 'Kristin Neff — Self-Compassion; TCC (reestructuración cognitiva)', blocks: [
      b('breathing', 'Mano al pecho', 1, { inhale: 4, exhale: 6 }),
      b('writing', '¿Qué le dirías a un amigo?', 3, { prompt: 'Imagina que un amigo querido estuviera en tu lugar. ¿Qué le dirías? Escríbetelo a ti.' }, 'Kristin Neff — Self-Compassion'),
      b('gratitude', 'Tres cosas que sí hiciste bien', 2, { count: 3 }),
      b('affirmation', 'Tu voz amable', 1, { text: 'Estoy aprendiendo, y eso ya es suficiente por hoy.', repeat: 3 }),
    ] },
  },
  {
    id: 'duda', name: 'La Duda', whisper: '¿Y si sale mal?', description: 'Hace cuestionar cada decisión.',
    strengths: ['Genera indecisión', 'Hace imaginar el peor escenario', 'Retrasa decisiones'],
    allies: ['Claridad', 'Confianza', 'Coraje'], tactics: ['Evidencia objetiva', 'Acción inmediata', 'Conversaciones honestas'],
    signals: /(y si sale mal|no s[eé] si|no estoy segur[oa]|tengo dudas|no s[eé] qu[eé] decidir|no me decido)/i,
    counter: { title: 'Claridad antes de decidir', kind: 'growth', source: 'TCC (examinar la evidencia, Aaron Beck); Napoleon Hill — Decisión', blocks: [
      b('writing', '¿Qué evidencia objetiva tengo?', 2, { prompt: 'Escribe solo hechos: ¿qué evidencia tienes a favor y en contra de que salga bien?' }, 'TCC — Aaron Beck'),
      b('reflection', 'Peor, mejor y más probable', 2, { question: '¿Cuál es el peor escenario, el mejor y el más probable? ¿Podrías con el peor?' }),
      b('next_step', 'Decide y da el primer paso', 2, { instruction: 'Decide con lo que sabes hoy y escribe el primer paso que darás en las próximas 24 horas.' }, 'Napoleon Hill — Think and Grow Rich (decisión)'),
    ] },
  },
  {
    id: 'miedo', name: 'El Miedo', whisper: 'Es demasiado arriesgado.', description: 'Exagera los riesgos.',
    strengths: ['Agranda lo que podría salir mal', 'Te hace sentir que no estás listo', 'Confunde incomodidad con peligro'],
    allies: ['Coraje', 'Calma', 'Confianza'], tactics: ['Nombrar el miedo concreto', 'Planear cómo lo evitarías o repararías', 'Dar un paso pequeño a pesar del miedo'],
    signals: /(me da miedo|tengo miedo|me aterra|me paraliza|me da p[aá]nico)/i,
    counter: { title: 'Define tu miedo', kind: 'recovery', source: 'Fear-setting (Tim Ferriss, a partir de Séneca); ACT — acción comprometida', blocks: [
      b('breathing', 'Baja el ritmo', 2, { inhale: 4, exhale: 7 }),
      b('writing', 'Lo peor, cómo evitarlo, cómo repararlo', 3, { prompt: '¿Qué es lo peor que podría pasar? ¿Qué harías para evitarlo? Si pasara, ¿cómo lo repararías?' }, 'Fear-setting — Tim Ferriss'),
      b('next_step', 'Un paso valiente pequeño', 1, { instruction: 'Escribe un paso pequeño que puedas dar hoy aunque sientas miedo.' }, 'ACT — Steven Hayes'),
    ] },
  },
  {
    id: 'procrastinacion', name: 'La Procrastinación', whisper: 'Primero algo más cómodo.', description: 'Promete comodidad inmediata.',
    strengths: ['Te ofrece algo más fácil', 'Se disfraza de "estar ocupado"', 'Crece cuando la tarea es difusa'],
    allies: ['Disciplina', 'Enfoque', 'Constancia'], tactics: ['Comerte la rana primero', 'Bloques de foco cortos', 'Una sola tarea'],
    signals: /(procrastin|lo estoy posponiendo|lo pospuse|lo sigo dejando|perd[ií] el d[ií]a|no hice nada)/i,
    counter: { title: 'Cómete la rana', kind: 'growth', source: 'Brian Tracy — Eat That Frog!', blocks: [
      b('checklist', '¿Cuál es tu rana de hoy?', 2, { items: ['Elige la tarea más importante (la que más evitas)', 'Divídela en el primer paso concreto', 'Teléfono lejos'] }, 'Brian Tracy — Eat That Frog!'),
      b('pomodoro', '25 minutos solo con la rana', 25, { focus: 25, rest: 5, cycles: 1 }),
      b('celebration', 'Te la comiste', 1, { message: 'Lo más difícil del día ya pasó. La Procrastinación perdió terreno.' }),
    ] },
  },
  {
    id: 'distraccion', name: 'La Distracción', whisper: 'Solo un minuto en el teléfono.', description: 'Impide sostener la atención.',
    strengths: ['Fragmenta tu atención', 'Te premia con novedad', 'Se esconde en notificaciones'],
    allies: ['Enfoque', 'Calma'], tactics: ['Preparar el entorno antes de empezar', 'Una pestaña, una tarea', 'Bloques cortos con descanso'],
    signals: /(me distraigo|me distraje|no me puedo concentrar|no logro concentrarme|redes sociales todo el d[ií]a)/i,
    counter: { title: 'Entorno de foco', kind: 'growth', source: 'Cal Newport — Deep Work; técnica Pomodoro (Francesco Cirillo)', blocks: [
      b('checklist', 'Prepara tu entorno', 2, { items: ['Teléfono en otra habitación', 'Una sola pestaña abierta', 'Agua a la mano'] }, 'Cal Newport — Deep Work'),
      b('pomodoro', 'Un bloque de foco', 25, { focus: 25, rest: 5, cycles: 1 }, 'Francesco Cirillo — técnica Pomodoro'),
      b('reflection', '¿Qué te ayudó a sostener la atención?', 1, { question: '¿Qué te ayudó a sostener la atención esta vez?' }),
    ] },
  },
  {
    id: 'comparacion', name: 'La Comparación', whisper: 'Todos avanzan más rápido que tú.', description: 'Hace creer que todos avanzan más rápido.',
    strengths: ['Mide tu capítulo 1 contra el capítulo 20 de otros', 'Se alimenta de redes sociales', 'Te quita el gusto por tu avance'],
    allies: ['Gratitud', 'Confianza', 'Claridad'], tactics: ['Compararte con quien eras', 'Gratitud por lo propio', 'Enfocarte en tu siguiente paso'],
    signals: /(todos (avanzan|est[aá]n|tienen) (m[aá]s|mejor)|todos menos yo|me comparo|voy muy atrasad[oa])/i,
    counter: { title: 'Tú contra tu yo de ayer', kind: 'recovery', source: 'Carol Dweck — Mindset (mentalidad de crecimiento)', blocks: [
      b('gratitude', 'Lo que ya tienes', 2, { count: 3 }),
      b('writing', 'Hace 6 meses vs. hoy', 3, { prompt: '¿Cómo eras hace 6 meses y cómo eres hoy? Escribe tres diferencias concretas.' }, 'Carol Dweck — Mindset'),
      b('affirmation', 'Mi ritmo', 1, { text: 'Mi camino tiene su propio ritmo, y estoy avanzando.', repeat: 3 }),
    ] },
  },
  {
    id: 'perfeccionista', name: 'El Perfeccionista', whisper: 'Todavía no está listo.', description: 'Hace esperar el momento perfecto.',
    strengths: ['Sube la vara sin fin', 'Disfraza el miedo de calidad', 'Pospone la entrega'],
    allies: ['Coraje', 'Creatividad', 'Paciencia'], tactics: ['Definir "suficientemente bueno"', 'Entregar la versión 1', 'Iterar después'],
    signals: /(no (est[aá]|estaba|qued[oó]) perfect|todav[ií]a no est[aá] listo|no lo publiqu[eé]|cuando est[eé] perfecto|soy perfeccionista)/i,
    counter: { title: 'Entrega la versión 1', kind: 'growth', source: 'Carol Dweck — Mindset (el progreso sobre la perfección)', blocks: [
      b('writing', '¿Qué es "suficientemente bueno" hoy?', 2, { prompt: '¿Qué tendría que tener esto para ser suficientemente bueno hoy? Solo lo esencial.' }, 'Carol Dweck — Mindset'),
      b('timer', 'Termina y entrega la versión 1', 10, { instruction: 'Ajusta solo lo esencial y entrégalo o publícalo. La versión 2 vendrá después.' }),
      b('celebration', 'Lo soltaste', 1, { message: 'Hecho es mejor que perfecto. El Perfeccionista perdió esta.' }),
    ] },
  },
  {
    id: 'escasez', name: 'La Escasez', whisper: 'Nunca va a alcanzar.', description: 'Hace pensar que nunca habrá suficiente.',
    strengths: ['Te enfoca en lo que falta', 'Te hace decidir desde el miedo', 'Bloquea la generosidad y la inversión'],
    allies: ['Gratitud', 'Mentalidad de riqueza', 'Confianza'], tactics: ['Inventario de recursos', 'Gratitud por lo que hay', 'Un plan para crear más'],
    signals: /(nunca (me )?alcanza|no me alcanza|no hay dinero|siempre falta|no tengo suficiente)/i,
    counter: { title: 'Lo que ya tienes', kind: 'growth', source: 'Napoleon Hill — Think and Grow Rich (deseo y plan)', blocks: [
      b('gratitude', 'Gratitud por lo que hay', 2, { count: 5 }),
      b('writing', 'Tus recursos de hoy', 3, { prompt: '¿Qué recursos ya tienes (habilidades, personas, tiempo, dinero, conocimiento) para avanzar?' }, 'Napoleon Hill — Think and Grow Rich'),
      b('next_step', 'Un movimiento para crear más', 1, { instruction: 'Escribe una acción concreta que hoy te acerque a crear más.' }),
    ] },
  },
  {
    id: 'conformista', name: 'El Conformista', whisper: 'Así está bien.', description: 'Susurra que no vale la pena intentar más.',
    strengths: ['Disfraza el estancamiento de tranquilidad', 'Evita la incomodidad del crecimiento', 'Apaga el deseo'],
    allies: ['Claridad', 'Coraje', 'Liderazgo'], tactics: ['Visualizar el costo de no cambiar', 'Un objetivo que incomode un poco', 'Reconectar con el deseo'],
    signals: /(as[ií] est[aá] bien|para qu[eé] intentar|me conformo|ya ni modo|no vale la pena)/i,
    counter: { title: 'El costo de no cambiar', kind: 'growth', source: 'Napoleon Hill — Think and Grow Rich (deseo ardiente); Hal Elrod — The Miracle Morning (visualización)', blocks: [
      b('visualization', 'Dos futuros', 3, { scene: 'Imagina tu vida dentro de 5 años si nada cambia. Ahora imagínala si das el salto. Quédate con la segunda y siente la diferencia.' }, 'Hal Elrod — The Miracle Morning'),
      b('goal', 'Un objetivo que te incomode un poco', 2, { prompt: '¿Qué objetivo te incomoda un poco (y te emociona) para este mes?' }, 'Napoleon Hill — Think and Grow Rich'),
      b('next_step', 'El primer paso', 1, { instruction: 'Escribe el primer paso hacia ese objetivo.' }),
    ] },
  },
  {
    id: 'impulsivo', name: 'El Impulsivo', whisper: 'Lo quiero ya.', description: 'Quiere la recompensa inmediata.',
    strengths: ['Gana en el momento', 'Ignora a tu yo de mañana', 'Se activa con cansancio o estrés'],
    allies: ['Paciencia', 'Calma', 'Disciplina'], tactics: ['Pausar 90 segundos antes de actuar', 'Preguntar qué querría tu yo de mañana', 'Actuar según tus valores'],
    signals: /(no me pude contener|lo compr[eé] sin pensar|me dej[eé] llevar|actu[eé] sin pensar|reaccion[eé] mal)/i,
    counter: { title: 'La pausa', kind: 'recovery', source: 'ACT — acción basada en valores (Steven Hayes)', blocks: [
      b('breathing', 'Pausa de 90 segundos', 2, { inhale: 4, exhale: 6 }),
      b('reflection', 'Tu yo de dentro de un año', 2, { question: '¿Qué querría tu yo de dentro de un año que hicieras ahora?' }, 'ACT — Steven Hayes'),
      b('next_step', 'Una elección según tus valores', 1, { instruction: 'Escribe la elección que harías hoy si actuaras según tus valores.' }),
    ] },
  },
  {
    id: 'victima', name: 'La Víctima', whisper: 'No depende de mí.', description: 'Hace sentir que todo depende de las circunstancias.',
    strengths: ['Pone el poder afuera', 'Busca culpables', 'Te deja sin margen de acción'],
    allies: ['Liderazgo', 'Claridad', 'Persistencia'], tactics: ['Separar lo que sí depende de ti', 'Responder en lugar de reaccionar', 'Un paso dentro de tu control'],
    signals: /(no depende de m[ií]|es culpa de|no puedo hacer nada|siempre me pasa|la vida es injusta)/i,
    counter: { title: 'Lo que sí depende de ti', kind: 'growth', source: 'Stephen Covey — Los 7 hábitos (círculo de influencia); TCC', blocks: [
      b('writing', '¿Qué sí depende de mí?', 3, { prompt: 'Divide la situación: ¿qué no depende de ti y qué sí? Quédate con lo que sí.' }, 'Stephen Covey — Los 7 hábitos'),
      b('next_step', 'Un paso dentro de tu control', 1, { instruction: 'Escribe un paso que dependa solo de ti y que puedas dar hoy.' }),
      b('affirmation', 'Elijo mi respuesta', 1, { text: 'No elijo todo lo que pasa, pero sí cómo respondo.', repeat: 3 }),
    ] },
  },
  {
    id: 'autosabotaje', name: 'El Autosabotaje', whisper: 'Mejor no arriesgar lo que tienes.', description: 'Aparece justo antes de un avance importante.',
    strengths: ['Se activa cerca de la meta', 'Crea distracciones o conflictos', 'Protege la identidad vieja'],
    allies: ['Persistencia', 'Confianza', 'Constancia'], tactics: ['Reconocer el patrón cuando aparece', 'Preguntar qué temes de lograrlo', 'Comprometerte por escrito'],
    signals: /(siempre lo arruino|me autosabote|justo cuando (iba|estaba) bien|lo ech[eé] a perder)/i,
    counter: { title: 'Merezco avanzar', kind: 'growth', source: 'Napoleon Hill — persistencia; TCC (creencias nucleares)', blocks: [
      b('reflection', '¿Qué temo que pase si lo logro?', 2, { question: '¿Qué temes que pase si lo logras? ¿Qué parte de ti se siente amenazada?' }, 'TCC — creencias nucleares'),
      b('affirmation', 'Lo que estoy construyendo', 1, { text: 'Merezco lo que estoy construyendo y me permito llegar.', repeat: 3 }),
      b('contract', 'Compromiso contigo', 2, { commitment: 'Me comprometo a dar el siguiente paso aunque aparezca el miedo a avanzar.' }, 'Napoleon Hill — Think and Grow Rich (persistencia)'),
    ] },
  },
];

export const ENEMY_IDS = ENEMIES.map((e) => e.id) as [string, ...string[]];
export const enemyById = (id: string) => ENEMIES.find((e) => e.id === id) ?? null;

/** Detección sin IA (frases típicas) para respaldar a la IA en el chat. */
export function detectEnemies(text: string): string[] {
  return ENEMIES.filter((e) => e.signals.test(text)).map((e) => e.id);
}
