import type { Eslabon } from '@/config/agents';

/**
 * Hub de contenido SEO `/emociones`: lo que la persona busca en Google ("cómo quitar la ansiedad") llevado al
 * Principio SOI (Pensamientos → Emociones → Acciones → Resultados). Cada emoción explica, da una técnica con su
 * fuente (Regla #8: nada inventado) y muestra cómo SOI la convierte en un Moment (`FilmScript`, la animación).
 * Sin promesas de curación; SOI acompaña y no sustituye la atención profesional.
 */

/** Ícono de una acción del Moment en la animación (subconjunto de lucide). */
export type FilmIcon = 'wind' | 'brain' | 'eye' | 'pencil' | 'sparkles' | 'arrow' | 'timer' | 'heart' | 'refresh' | 'list' | 'target' | 'footprints';

/** Guion de la animación "cómo funciona SOI": cuéntale → te escucha → diseña tu Moment → lo vives → evidencia. */
export type FilmScript = {
  /** Lo que la persona le escribe a SOI. */
  message: string;
  /** La pregunta de SOI antes de proponer (escucha primero). */
  reply: string;
  /** Respuesta de un toque elegida. */
  chip: string;
  chips: [string, string, string];
  momentTitle: string;
  minutes: number;
  blocks: { icon: FilmIcon; label: string; minutes: number }[];
  /** Lo que guía la voz durante el paso que se muestra. */
  playing: { label: string; cue: [string, string] };
  moodBefore: number;
  moodAfter: number;
  /** Capacidad de Mi Nuevo Yo que se fortalece. */
  capacity: string;
};

export type Emotion = {
  slug: string;
  name: string;
  /** Título SEO (≤ 60 caracteres). */
  title: string;
  /** Meta descripción (≤ 160 caracteres). */
  description: string;
  h1: string;
  /** Frase corta para la tarjeta del hub. */
  hook: string;
  intro: string;
  eslabon: Eslabon;
  /** Cómo se siente (en primera persona: identificación). */
  signs: string[];
  /** Por qué pasa, en el ciclo pensamiento → emoción → acción → resultado. */
  cycle: { thought: string; emotion: string; action: string; result: string };
  /** Enemigo interior relacionado (`src/config/enemies.ts`). */
  enemy?: { name: string; whisper: string };
  technique: { name: string; minutes: number; source: string; steps: string[] };
  /** Lo que sí ayuda (hábitos con fuente). */
  habits: { title: string; text: string; source: string }[];
  /** Agente con el que abre el chat después del registro. */
  agent: string;
  film: FilmScript;
  faq: { q: string; a: string }[];
  related: string[];
};

export const ESLABON_LABEL: Record<Eslabon, string> = {
  pensamiento: 'Pensamientos',
  emocion: 'Emociones',
  accion: 'Acciones',
  resultado: 'Resultados',
};

export const EMOTIONS: Emotion[] = [
  {
    slug: 'ansiedad',
    name: 'Ansiedad',
    title: 'Ansiedad: cómo calmarla en 5 minutos',
    description: 'Qué es la ansiedad, por qué tu mente no se calla y una técnica de respiración y anclaje que puedes hacer ahora, con su fuente. En español.',
    h1: 'Ansiedad: cómo calmar la mente cuando no se apaga',
    hook: 'Cuando tu mente corre más rápido que tú.',
    intro: 'La ansiedad es la respuesta de tu cuerpo ante algo que percibe como una amenaza, aunque esa amenaza todavía no exista. No es debilidad: es un sistema de alarma que se quedó encendido. La buena noticia es que el cuerpo tiene un freno, y se activa con algo tan simple como alargar la exhalación.',
    eslabon: 'emocion',
    signs: [
      'Le das vueltas a lo mismo y no logras apagar la cabeza.',
      'Sientes el pecho apretado o la respiración corta.',
      'Te cuesta dormir porque repasas lo que puede salir mal.',
      'Imaginas el peor escenario antes de que pase nada.',
    ],
    cycle: {
      thought: '«¿Y si sale mal?»',
      emotion: 'Tensión y alerta en el cuerpo.',
      action: 'Evitas, revisas el teléfono, no descansas.',
      result: 'Más cansancio y más razones para preocuparte.',
    },
    enemy: { name: 'El Miedo', whisper: 'Es demasiado arriesgado.' },
    technique: {
      name: 'Respiración 4-6 + anclaje 5-4-3-2-1',
      minutes: 5,
      source: 'Respiración con exhalación prolongada (activa el sistema parasimpático) y técnica de anclaje sensorial 5-4-3-2-1, usada en terapia cognitivo-conductual',
      steps: [
        'Siéntate con los pies en el piso. Inhala por la nariz contando 4.',
        'Exhala lento por la boca contando 6. Repite 10 veces: la exhalación más larga le dice a tu cuerpo que está a salvo.',
        'Nombra 5 cosas que ves, 4 que puedes tocar, 3 que escuchas, 2 que hueles y 1 que saboreas.',
        'Escribe en una línea qué te preocupa y, debajo, qué parte sí depende de ti hoy.',
      ],
    },
    habits: [
      { title: 'Pon la preocupación en papel', text: 'Escribirla la saca del circuito que la repite. Luego separa lo que depende de ti de lo que no.', source: 'Terapia cognitivo-conductual (Aaron Beck)' },
      { title: 'Mueve el cuerpo', text: 'Una caminata de 10 minutos descarga la tensión acumulada mejor que pensar en ella.', source: 'Joe Dispenza — reconexión con movimiento por la tarde' },
      { title: 'Cierra el día antes de dormir', text: 'Revisa el día, agradece tres cosas y decide la tarea más importante de mañana: la mente deja de cargarla.', source: 'Joe Dispenza y Brian Tracy' },
    ],
    agent: 'meditacion',
    film: {
      message: 'No puedo apagar la cabeza. Mañana tengo una presentación y siento el pecho apretado.',
      reply: 'Te entiendo, eso agota. Antes de proponerte algo: al terminar, ¿qué te gustaría sentir?',
      chip: 'Calma',
      chips: ['Calma', 'Claridad', 'Solo hablar'],
      momentTitle: 'Soltar la presentación',
      minutes: 6,
      blocks: [
        { icon: 'wind', label: 'Respiración 4-6', minutes: 2 },
        { icon: 'refresh', label: 'Reencuadre de tu pensamiento', minutes: 2 },
        { icon: 'eye', label: 'Visualiza que sale bien', minutes: 1 },
        { icon: 'arrow', label: 'Tu próximo paso', minutes: 1 },
      ],
      playing: { label: 'Respiración 4-6', cue: ['Inhala…', 'Exhala…'] },
      moodBefore: 3,
      moodAfter: 7,
      capacity: 'Calma',
    },
    faq: [
      { q: '¿Cómo calmar la ansiedad rápido?', a: 'Alarga la exhalación: inhala contando 4 y exhala contando 6 durante dos o tres minutos. La exhalación prolongada activa el sistema nervioso parasimpático, el que le indica al cuerpo que puede bajar la guardia. Después, nombra lo que ves y escuchas a tu alrededor para volver al presente.' },
      { q: '¿Por qué la ansiedad empeora en la noche?', a: 'De noche hay menos distracciones y la mente repasa lo pendiente. Ayuda cerrar el día por escrito: lo que salió bien, lo que aprendiste y la tarea más importante de mañana, para que tu cabeza no tenga que sostenerla.' },
      { q: '¿Una app puede reemplazar la terapia para la ansiedad?', a: 'No. SOI te acompaña con prácticas breves y con fuente, pero no sustituye la atención psicológica ni médica. Si la ansiedad no te deja funcionar en tu día a día, busca a un profesional de la salud.' },
    ],
    related: ['estres', 'baja-autoestima', 'procrastinacion'],
  },
  {
    slug: 'estres',
    name: 'Estrés',
    title: 'Estrés: qué hacer cuando todo te rebasa',
    description: 'Cómo bajar el estrés cuando tienes demasiado en la cabeza: descarga mental, una sola prioridad y respiración en caja. Técnicas con fuente, en español.',
    h1: 'Estrés: qué hacer cuando sientes que todo te rebasa',
    hook: 'Cuando todo es urgente y nada avanza.',
    intro: 'El estrés aparece cuando sientes que lo que te piden es más grande que lo que puedes dar. Tu cabeza intenta sostener todo a la vez: pendientes, mensajes, lo que dijiste, lo que falta. No necesitas hacer más; necesitas sacar todo de la cabeza y elegir una sola cosa.',
    eslabon: 'emocion',
    signs: [
      'Tienes la sensación de que no te alcanza el día.',
      'Te irritas por cosas pequeñas.',
      'Saltas de una tarea a otra sin terminar ninguna.',
      'Llegas a la noche agotado, pero sin sentir que avanzaste.',
    ],
    cycle: {
      thought: '«Tengo que hacerlo todo, ya.»',
      emotion: 'Presión, tensión en hombros y mandíbula.',
      action: 'Haces muchas cosas a medias.',
      result: 'Más pendientes y la sensación de no avanzar.',
    },
    enemy: { name: 'El Perfeccionista', whisper: 'Todavía no está listo.' },
    technique: {
      name: 'Descarga mental + una sola prioridad',
      minutes: 7,
      source: 'Respiración en caja (box breathing) y Brian Tracy — Eat That Frog! (empezar por la tarea más importante)',
      steps: [
        'Respira en caja: inhala 4, sostén 4, exhala 4, sostén 4. Cuatro rondas.',
        'Escribe todo lo que tienes en la cabeza, sin ordenarlo. Todo.',
        'Pregúntate: si solo pudiera hacer una cosa hoy, ¿cuál haría la mayor diferencia? Enciérrala.',
        'Haz 15 minutos de esa tarea, sin abrir nada más.',
      ],
    },
    habits: [
      { title: 'Planea el día la noche anterior', text: 'Decidir antes de dormir cuál es la tarea más importante quita una decisión de tu mañana.', source: 'Brian Tracy — Eat That Frog!' },
      { title: 'Bloques de foco', text: 'Trabaja 25 minutos en una sola cosa y descansa 5. Lo urgente puede esperar media hora.', source: 'Francesco Cirillo — técnica Pomodoro' },
      { title: 'Silencio por la mañana', text: 'Unos minutos de silencio antes del teléfono te dejan empezar el día desde ti, no desde los pendientes de otros.', source: 'Hal Elrod — The Miracle Morning (S.A.V.E.R.S.)' },
    ],
    agent: 'rutinas',
    film: {
      message: 'Tengo mil pendientes, el jefe me escribe a cada rato y siento que no avanzo en nada.',
      reply: 'Suena a mucho a la vez. ¿Cuánto tiempo tienes ahora para ti?',
      chip: '10 minutos',
      chips: ['5 minutos', '10 minutos', 'Solo hablar'],
      momentTitle: 'De mil pendientes a uno',
      minutes: 9,
      blocks: [
        { icon: 'wind', label: 'Respiración en caja', minutes: 2 },
        { icon: 'pencil', label: 'Saca todo de tu cabeza', minutes: 3 },
        { icon: 'target', label: 'Elige tu sapo de hoy', minutes: 1 },
        { icon: 'timer', label: 'Foco de 15 min (lo empiezas)', minutes: 3 },
      ],
      playing: { label: 'Respiración en caja', cue: ['Inhala… 4', 'Sostén… 4'] },
      moodBefore: 2,
      moodAfter: 6,
      capacity: 'Enfoque',
    },
    faq: [
      { q: '¿Cómo bajar el estrés en el trabajo?', a: 'Saca los pendientes de la cabeza escribiéndolos, elige la tarea que haría la mayor diferencia y trabaja en ella un bloque corto sin interrupciones. Respirar en caja durante un minuto antes ayuda a bajar la activación del cuerpo.' },
      { q: '¿Cuál es la diferencia entre estrés y ansiedad?', a: 'En general, el estrés responde a una exigencia presente (mucho trabajo, una fecha límite) y baja cuando esa exigencia pasa. La ansiedad suele anticipar lo que podría pasar y puede seguir aunque no haya una exigencia concreta. Si alguno de los dos se vuelve constante, consulta a un profesional.' },
      { q: '¿Qué es «comerse el sapo»?', a: 'Es la idea central de Brian Tracy en Eat That Frog!: empezar el día con la tarea más importante (y casi siempre la que más evitas). Hacerla primero libera la tensión que te genera tenerla pendiente.' },
    ],
    related: ['ansiedad', 'falta-de-enfoque', 'procrastinacion'],
  },
  {
    slug: 'desmotivacion',
    name: 'Desmotivación',
    title: 'Desmotivación: cómo recuperar las ganas',
    description: 'Por qué te sientes sin ganas, por qué esperar la motivación no funciona y cómo reconectar con tu porqué en minutos. Técnicas con fuente.',
    h1: 'Desmotivación: cómo recuperar las ganas cuando no tienes',
    hook: 'Cuando sabes lo que quieres, pero no tienes ganas.',
    intro: 'La desmotivación no significa que no quieras tu meta: muchas veces significa que dejaste de verla. La motivación casi nunca llega antes de actuar; llega después de un pequeño avance. Por eso el camino de regreso empieza por recordar para qué haces lo que haces y dar un paso ridículamente pequeño.',
    eslabon: 'pensamiento',
    signs: [
      'Sabes lo que tienes que hacer, pero no te nace.',
      'Empiezas con energía y a los pocos días lo dejas.',
      'Ves videos que te inspiran y al día siguiente no queda nada.',
      'Te preguntas para qué esforzarte.',
    ],
    cycle: {
      thought: '«No tengo ganas; lo hago cuando me sienta mejor.»',
      emotion: 'Apatía, pesadez.',
      action: 'Lo pospones esperando la motivación.',
      result: 'Sin avances, y con eso, todavía menos ganas.',
    },
    enemy: { name: 'El Saboteador', whisper: 'Mañana.' },
    technique: {
      name: 'Tu porqué + el paso de 2 minutos',
      minutes: 5,
      source: 'Napoleon Hill — Think and Grow Rich (deseo y propósito definido) y James Clear — Atomic Habits (regla de los dos minutos)',
      steps: [
        'Escribe qué quieres lograr en una frase, en presente.',
        'Debajo, escribe por qué te importa: qué cambia en tu vida cuando lo tengas.',
        'Reduce tu siguiente paso a algo que tome dos minutos (abrir el documento, ponerte los tenis).',
        'Hazlo ahora. Solo eso. La motivación llega después de empezar.',
      ],
    },
    habits: [
      { title: 'Lee tu meta cada mañana', text: 'Escribir tus metas en presente cada día las mantiene vivas en tu mente.', source: 'Brian Tracy — Goals! (10 metas diarias)' },
      { title: 'Celebra lo pequeño', text: 'Registrar cada avance, aunque sea mínimo, te da la evidencia que la motivación necesita.', source: 'Muro de Evidencias de SOI, inspirado en Brian Tracy y Hal Elrod' },
      { title: 'Afirmaciones con acción', text: 'Una afirmación funciona mejor cuando dice qué vas a hacer, no solo quién eres.', source: 'Hal Elrod — The Miracle Morning' },
    ],
    agent: 'napoleon_hill',
    film: {
      message: 'Quería empezar a hacer ejercicio pero llevo semanas sin ganas de nada.',
      reply: 'Gracias por decirlo. ¿Qué te gustaría que cambiara si lo retomaras?',
      chip: 'Sentirme con energía',
      chips: ['Sentirme con energía', 'Verme mejor', 'Solo hablar'],
      momentTitle: 'Volver a moverme',
      minutes: 5,
      blocks: [
        { icon: 'heart', label: 'Tu porqué, en una frase', minutes: 1 },
        { icon: 'eye', label: 'Visualiza cómo te sientes después', minutes: 1 },
        { icon: 'footprints', label: 'Camina 2 minutos', minutes: 2 },
        { icon: 'sparkles', label: 'Celebra que empezaste', minutes: 1 },
      ],
      playing: { label: 'Visualiza cómo te sientes después', cue: ['Siente la energía…', 'Ya lo estás haciendo…'] },
      moodBefore: 3,
      moodAfter: 6,
      capacity: 'Constancia',
    },
    faq: [
      { q: '¿Cómo motivarme cuando no tengo ganas de nada?', a: 'No esperes a sentir ganas: haz un paso tan pequeño que no necesite motivación (dos minutos). La motivación suele aparecer después de empezar, no antes. Recordar por qué te importa tu meta te ayuda a dar ese primer paso.' },
      { q: '¿La desmotivación es lo mismo que la depresión?', a: 'No. Sentirte sin ganas por unos días es común. Si la falta de interés dura semanas, afecta tu sueño, tu apetito o tu forma de ver la vida, habla con un profesional de la salud mental.' },
      { q: '¿Sirve ver videos motivacionales?', a: 'Inspiran por unos minutos, pero la inspiración sin acción se evapora. SOI convierte lo que aprendes de esos videos en una práctica corta que vives el mismo día.' },
    ],
    related: ['sentirse-estancado', 'procrastinacion', 'baja-autoestima'],
  },
  {
    slug: 'falta-de-enfoque',
    name: 'Falta de enfoque',
    title: 'Falta de enfoque: cómo concentrarte de nuevo',
    description: 'Por qué no te puedes concentrar y cómo recuperar el foco con bloques de trabajo profundo y una sola prioridad. Técnicas con fuente, en español.',
    h1: 'Falta de enfoque: cómo volver a concentrarte',
    hook: 'Cuando abres el teléfono sin darte cuenta.',
    intro: 'Tu atención no está rota: está repartida. Cada notificación, pestaña y pendiente se lleva un pedazo. Concentrarte no es cuestión de fuerza de voluntad, sino de diseñar un rato en el que solo exista una cosa.',
    eslabon: 'accion',
    signs: [
      'Lees la misma línea tres veces.',
      'Abres el teléfono sin decidirlo.',
      'Empiezas varias cosas y no terminas ninguna.',
      'Al final del día no sabes en qué se te fue.',
    ],
    cycle: {
      thought: '«Solo reviso un momento.»',
      emotion: 'Inquietud, ganas de estímulo.',
      action: 'Cambias de tarea a cada rato.',
      result: 'Trabajo a medias y cansancio mental.',
    },
    enemy: { name: 'La Distracción', whisper: 'Solo un minuto en el teléfono.' },
    technique: {
      name: 'Un bloque de foco de 25 minutos',
      minutes: 30,
      source: 'Francesco Cirillo — técnica Pomodoro y Cal Newport — Deep Work (trabajo profundo)',
      steps: [
        'Escribe en una línea qué vas a terminar en este bloque. Una sola cosa.',
        'Deja el teléfono en otro cuarto o boca abajo, en silencio. Cierra las pestañas que no necesitas.',
        'Trabaja 25 minutos. Si aparece otra idea, anótala en un papel y vuelve.',
        'Descansa 5 minutos lejos de la pantalla. Si quieres, repite.',
      ],
    },
    habits: [
      { title: 'Decide antes de empezar', text: 'Saber exactamente qué vas a hacer evita que el primer minuto se vaya en decidir.', source: 'Brian Tracy — Eat That Frog!' },
      { title: 'Si-entonces', text: '«Si tomo el teléfono sin querer, entonces lo dejo y respiro tres veces.» Planear la respuesta de antemano la vuelve automática.', source: 'Peter Gollwitzer — intenciones de implementación' },
      { title: 'Mañanas sin pantalla', text: 'Los primeros minutos del día sin teléfono entrenan tu atención para el resto.', source: 'Robin Sharma — The 5AM Club' },
    ],
    agent: 'brian_tracy',
    film: {
      message: 'Tengo que terminar un proyecto y no logro concentrarme, todo me distrae.',
      reply: '¿Qué es lo único que, si lo terminas hoy, te dejaría tranquilo?',
      chip: 'La propuesta',
      chips: ['La propuesta', 'No sé', 'Solo hablar'],
      momentTitle: 'Un bloque para la propuesta',
      minutes: 30,
      blocks: [
        { icon: 'wind', label: 'Respiración para llegar', minutes: 1 },
        { icon: 'target', label: 'Qué vas a terminar', minutes: 1 },
        { icon: 'timer', label: 'Pomodoro de 25 min', minutes: 25 },
        { icon: 'pencil', label: 'Qué avanzaste', minutes: 3 },
      ],
      playing: { label: 'Pomodoro de 25 min', cue: ['Solo la propuesta…', 'Vas bien…'] },
      moodBefore: 4,
      moodAfter: 8,
      capacity: 'Enfoque',
    },
    faq: [
      { q: '¿Cómo concentrarme para estudiar o trabajar?', a: 'Elige una sola tarea, aleja el teléfono y trabaja en bloques cortos (25 minutos) con descansos de 5. Anota las distracciones en papel en lugar de atenderlas.' },
      { q: '¿Por qué me distraigo tanto con el celular?', a: 'Porque cada revisión te da una pequeña recompensa inmediata. Ponerle fricción (dejarlo en otro cuarto, silenciar notificaciones) es más efectivo que intentar resistirte con fuerza de voluntad.' },
      { q: '¿Qué es el trabajo profundo?', a: 'Es el concepto de Cal Newport para describir el trabajo hecho en concentración total, sin distracciones, sobre una tarea exigente. Es donde se produce lo que más valor tiene.' },
    ],
    related: ['procrastinacion', 'estres', 'sentirse-estancado'],
  },
  {
    slug: 'baja-autoestima',
    name: 'Baja autoestima',
    title: 'Baja autoestima: cómo hablarte mejor',
    description: 'Cómo dejar de criticarte: reconoce a tu crítico interior, reencuadra el pensamiento y junta evidencia de quién eres. Técnicas con fuente.',
    h1: 'Baja autoestima: cómo dejar de ser tu peor crítico',
    hook: 'Cuando la voz más dura es la tuya.',
    intro: 'Esa voz que te dice que no eres suficiente no eres tú: es un patrón que aprendiste. No se calla discutiéndole, sino tratándote como tratarías a alguien que quieres y juntando, día a día, pruebas de lo contrario.',
    eslabon: 'pensamiento',
    signs: [
      'Te comparas y siempre sales perdiendo.',
      'Minimizas lo que logras («no fue para tanto»).',
      'Te cuesta recibir un halago.',
      'Te hablas de una forma en que nunca le hablarías a un amigo.',
    ],
    cycle: {
      thought: '«No soy suficiente.»',
      emotion: 'Vergüenza, inseguridad.',
      action: 'No lo intentas, o no lo muestras.',
      result: 'Menos logros visibles que «confirman» la creencia.',
    },
    enemy: { name: 'El Crítico', whisper: 'No eres suficientemente bueno.' },
    technique: {
      name: 'Reencuadre con autocompasión',
      minutes: 6,
      source: 'Aaron Beck — terapia cognitiva (reestructuración de pensamientos) y Kristin Neff — autocompasión',
      steps: [
        'Escribe el pensamiento exacto que te está doliendo.',
        'Pregúntate: ¿qué evidencia tengo a favor y en contra? Escribe ambas.',
        'Escribe una versión más justa, como se la dirías a alguien que quieres.',
        'Pon la mano en el pecho y dite: «Esto es difícil. No soy el único que se siente así. Puedo tratarme con amabilidad.»',
      ],
    },
    habits: [
      { title: 'Una evidencia al día', text: 'Anota algo que hiciste bien hoy, aunque sea pequeño. Tu identidad se construye con pruebas, no con discursos.', source: 'Muro de Evidencias de SOI, inspirado en Brian Tracy' },
      { title: 'Afirmaciones creíbles', text: 'Si «soy increíble» te suena falso, prueba con una afirmación puente: «Estoy aprendiendo a confiar en mí».', source: 'Hal Elrod — The Miracle Morning (afirmaciones)' },
      { title: 'Tarjetas 3x5', text: 'Escribe una frase que quieras creer en una tarjeta y léela varias veces al día.', source: 'Brian Tracy — tarjetas de afirmación' },
    ],
    agent: 'afirmacion',
    film: {
      message: 'Siento que no soy suficiente. Todos avanzan y yo sigo igual.',
      reply: 'Gracias por confiarme eso. ¿Qué te dice exactamente esa voz cuando aparece?',
      chip: 'Que no sirvo',
      chips: ['Que no sirvo', 'Que voy tarde', 'Solo hablar'],
      momentTitle: 'Hablarme con justicia',
      minutes: 6,
      blocks: [
        { icon: 'wind', label: 'Respiración de calma', minutes: 1 },
        { icon: 'refresh', label: 'Reencuadre de «no sirvo»', minutes: 3 },
        { icon: 'sparkles', label: 'Tu afirmación puente', minutes: 1 },
        { icon: 'pencil', label: 'Una evidencia de hoy', minutes: 1 },
      ],
      playing: { label: 'Tu afirmación puente', cue: ['Estoy aprendiendo', 'a confiar en mí.'] },
      moodBefore: 3,
      moodAfter: 6,
      capacity: 'Confianza',
    },
    faq: [
      { q: '¿Cómo subir la autoestima?', a: 'Dos cosas ayudan juntas: cuestionar los pensamientos que te critican (¿qué evidencia hay de verdad?) y acumular pruebas pequeñas de lo que sí haces. La autoestima se construye con experiencias, no solo con frases.' },
      { q: '¿Las afirmaciones positivas funcionan?', a: 'Funcionan mejor cuando son creíbles para ti hoy. Si una afirmación te parece falsa, usa una «afirmación puente», un paso intermedio que sí puedas sostener, y acompáñala de una acción.' },
      { q: '¿Qué es la autocompasión?', a: 'Según Kristin Neff, es tratarte con la amabilidad con la que tratarías a un amigo, reconocer que el sufrimiento es parte de la experiencia humana y observar lo que sientes sin exagerarlo.' },
    ],
    related: ['ansiedad', 'desmotivacion', 'sentirse-estancado'],
  },
  {
    slug: 'sentirse-estancado',
    name: 'Sentirse estancado',
    title: 'Sentirse estancado: cómo salir del bloqueo',
    description: 'Por qué sientes que no avanzas y cómo moverte: define tu propósito, revisa tu semana y junta evidencia de progreso. Técnicas con fuente.',
    h1: 'Sentirse estancado: cómo volver a avanzar',
    hook: 'Cuando los días se parecen demasiado.',
    intro: 'Sentirte estancado suele significar que estás haciendo cosas, pero sin dirección, o que avanzas y no lo ves. Para moverte necesitas dos cosas: saber hacia dónde vas y una forma de ver tu progreso.',
    eslabon: 'resultado',
    signs: [
      'Sientes que tu vida está en pausa.',
      'Haces muchas cosas, pero ninguna te acerca a algo.',
      'No sabes qué quieres, solo que no es esto.',
      'Ves a otros avanzar y te preguntas qué te falta.',
    ],
    cycle: {
      thought: '«Nada cambia.»',
      emotion: 'Frustración, resignación.',
      action: 'Repites la misma rutina sin dirección.',
      result: 'Los mismos resultados, que refuerzan la idea.',
    },
    enemy: { name: 'El Conformista', whisper: 'Así está bien.' },
    technique: {
      name: 'Propósito definido + revisión de la semana',
      minutes: 10,
      source: 'Napoleon Hill — Think and Grow Rich (propósito principal definido) y Carol Dweck — Mindset (mentalidad de crecimiento)',
      steps: [
        'Escribe qué quieres que sea distinto en tu vida dentro de 6 meses. Concreto.',
        'Mira tu última semana: ¿qué hiciste que te acercó, aunque sea un poco? Anótalo.',
        'Cambia «no puedo» por «todavía no»: escribe qué te falta aprender.',
        'Elige un paso para esta semana y ponle día y hora.',
      ],
    },
    habits: [
      { title: 'Revisión semanal', text: 'Una vez a la semana, mira qué funcionó, qué no y qué sigue. Lo que se revisa, mejora.', source: 'Stephen Covey — Los 7 hábitos (planificación semanal)' },
      { title: 'Evidencia visible', text: 'Registra tus avances donde los veas. Muchas veces no estás estancado: no estás mirando.', source: 'Muro de Evidencias de SOI' },
      { title: 'Crecer 20 minutos al día', text: 'Leer o aprender algo cada mañana mueve tu identidad aunque lo demás no cambie todavía.', source: 'Robin Sharma — The 5AM Club (bloque «Crecer»)' },
    ],
    agent: 'napoleon_hill',
    film: {
      message: 'Siento que llevo meses igual. Trabajo, casa, repetir. No sé hacia dónde voy.',
      reply: 'Eso pesa. Si en seis meses algo fuera distinto, ¿qué te gustaría que fuera?',
      chip: 'Mi trabajo',
      chips: ['Mi trabajo', 'Mi salud', 'Solo hablar'],
      momentTitle: 'Encontrar mi dirección',
      minutes: 10,
      blocks: [
        { icon: 'target', label: 'Tu propósito en una frase', minutes: 3 },
        { icon: 'list', label: 'Lo que sí avanzaste', minutes: 3 },
        { icon: 'eye', label: 'Visualiza tu yo en 6 meses', minutes: 2 },
        { icon: 'arrow', label: 'Un paso con día y hora', minutes: 2 },
      ],
      playing: { label: 'Visualiza tu yo en 6 meses', cue: ['¿Dónde estás?', '¿Qué sientes?'] },
      moodBefore: 3,
      moodAfter: 7,
      capacity: 'Claridad',
    },
    faq: [
      { q: '¿Qué hacer cuando sientes que no avanzas en la vida?', a: 'Define con una frase qué quieres que cambie, revisa lo que sí avanzaste (casi siempre hay algo) y elige un solo paso para esta semana con día y hora. La dirección y la evidencia rompen la sensación de estancamiento.' },
      { q: '¿Qué es el propósito principal definido?', a: 'Es el primer principio de Napoleon Hill en Think and Grow Rich: saber con exactitud qué quieres lograr, por qué y qué estás dispuesto a dar a cambio. Sin ese punto de llegada, el esfuerzo se dispersa.' },
      { q: '¿Cómo sé qué quiero hacer con mi vida?', a: 'No hace falta tenerlo todo claro. Empieza por lo que no quieres que siga igual y por lo que te da energía. En SOI puedes conversarlo con el mentor Napoleon Hill, que te hace las preguntas para aclararlo.' },
    ],
    related: ['desmotivacion', 'falta-de-enfoque', 'procrastinacion'],
  },
  {
    slug: 'procrastinacion',
    name: 'Procrastinación',
    title: 'Procrastinación: cómo dejar de postergar',
    description: 'Por qué procrastinas aunque sepas lo que tienes que hacer, y cómo empezar hoy con la tarea más importante y un paso de 5 minutos.',
    h1: 'Procrastinación: cómo dejar de postergar lo importante',
    hook: 'Cuando «mañana» se vuelve tu palabra favorita.',
    intro: 'Procrastinar no es pereza. Casi siempre es una forma de evitar una emoción incómoda: miedo a hacerlo mal, aburrimiento, no saber por dónde empezar. Por eso no se resuelve con más presión, sino haciendo que empezar sea tan fácil que la emoción no tenga tiempo de frenarte.',
    eslabon: 'accion',
    signs: [
      'Haces cualquier cosa menos lo que importa.',
      'Te pones fechas que pasan sin que empieces.',
      'Trabajas mejor bajo presión… pero llegas agotado.',
      'Sientes culpa por lo que no hiciste.',
    ],
    cycle: {
      thought: '«Lo hago cuando tenga más tiempo.»',
      emotion: 'Alivio momentáneo, luego culpa.',
      action: 'Eliges algo más cómodo.',
      result: 'La tarea crece y la evitas más.',
    },
    enemy: { name: 'La Procrastinación', whisper: 'Primero algo más cómodo.' },
    technique: {
      name: 'Cómete el sapo en 5 minutos',
      minutes: 5,
      source: 'Brian Tracy — Eat That Frog! y Peter Gollwitzer — intenciones de implementación (si-entonces)',
      steps: [
        'Nombra la tarea que más estás evitando. Esa es tu «sapo».',
        'Pregúntate qué emoción estás evitando: ¿miedo, aburrimiento, no saber por dónde empezar?',
        'Divide la tarea hasta encontrar un primer paso de 5 minutos.',
        'Escribe un si-entonces: «Si son las 9:00, entonces abro el documento.» Y empieza ahora con 5 minutos.',
      ],
    },
    habits: [
      { title: 'Lo más importante, primero', text: 'Haz la tarea que más evitas a primera hora: el resto del día se siente más ligero.', source: 'Brian Tracy — Eat That Frog!' },
      { title: 'Reduce la fricción', text: 'Deja lista la noche anterior lo que necesitas para empezar (el archivo abierto, la ropa del gimnasio).', source: 'James Clear — Atomic Habits' },
      { title: 'Perdónate el retraso', text: 'Culparte por haber postergado aumenta la probabilidad de volver a hacerlo. Reconócelo y empieza.', source: 'Kristin Neff — autocompasión' },
    ],
    agent: 'brian_tracy',
    film: {
      message: 'Llevo una semana posponiendo mi tesis. Me siento culpable pero no puedo empezar.',
      reply: 'La culpa no ayuda a empezar, ¿verdad? ¿Qué parte de la tesis es la que más te pesa?',
      chip: 'No sé por dónde empezar',
      chips: ['No sé por dónde empezar', 'Me da miedo', 'Solo hablar'],
      momentTitle: 'Cinco minutos con mi tesis',
      minutes: 9,
      blocks: [
        { icon: 'wind', label: 'Suelta la culpa', minutes: 1 },
        { icon: 'list', label: 'Divide tu sapo', minutes: 2 },
        { icon: 'timer', label: 'Empieza: 5 minutos', minutes: 5 },
        { icon: 'arrow', label: 'Si-entonces para mañana', minutes: 1 },
      ],
      playing: { label: 'Empieza: 5 minutos', cue: ['Solo el primer párrafo…', 'Ya empezaste.'] },
      moodBefore: 2,
      moodAfter: 7,
      capacity: 'Disciplina',
    },
    faq: [
      { q: '¿Por qué procrastino si sé lo que tengo que hacer?', a: 'Porque procrastinar casi nunca es un problema de información, sino de emoción: evitas el miedo, el aburrimiento o la incertidumbre que te provoca la tarea. Reducir el primer paso a 5 minutos baja esa emoción lo suficiente para empezar.' },
      { q: '¿Cómo dejar de procrastinar de una vez?', a: 'No hay una solución de una vez, pero sí un sistema: decide la noche anterior tu tarea más importante, hazla primero y define con un si-entonces cuándo y dónde vas a empezar.' },
      { q: '¿Qué es una intención de implementación?', a: 'Es un plan con la forma «si pasa X, entonces hago Y», estudiado por el psicólogo Peter Gollwitzer. Decidir de antemano cuándo y dónde vas a actuar aumenta la probabilidad de hacerlo.' },
    ],
    related: ['falta-de-enfoque', 'desmotivacion', 'estres'],
  },
];

export function emotionBySlug(slug: string): Emotion | null {
  return EMOTIONS.find((e) => e.slug === slug) ?? null;
}

/** Guion de la animación del hub: el caso más buscado (ansiedad). */
export const HUB_FILM: FilmScript = EMOTIONS[0]!.film;
