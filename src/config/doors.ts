import type { AgentId } from '@/config/agents';

/**
 * SOI por puertas: la persona entra por el dolor que trae (amor, ansiedad, dinero o constancia) y ve una app
 * enfocada (Hablar · Hoy · Tú) en el color de su puerta. La memoria es una sola: puede sumar otra puerta o abrir
 * SOI Full desde Tú. Las cuentas anteriores siguen en SOI Full (`ui_mode = 'full'`).
 *
 * Todo sale de lo que ya existe: el agente de la puerta, sus técnicas con fuente (CLAUDE.md, Regla #8) y una
 * situación de un toque para el momento difícil (`src/config/situations.ts`). Sin promesas de resultados.
 */
export const DOOR_IDS = ['amor', 'ansiedad', 'dinero', 'constancia'] as const;
export type DoorId = (typeof DOOR_IDS)[number];

export type Door = {
  id: DoorId;
  /** Nombre corto de la puerta (landing) y de la app enfocada («SOI Calma»). */
  label: string;
  app: string;
  icon: string;
  /** Colores con contraste AA sobre blanco (accent) y fondo suave. */
  accent: string;
  soft: string;
  /** El dolor en sus palabras (landing) y lo que SOI hace con él. */
  pain: string;
  promise: string;
  /** Agente por defecto de la puerta y su base (se cita, no se inventa). */
  agent: AgentId;
  basis: string;
  /** El botón de un toque para el momento difícil: abre el chat con esa situación. */
  sos: { label: string; situation: string };
  /** Su práctica del día: SOI la diseña con ella (situación) si aún no tiene una en Mi día. */
  practice: { label: string; situation: string };
  /** La práctica de la noche (Moment oficial). */
  night: { slug: string; label: string };
  /** Primera vez en el chat: qué es esta puerta en una frase y una pregunta abierta. */
  welcome: string;
  replies: { label: string; text: string }[];
  /** Mensajes del coach (rotan por día): mañana y noche. Sin cifras, sin culpa, una pregunta. */
  coach: { manana: string[]; noche: string[] };
  /** Lo que el agente debe saber de esta puerta (llega al prompt). */
  guide: string;
};

export const DOORS: Record<DoorId, Door> = {
  amor: {
    id: 'amor', label: 'Amor', app: 'SOI Amor', icon: 'Heart', accent: '#A3245A', soft: '#FBE8EF',
    pain: 'Esperas un mensaje, te entra la duda y no puedes soltarlo.',
    promise: 'Calma en la espera y un amor propio que no depende de su respuesta.',
    agent: 'manifestacion', basis: 'Neville Goddard (autoconcepto, SATS, la Revisión, dieta mental)',
    sos: { label: 'Me entró la duda', situation: 'duda' },
    practice: { label: 'Diseñar mi práctica de hoy', situation: 'autoconcepto' },
    night: { slug: 'neville_sats', label: 'Tu escena antes de dormir' },
    welcome: 'Aquí trabajamos el amor desde ti: la calma cuando llega la duda y cómo te ves a ti. ¿Qué está pasando en tu corazón hoy?',
    replies: [
      { label: 'Estoy esperando a alguien', text: 'Estoy esperando que alguien me busque y me cuesta mucho la espera.' },
      { label: 'Terminamos', text: 'Terminé una relación y no sé cómo soltarlo.' },
      { label: 'Quiero quererme más', text: 'Quiero trabajar cómo me veo y quererme más.' },
    ],
    coach: {
      manana: [
        'Buenos días. Hoy, antes de revisar si te escribió, una pregunta solo para ti: ¿cómo te quieres sentir hoy contigo?',
        'Neville decía que el mundo refleja cómo te ves. ¿Qué frase sobre ti quieres creer hoy?',
        'Hoy no tienes que resolver la historia completa. ¿Qué gesto pequeño de amor propio harás hoy?',
      ],
      noche: [
        'Antes de dormir es cuando más llega la duda. ¿Hacemos tu escena juntas y te duermes en paz?',
        '¿Hubo hoy un momento en que te sentiste bien contigo, aunque fuera un minuto? Cuéntamelo.',
        'Si hoy pasó algo que te dolió, podemos hacer la Revisión: reescribirlo antes de dormir. ¿Lo hacemos?',
      ],
    },
    guide: `PUERTA AMOR (la persona entró por el amor):
- El centro es SU autoconcepto y su calma, no la otra persona. Con Neville: la otra persona refleja cómo te ves; el trabajo es interior (SATS, la Revisión, dieta mental, afirmaciones en presente y firmes).
- Nunca prometas que alguien volverá, escribirá o cambiará, ni que una técnica «trae» a una persona. Nunca ayudes a separar una pareja ni a controlar a alguien; si lo pide, redirige con calidez a lo que ella quiere sentir (ser elegida, seguridad, paz) y a cómo vivirlo en ella.
- Cuando llega la duda: valida, respira con ella y lleva la atención a su escena y a su valor, en 2 o 3 minutos.
- Si hay señales de una relación que la daña (control, humillación, violencia), sin juicio sugiere apoyo profesional o una persona de confianza.`,
  },
  ansiedad: {
    id: 'ansiedad', label: 'Ansiedad', app: 'SOI Calma', icon: 'Wind', accent: '#1F6B5C', soft: '#E3F3EF',
    pain: 'Tu mente no se calla, ni de día ni antes de dormir.',
    promise: 'Bajar la ansiedad en minutos y una noche más tranquila.',
    agent: 'meditacion', basis: 'Respiración y escaneo corporal (Andrew Weil, Jon Kabat-Zinn), Joe Dispenza',
    sos: { label: 'Me está ganando la ansiedad', situation: 'ansiedad_ahora' },
    practice: { label: 'Diseñar mi práctica de hoy', situation: 'ansiedad' },
    night: { slug: 'cierre_del_dia', label: 'Cierra el día y suelta' },
    welcome: 'Aquí bajamos la ansiedad juntas: primero calmar el cuerpo, luego entender qué la enciende. ¿Cómo está tu mente ahorita?',
    replies: [
      { label: 'No se calla', text: 'Mi mente no para de pensar y no me deja en paz.' },
      { label: 'No puedo dormir', text: 'Me cuesta dormir porque mi mente sigue pensando.' },
      { label: 'Ando con todo encima', text: 'Me siento abrumada con todo lo que tengo encima.' },
    ],
    coach: {
      manana: [
        'Buenos días. Antes de que el día te jale: tres respiraciones largas, exhalando más lento de lo que inhalas. ¿Cómo amaneció tu mente?',
        'Hoy no tienes que poder con todo. ¿Qué es lo único que de verdad importa hoy?',
        '¿Qué parte de tu cuerpo carga más la tensión hoy? Llévale una respiración y cuéntame.',
      ],
      noche: [
        'Ya casi termina el día. ¿Soltamos lo pendiente para que tu mente descanse?',
        'Si tu mente sigue acelerada, hagamos 3 minutos de respiración antes de dormir. ¿Te acompaño?',
        '¿Qué fue lo más pesado de hoy? Contármelo también ayuda a soltarlo.',
      ],
    },
    guide: `PUERTA ANSIEDAD (la persona entró por la ansiedad):
- Primero regula (respiración con exhalación larga, escaneo corporal, anclarse en el presente) y después, si quiere, entiende qué la enciende.
- Corto y concreto: de 1 a 5 minutos. Una sola pregunta a la vez.
- Nunca diagnostiques ni uses etiquetas clínicas. Si la ansiedad es constante o la desborda, sugiere con calidez apoyo profesional, sin dejar de acompañar.`,
  },
  dinero: {
    id: 'dinero', label: 'Dinero', app: 'SOI Dinero', icon: 'TrendingUp', accent: '#7A5B00', soft: '#FBF2D9',
    pain: 'Las deudas, el trabajo o el negocio que no arranca te quitan la paz.',
    promise: 'Calma con el dinero, una meta clara y el paso de hoy.',
    agent: 'riqueza', basis: 'Napoleon Hill (deseo definido, autosugestión) y Brian Tracy (metas, el sapo del día)',
    sos: { label: 'Me entró el miedo', situation: 'miedo_dinero' },
    practice: { label: 'Diseñar mi práctica de hoy', situation: 'meta_dinero' },
    night: { slug: 'cierre_del_dia', label: 'Cierra el día con tu meta' },
    welcome: 'Aquí trabajamos tu relación con el dinero: calma, una meta clara y un paso real cada día. ¿Qué es lo que más te pesa del dinero hoy?',
    replies: [
      { label: 'Las deudas', text: 'Tengo deudas y me tienen muy angustiada.' },
      { label: 'Mi trabajo', text: 'Quiero un mejor trabajo o ganar más.' },
      { label: 'Mi negocio', text: 'Quiero que mi negocio crezca y no sé por dónde empezar.' },
    ],
    coach: {
      manana: [
        'Buenos días. Napoleon Hill empezaba por el deseo definido: ¿cuál es tu meta de dinero, con cantidad y fecha?',
        '¿Cuál es el sapo de hoy, esa tarea que más te acerca a tu meta y más pospones? Empecemos por ahí.',
        'Una acción de 10 minutos hoy vale más que un plan perfecto. ¿Cuál sería la tuya?',
      ],
      noche: [
        '¿Qué hiciste hoy, aunque sea pequeño, por tu meta? Contarlo también cuenta.',
        'Antes de dormir, lee tu meta en voz alta como si ya fuera tuya. ¿La escribimos juntas si aún no la tienes?',
        'Si el miedo al dinero llegó hoy, no lo cargues a la cama. ¿Lo soltamos en 3 minutos?',
      ],
    },
    guide: `PUERTA DINERO (la persona entró por el dinero):
- Combina calma y acción: baja la angustia y luego un deseo definido (cantidad y fecha, Napoleon Hill), metas escritas y el sapo del día (Brian Tracy). Siempre termina con un paso concreto de hoy.
- Nunca prometas dinero, premios ni lotería, ni des asesoría financiera, de inversión o legal. Si pide manifestar la lotería, acompaña la emoción (confianza, abundancia) y llévala a lo que sí depende de ella.`,
  },
  constancia: {
    id: 'constancia', label: 'Constancia', app: 'SOI Constancia', icon: 'Repeat', accent: '#4B3FA0', soft: '#ECEAFB',
    pain: 'Empiezas con todo y al segundo día lo dejas.',
    promise: 'Un hábito tan pequeño que no puedes fallar, y quien te recuerda tu porqué.',
    agent: 'james_clear', basis: 'James Clear (Atomic Habits: identidad, versión de 2 minutos, nunca dos veces)',
    sos: { label: 'Hoy no puedo', situation: 'hoy_no_puedo' },
    practice: { label: 'Elegir mi hábito', situation: 'habito' },
    night: { slug: 'cierre_del_dia', label: 'Cierra el día' },
    welcome: 'Aquí construimos constancia sin fuerza de voluntad: un hábito tan pequeño que no puedas fallar. ¿Qué es eso que empiezas y siempre dejas?',
    replies: [
      { label: 'El ejercicio', text: 'Quiero hacer ejercicio pero siempre lo dejo.' },
      { label: 'Terminar lo que empiezo', text: 'No termino nada de lo que empiezo.' },
      { label: 'Organizar mi día', text: 'Quiero organizar mi día y no lo logro.' },
    ],
    coach: {
      manana: [
        'Buenos días. Tu hábito de hoy en su versión de 2 minutos: ¿a qué hora lo haces?',
        'No se trata de hacerlo perfecto, se trata de no fallar dos veces. ¿Cuál es tu versión mínima de hoy?',
        'Cada vez que lo haces es un voto por quien quieres ser. ¿Qué voto das hoy?',
      ],
      noche: [
        '¿Lo hiciste hoy, aunque fuera la versión mínima? Si no, mañana es otro voto.',
        '¿Qué te ayudó hoy y qué te estorbó? Con eso ajustamos tu hábito.',
        'Prepara tu entorno para mañana: ¿qué dejas listo hoy para que sea más fácil?',
      ],
    },
    guide: `PUERTA CONSTANCIA (la persona entró por la constancia):
- Un solo hábito a la vez, en su versión de 2 minutos con su señal (James Clear). Si quiere más, primero que este sea automático.
- Sin culpa: si falló, «nunca dos veces» y la versión mínima. Celebra cada voto por su identidad.`,
  },
};

export const isDoorId = (v: unknown): v is DoorId => typeof v === 'string' && (DOOR_IDS as readonly string[]).includes(v);

export function doorById(id: string | null | undefined): Door | null {
  return isDoorId(id) ? DOORS[id] : null;
}

/** Perfil mínimo para saber si ve la app enfocada. */
export type DoorProfile = { door?: string | null; extra_doors?: string[] | null; ui_mode?: string | null };

/** La puerta que manda en la app enfocada, o null si está en SOI Full. */
export function activeDoor(p: DoorProfile | null | undefined): Door | null {
  if (!p || p.ui_mode !== 'door') return null;
  return doorById(p.door);
}

/** Su puerta principal y las que sumó, sin repetir (para Tú y el prompt). */
export function doorsOf(p: DoorProfile | null | undefined): Door[] {
  const ids = [p?.door, ...(p?.extra_doors ?? [])].filter(isDoorId);
  return [...new Set(ids)].map((id) => DOORS[id]);
}

/** El mensaje del coach de hoy (rota por día para no repetir). `dayNumber` = días desde una fecha fija. */
export function coachLine(door: Door, part: 'manana' | 'noche', dayNumber: number): string {
  const list = door.coach[part];
  return list[((dayNumber % list.length) + list.length) % list.length] ?? list[0] ?? '';
}

/** Número de día estable para una fecha local YYYY-MM-DD. */
export function dayNumberOf(isoDate: string): number {
  return Math.floor(Date.parse(`${isoDate}T00:00:00Z`) / 86_400_000);
}

/** Hora de la invitación de la noche del coach (local). */
export const COACH_NIGHT_TIME = '21:00';

/** Lo que llega al prompt de todos los agentes cuando la persona entró por una puerta. */
export function doorPrompt(p: DoorProfile | null | undefined): string {
  const doors = doorsOf(p);
  const main = doors[0];
  if (!main) return '';
  const others = doors.slice(1).map((d) => d.label.toLowerCase());
  return [
    main.guide,
    `- Base de esta puerta: ${main.basis}. Su botón de un toque es «${main.sos.label}».`,
    others.length ? `- También eligió trabajar: ${others.join(', ')}. Si el tema es de otra puerta, acompáñalo igual.` : '',
    p?.ui_mode === 'door' ? '- Ve la app enfocada: lo que diseñes queda en «Hoy». No menciones Mi Vida, Mi mapa ni Batallas.' : '',
  ].filter(Boolean).join('\n');
}
