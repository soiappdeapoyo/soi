/**
 * ¿SOI tiene product-market fit? Análisis por reglas (puro y testeado) para /panel/analyticsAI.
 *
 * Marcos (pm-skills de Product Compass y los clásicos de PMF):
 *  - Curva de retención que se aplana (Brian Balfour): si quienes siguen en la semana 2 siguen en el mes 2, hay valor.
 *  - Señal de valor tipo Sean Ellis: aquí, "Me ayudó" al terminar un Moment y el ánimo antes → después.
 *  - Activación (momento ajá = vivir su primer Moment), hábito y stickiness (DAU/MAU) para un producto de hábito.
 *  - North Star: Moments vividos que ayudaron por persona activa a la semana; métricas de entrada = las señales.
 *  - Cuello de botella: se arregla primero el valor y la retención, después la adquisición y el cobro.
 *
 * Referencias de apps de consumo por suscripción (salud y bienestar). Son orientativas, no metas.
 */

import { COMPLAINTS, type ConversationInsights } from '@/lib/admin/conversation-signals';
import type { feedbackForPmf } from '@/lib/admin/feedback';

export type Level = 'fuerte' | 'medio' | 'debil' | 'sin_datos';
export type Stage = 'valor' | 'activacion' | 'retencion' | 'habito' | 'adquisicion' | 'monetizacion' | 'experiencia';

export type Signal = {
  id: string;
  stage: Stage;
  label: string;
  /** Valor legible ("34 %", "+0.6"). */
  value: string;
  level: Level;
  /** Referencia: fuerte desde X, medio desde Y. */
  benchmark: string;
  /** Tamaño de la muestra (denominador). */
  sample: number;
  /** Muestra menor a 30: leerlo con cautela. */
  lowConfidence: boolean;
  /** Qué ajustar en la app y dónde, si no es fuerte. */
  fix: string;
};

export type RateIn = { num: number; den: number };

export type PmfSnapshot = {
  generatedAt: string;
  days: number;
  users: { total: number; trial: number; free: number; plus: number; newInPeriod: number };
  outcomes: {
    signups: number;
    activation: RateIn; wroteFirst: RateIn; d1: RateIn; d7: RateIn; d30: RateIn;
    transformation: { measured: number; improved: RateIn; avgChange: number | null };
    /** WHO-5 estimado (los análisis guardados antes de esto no lo tienen). */
    wellbeing?: { measured: number; improved: RateIn; avgChange: number | null };
  };
  funnel: { visitors: number; landing: number; wanted: number; authStart: number; signup: number; abandonedAfterAuth: number; referrers: { host: string; n: number }[] } | null;
  landingChat: { wrote: number; designed: number; started: number; claimed: number; lived: number; errors: { kind: string; count: number }[] } | null;
  nav: { sessions: number; users: number; pagesPerSession: number; medianSessionMs: number | null; bounceRate: number; frictions: { kind: string; path: string; detail: string }[] } | null;
  moments: { started: number; completed: number; answered: number; helped: number; moodPairs: number; moodDelta: number | null; completers: number; repeatCompleters: number };
  engagement: { mau: number; avgDau: number; activeInPeriod: number; messages: number };
  ai: { tokens: number; crisis: number; providers: [string, number][] };
  /** Lo que no les sirvió en el chat (los análisis guardados antes de esto no lo tienen). */
  conversations?: ConversationInsights;
  /** La burbuja de opinión (los análisis guardados antes de esto no lo tienen). */
  feedback?: ReturnType<typeof feedbackForPmf>;
};

export type PmfAnalysis = { verdict: string; score: number | null; bottleneck: Stage | null; signals: Signal[]; text: string };

const STAGE_LABEL: Record<Stage, string> = {
  valor: 'Valor', activacion: 'Activación', retencion: 'Retención', habito: 'Hábito',
  adquisicion: 'Adquisición', monetizacion: 'Monetización', experiencia: 'Experiencia',
};
/** Orden para elegir el cuello de botella: primero lo que define el PMF (valor y retención). */
const BOTTLENECK_ORDER: Stage[] = ['valor', 'activacion', 'retencion', 'habito', 'adquisicion', 'monetizacion', 'experiencia'];
const WEIGHT: Partial<Record<string, number>> = { d7: 2, d30: 2, flatten: 2, helped: 1.5, activation: 1.5, d1: 1.5 };
const POINTS: Record<Exclude<Level, 'sin_datos'>, number> = { fuerte: 2, medio: 1, debil: 0 };
const MIN_SAMPLE = 10;
const LOW_CONFIDENCE = 30;

const pctOf = (r: RateIn) => (r.den ? (r.num / r.den) * 100 : null);
const fmtPct = (v: number | null) => (v === null ? '—' : `${Math.round(v)} %`);
const levelFor = (v: number | null, good: number, ok: number, sample: number, min = MIN_SAMPLE): Level =>
  v === null || sample < min ? 'sin_datos' : v >= good ? 'fuerte' : v >= ok ? 'medio' : 'debil';

function rateSignal(id: string, stage: Stage, label: string, r: RateIn, good: number, ok: number, fix: string, min = MIN_SAMPLE): Signal {
  const v = pctOf(r);
  return {
    id, stage, label, value: r.den ? `${fmtPct(v)} (${r.num} de ${r.den})` : '—',
    level: levelFor(v, good, ok, r.den, min), benchmark: `fuerte ≥ ${good} %, medio ≥ ${ok} %`,
    sample: r.den, lowConfidence: r.den < LOW_CONFIDENCE, fix,
  };
}

/** Las señales de PMF a partir de la foto de los datos. */
export function pmfSignals(s: PmfSnapshot): Signal[] {
  const o = s.outcomes;
  const m = s.moments;
  const out: Signal[] = [];

  // Valor: ¿lo que SOI propone ayuda de verdad?
  out.push(rateSignal('helped', 'valor', 'Dicen «Me ayudó» al terminar un Moment (proxy de Sean Ellis)', { num: m.helped, den: m.answered }, 75, 60,
    'Diseñar Moments más a la medida: entender antes de proponer (src/lib/ai/proposal-gate.ts), pulido y duración (src/lib/moments/polish.ts), contenido completo de cada bloque (src/lib/moments/enrich.ts).'));
  out.push({
    id: 'mood', stage: 'valor', label: 'Cambio de ánimo promedio antes → después (escala 1–5)',
    value: m.moodDelta === null ? '—' : `${m.moodDelta > 0 ? '+' : ''}${m.moodDelta.toFixed(2)} (${m.moodPairs} Moments)`,
    level: levelFor(m.moodDelta, 0.5, 0.2, m.moodPairs), benchmark: 'fuerte ≥ +0.5, medio ≥ +0.2',
    sample: m.moodPairs, lowConfidence: m.moodPairs < LOW_CONFIDENCE,
    fix: 'Reforzar el arco Llegar → Núcleo → Integrar → Llevarlo a la vida (src/lib/moments/polish.ts) y la regulación primero con ansiedad (src/lib/momentum.ts).',
  });
  out.push(rateSignal('completion', 'valor', 'Moments empezados que se terminan', { num: m.completed, den: m.started }, 70, 50,
    'Moments más cortos o ajustados a su tiempo (polishMoment), retomar donde lo dejó (src/lib/moments/progress.ts) y revisar el reproductor (src/components/moments/moment-player.tsx).'));
  out.push(rateSignal('transformation', 'valor', 'Mejoró 1+ punto en un área de enfoque (mapa de 30+ días)', o.transformation.improved, 50, 30,
    'Llevar más personas al chequeo mensual y a la revisión semanal (src/lib/life-map.ts, /mapa/semana) y conectar su plan de 90 días con Mi día (src/lib/life-plan.ts).', 5));
  if (o.wellbeing) {
    const avg = o.wellbeing.avgChange === null ? '' : ` · promedio ${o.wellbeing.avgChange > 0 ? '+' : ''}${o.wellbeing.avgChange}`;
    const sig = rateSignal('wellbeing', 'valor', `Bienestar (WHO-5 estimado) subió 10+ puntos en 4+ semanas${avg}`, o.wellbeing.improved, 40, 25,
      'Revisar qué Moments y conversaciones preceden a las mejoras y a las caídas (src/lib/wellbeing.ts, src/lib/wellbeing-server.ts) y llevar a quien baja a regular primero (src/lib/momentum.ts).', 5);
    out.push(sig);
  }

  // Valor en el chat: conversaciones donde la persona dijo que no le sirvió, que no la entendió, etc.
  const cv = s.conversations;
  if (cv) {
    const clean = cv.conversations ? ((cv.conversations - cv.withComplaint) / cv.conversations) * 100 : null;
    const top = cv.byCategory[0];
    out.push({
      id: 'chat_ok', stage: 'valor', label: 'Conversaciones sin queja («no me sirve», «no me entiendes», «muy largo»…)',
      value: cv.conversations ? `${fmtPct(clean)} (${cv.withComplaint} de ${cv.conversations} con queja)` : '—',
      level: levelFor(clean, 95, 88, cv.conversations), benchmark: 'fuerte ≥ 95 %, medio ≥ 88 %',
      sample: cv.conversations, lowConfidence: cv.conversations < LOW_CONFIDENCE,
      fix: top ? `La queja más común es «${top.label.toLowerCase()}»: ${COMPLAINTS.find((c) => c.id === top.id)!.fix}` : 'Seguir midiendo.',
    });
    const answered = cv.conversations ? ((cv.conversations - cv.oneMessage) / cv.conversations) * 100 : null;
    out.push({
      id: 'chat_depth', stage: 'activacion', label: 'Conversaciones en las que la persona siguió después de la primera respuesta',
      value: cv.conversations ? `${fmtPct(answered)} (promedio ${cv.avgUserMessages} mensajes suyos)` : '—',
      level: levelFor(answered, 60, 40, cv.conversations), benchmark: 'fuerte ≥ 60 %, medio ≥ 40 %',
      sample: cv.conversations, lowConfidence: cv.conversations < LOW_CONFIDENCE,
      fix: 'La primera respuesta decide si sigue: validar y hacer una sola pregunta (src/lib/ai/proposal-gate.ts modo listen, src/lib/ai/prompts/template.ts).',
    });
  }

  // Lo que dicen en la burbuja de opinión (caritas 3–4 = les gusta o encanta).
  if (s.feedback) {
    const avg = s.feedback.avg === null ? '' : ` · promedio ${s.feedback.avg} / 4`;
    out.push(rateSignal('feedback', 'valor', `Les gusta o encanta SOI (burbuja de opinión)${avg}`, { num: s.feedback.positive, den: s.feedback.rated }, 80, 60,
      'Leer «Lo que cambiarían» en /panel/analytics#opinion (por pantalla y dispositivo) y arreglar lo que más se repite; la burbuja vive en src/components/feedback/feedback-bubble.tsx.', 5));
  }

  // Activación: el momento ajá es vivir su primer Moment.
  out.push(rateSignal('wrote_first', 'activacion', 'Escribió en el chat en sus primeros 7 días', o.wroteFirst, 60, 40,
    'Primer saludo y llegada al chat tras registrarse (/auth/callback → /chat?nueva=1, src/lib/opener.ts).'));
  out.push(rateSignal('activation', 'activacion', 'Vivió su primer Moment en sus primeros 7 días (momento ajá)', o.activation, 40, 25,
    'Acortar el camino al primer Moment: loop principal (src/lib/journey.ts), vía rápida first_offer (src/lib/ai/proposal-gate.ts) y la tarjeta de Hoy (NextStepCard).'));

  // Retención: la curva y si se aplana.
  out.push(rateSignal('d1', 'retencion', 'Volvió al día siguiente (día 1)', o.d1, 35, 20,
    'Traerla el día 2: invitación del día y alarmas (src/lib/reminders.ts), instalar la app + avisos (ReturnSetup) y un saludo que retome lo suyo (src/lib/opener-hooks.ts).'));
  out.push(rateSignal('d7', 'retencion', 'Volvió en su segunda semana (días 7–13)', o.d7, 20, 10,
    'Mi día con hora y alarma, retos de 7 días y la revisión semanal (src/lib/day-plan.ts, /mapa/semana).'));
  out.push(rateSignal('d30', 'retencion', 'Volvió en su segundo mes (días 30–59)', o.d30, 12, 6,
    'Capa de años: capítulos, lo que te funciona y el hábito que se cae (src/lib/what-works.ts detectDrift, src/lib/chapters.ts).'));
  const d7 = pctOf(o.d7), d30 = pctOf(o.d30);
  const flat = d7 && d30 !== null && o.d7.den >= MIN_SAMPLE && o.d30.den >= MIN_SAMPLE ? (d30 / d7) * 100 : null;
  out.push({
    id: 'flatten', stage: 'retencion', label: 'La curva se aplana (mes 2 ÷ semana 2)',
    value: flat === null ? '—' : fmtPct(flat), level: levelFor(flat, 60, 40, Math.min(o.d7.den, o.d30.den)),
    benchmark: 'fuerte ≥ 60 %, medio ≥ 40 %', sample: Math.min(o.d7.den, o.d30.den), lowConfidence: Math.min(o.d7.den, o.d30.den) < LOW_CONFIDENCE,
    fix: 'Quien se queda un mes debe tener una razón para seguir: identidad con evidencia (Mi Nuevo Yo), plan de 90 días y su historia (src/lib/timeline.ts).',
  });

  // Hábito.
  out.push(rateSignal('habit', 'habito', 'De quienes terminaron Moments, cuántos lo hicieron 3+ días distintos', { num: m.repeatCompleters, den: m.completers }, 30, 15,
    'Convertir lo que ayudó en hábito diario: Moment de hábito en Mi día con alarma (src/lib/ai/habit-memory.ts, placeInDay) y racha sin castigo.'));
  const stick = s.engagement.mau ? (s.engagement.avgDau / s.engagement.mau) * 100 : null;
  out.push({
    id: 'stickiness', stage: 'habito', label: 'Stickiness DAU/MAU (últimos 30 días)', value: stick === null ? '—' : `${fmtPct(stick)} (MAU ${s.engagement.mau})`,
    level: levelFor(stick, 20, 10, s.engagement.mau), benchmark: 'fuerte ≥ 20 %, medio ≥ 10 %', sample: s.engagement.mau, lowConfidence: s.engagement.mau < LOW_CONFIDENCE,
    fix: 'Una razón diaria para abrir: Hoy como lista de reproducción y el saludo preparado (src/lib/opener-ai.ts).',
  });

  // Adquisición.
  if (s.funnel) {
    out.push(rateSignal('signup_rate', 'adquisicion', 'Visitantes de la landing que se registran', { num: s.funnel.signup, den: s.funnel.landing }, 5, 2,
      'Héroe y oferta de la landing (src/app/page.tsx, LandingChat, AuthorPicker) y el paso por /login.', 50));
    out.push(rateSignal('auth_finish', 'adquisicion', 'Empezaron con Google o correo y terminaron de entrar', { num: s.funnel.authStart - s.funnel.abandonedAfterAuth, den: s.funnel.authStart }, 85, 70,
      'Fricción del enlace mágico y de Google (/login, /auth/callback) y el consentimiento (/consentimiento).'));
  }
  if (s.landingChat) {
    out.push(rateSignal('landing_chat', 'adquisicion', 'Chat de la landing: les diseñó su Moment y lo guardaron', { num: s.landingChat.claimed, den: s.landingChat.designed }, 30, 15,
      'Del borrador a la cuenta: /api/landing-chat, src/lib/moments/drafts.ts (claimDraft) y el botón Comenzar.'));
  }

  // Monetización.
  const paidBase = s.users.plus + s.users.free;
  out.push(rateSignal('paid', 'monetizacion', 'Pagan SOI+ (de quienes ya salieron de la prueba)', { num: s.users.plus, den: paidBase }, 5, 2,
    'Momento y forma del paywall: /planes, <LockedFeature>, src/lib/billing/access-rules.ts y los días de prueba en /panel/ajustes.'));

  // Experiencia.
  if (s.nav && s.nav.sessions >= MIN_SAMPLE) {
    const f = s.nav.frictions.length;
    out.push({
      id: 'frictions', stage: 'experiencia', label: 'Fricciones de navegación detectadas', value: String(f),
      level: f <= 2 ? 'fuerte' : f <= 5 ? 'medio' : 'debil', benchmark: 'fuerte ≤ 2, medio ≤ 5',
      sample: s.nav.sessions, lowConfidence: s.nav.sessions < LOW_CONFIDENCE,
      fix: `Revisar: ${s.nav.frictions.slice(0, 3).map((x) => x.path).join(', ') || '—'} (ver /panel/analytics).`,
    });
  }
  return out;
}

/** Veredicto, puntaje, cuello de botella y el texto para copiar. */
export function analyzePmf(s: PmfSnapshot): PmfAnalysis {
  const signals = pmfSignals(s);
  const scored = signals.filter((x) => x.level !== 'sin_datos');
  let got = 0, max = 0;
  for (const x of scored) {
    const w = WEIGHT[x.id] ?? 1;
    got += w * POINTS[x.level as Exclude<Level, 'sin_datos'>];
    max += w * 2;
  }
  const score = max ? Math.round((got / max) * 100) : null;
  const retentionKnown = signals.some((x) => x.stage === 'retencion' && x.level !== 'sin_datos');
  const verdict = scored.length < 4 || score === null
    ? 'Datos insuficientes'
    : `${score >= 70 ? 'Señales fuertes de PMF' : score >= 45 ? 'En camino (PMF parcial)' : 'Pre-PMF'}${retentionKnown ? '' : ' (provisional)'}`;
  const bottleneck = BOTTLENECK_ORDER.find((st) => signals.some((x) => x.stage === st && x.level === 'debil'))
    ?? BOTTLENECK_ORDER.find((st) => signals.some((x) => x.stage === st && x.level === 'medio')) ?? null;
  return { verdict, score, bottleneck, signals, text: renderText(s, { verdict, score, bottleneck, signals }) };
}

const MARK: Record<Level, string> = { fuerte: '🟢 fuerte', medio: '🟡 medio', debil: '🔴 débil', sin_datos: '⚪ sin datos' };

function renderText(s: PmfSnapshot, a: Omit<PmfAnalysis, 'text'>): string {
  const date = new Intl.DateTimeFormat('es-MX', { dateStyle: 'long', timeStyle: 'short', timeZone: 'America/Mexico_City' }).format(new Date(s.generatedAt));
  const L: string[] = [];
  L.push(`# Análisis de product-market fit de SOI (por reglas)`);
  L.push(`Fecha: ${date} · Periodo: últimos ${s.days} días · Retención y activación: cohortes de 120 días. Sin cuentas demo; solo cifras agregadas.`);
  L.push('');
  L.push(`## Veredicto: ${a.verdict}${a.score === null ? '' : ` · ${a.score}/100`}`);
  if (a.bottleneck) {
    const weak = a.signals.filter((x) => x.stage === a.bottleneck && (x.level === 'debil' || x.level === 'medio'));
    L.push(`Cuello de botella: **${STAGE_LABEL[a.bottleneck]}** (${weak.map((x) => x.label.toLowerCase()).join('; ')}).`);
    L.push('Regla: primero valor y retención; crecer o cobrar antes de eso solo llena un balde con agujeros.');
  } else if (a.verdict !== 'Datos insuficientes') L.push('Sin cuello de botella claro: todas las señales con datos son fuertes.');
  const few = a.signals.filter((x) => x.level !== 'sin_datos' && x.lowConfidence).length;
  if (few) L.push(`Cautela: ${few} señal(es) con muestra menor a ${LOW_CONFIDENCE}.`);
  L.push('');

  for (const st of BOTTLENECK_ORDER) {
    const rows = a.signals.filter((x) => x.stage === st);
    if (!rows.length) continue;
    L.push(`## ${STAGE_LABEL[st]}`);
    for (const x of rows) L.push(`- ${MARK[x.level]} · ${x.label}: ${x.value} · referencia: ${x.benchmark}${x.lowConfidence && x.level !== 'sin_datos' ? ' · muestra pequeña' : ''}`);
    L.push('');
  }

  L.push('## Contexto');
  L.push(`- Cuentas: ${s.users.total} (prueba ${s.users.trial}, Free ${s.users.free}, SOI+ ${s.users.plus}); nuevas en el periodo: ${s.users.newInPeriod}.`);
  L.push(`- Actividad: ${s.engagement.activeInPeriod} personas activas en el periodo, ${s.engagement.messages} mensajes suyos en el chat; MAU ${s.engagement.mau}, DAU promedio ${s.engagement.avgDau.toFixed(1)}.`);
  L.push(`- Moments: ${s.moments.started} empezados, ${s.moments.completed} terminados por ${s.moments.completers} personas.`);
  const nsm = s.engagement.activeInPeriod ? (s.moments.helped / s.engagement.activeInPeriod) / (s.days / 7) : null;
  L.push(`- North Star propuesta (Moments que ayudaron por persona activa a la semana): ${nsm === null ? '—' : nsm.toFixed(2)}.`);
  if (s.funnel) L.push(`- Landing: ${s.funnel.landing} visitantes → ${s.funnel.wanted} quisieron entrar → ${s.funnel.authStart} empezaron → ${s.funnel.signup} se registraron. Fuentes: ${s.funnel.referrers.slice(0, 5).map((r) => `${r.host} (${r.n})`).join(', ') || '—'}.`);
  if (s.landingChat) L.push(`- Chat de la landing: ${s.landingChat.wrote} escribieron → ${s.landingChat.designed} Moments diseñados → ${s.landingChat.started} Comenzar → ${s.landingChat.claimed} guardados → ${s.landingChat.lived} vividos.${s.landingChat.errors.length ? ` Errores: ${s.landingChat.errors.map((e) => `${e.kind} ${e.count}`).join(', ')}.` : ''}`);
  if (s.nav) L.push(`- Navegación: ${s.nav.sessions} sesiones, ${s.nav.pagesPerSession.toFixed(1)} pantallas por sesión, rebote ${Math.round(s.nav.bounceRate * 100)} %.${s.nav.frictions.length ? ` Fricciones: ${s.nav.frictions.slice(0, 5).map((f) => `${f.path} (${f.detail})`).join('; ')}.` : ''}`);
  L.push(`- IA: ${s.ai.tokens} tokens en el periodo; señales de crisis: ${s.ai.crisis}.`);
  L.push('');
  if (s.conversations) L.push(...conversationSection(s.conversations));
  if (s.feedback?.count) L.push(...feedbackSection(s.feedback));

  const todo = a.signals.filter((x) => x.level === 'debil' || x.level === 'medio')
    .sort((x, y) => BOTTLENECK_ORDER.indexOf(x.stage) - BOTTLENECK_ORDER.indexOf(y.stage) || (x.level === 'debil' ? -1 : 1) - (y.level === 'debil' ? -1 : 1));
  L.push('## Qué ajustar en la app (por prioridad)');
  if (todo.length) todo.forEach((x, i) => L.push(`${i + 1}. [${STAGE_LABEL[x.stage]} · ${x.level === 'debil' ? 'débil' : 'medio'}] ${x.label}: ${x.fix}`));
  else L.push('- Nada urgente con los datos de este periodo. Seguir midiendo.');
  const missing = a.signals.filter((x) => x.level === 'sin_datos');
  if (missing.length) {
    L.push('');
    L.push(`Sin datos suficientes (menos de ${MIN_SAMPLE} casos): ${missing.map((x) => x.label.toLowerCase()).join('; ')}.`);
  }
  return L.join('\n');
}

/** Lo que no les sirvió en el chat: categorías, agentes, si se fueron y ejemplos (sin identificar a nadie). */
function conversationSection(c: ConversationInsights): string[] {
  const L: string[] = ['## Conversaciones: lo que no les sirvió'];
  if (!c.conversations) return [...L, '- Sin conversaciones en el periodo.', ''];
  L.push(`- ${c.conversations} conversaciones analizadas (${c.crisisExcluded} con señales de crisis quedaron fuera); ${c.withComplaint} con al menos una queja (${c.complaints} quejas en total); en ${c.leftAfter} la persona se fue justo después de quejarse.`);
  L.push(`- ${c.oneMessage} conversaciones con un solo mensaje de la persona; promedio ${c.avgUserMessages} mensajes suyos por conversación.`);
  if (c.byCategory.length) L.push(`- Quejas por tipo: ${c.byCategory.map((x) => `${x.label} (${x.count})`).join('; ')}.`);
  const agents = c.byAgent.filter((a) => a.withComplaint);
  if (agents.length) L.push(`- Por agente (con queja / total): ${agents.map((a) => `${a.agent} ${a.withComplaint}/${a.conversations}`).join(', ')}.`);
  if (c.byProvider.length) L.push(`- Proveedor de la respuesta anterior a la queja: ${c.byProvider.map((p) => `${p.provider} (${p.complaints})`).join(', ')}.`);
  if (c.byCategory.length) {
    L.push('- Qué ajustar por tipo de queja:');
    for (const x of c.byCategory) L.push(`  - ${x.label}: ${COMPLAINTS.find((k) => k.id === x.id)!.fix}`);
  }
  if (c.examples.length) {
    L.push('', '### Ejemplos (recortados, sin datos de contacto)');
    c.examples.forEach((e, i) => {
      const label = COMPLAINTS.find((k) => k.id === e.category)!.label;
      L.push(`${i + 1}. [${label} · agente ${e.agent ?? '—'}${e.provider ? ` · ${e.provider}` : ''} · mensaje ${e.position}${e.leftAfter ? ' · se fue después' : ''}]`);
      if (e.before) L.push(`   SOI antes${e.tools.length ? ` (usó ${e.tools.join(', ')})` : ''}: «${e.before}»`);
      L.push(`   La persona: «${e.said}»`);
    });
  }
  L.push('');
  return L;
}

/** Lo que dicen en la burbuja de opinión: cifras y lo que cambiarían (recortado, sin datos de contacto). */
function feedbackSection(f: NonNullable<PmfSnapshot['feedback']>): string[] {
  const L: string[] = ['## Lo que dicen (burbuja de opinión)'];
  L.push(`- ${f.count} opiniones de ${f.people} personas; ${f.rated} con carita, promedio ${f.avg ?? '—'} / 4; les gusta o encanta: ${f.positive} de ${f.rated}.`);
  if (f.quotes.length) {
    L.push('- Lo que cambiarían (más recientes):');
    for (const q of f.quotes) L.push(`  - «${q.said}» (${q.path ?? 'sin pantalla'} · ${q.device ?? '—'}${q.rating ? ` · carita ${q.rating}/4` : ''})`);
  }
  if (f.liked.length) L.push(`- Lo que les gusta: ${f.liked.map((x) => `«${x}»`).join('; ')}.`);
  L.push('');
  return L;
}

/** Huella del análisis (sin la fecha): si los datos no cambiaron, no se guarda otra vez. */
export function pmfFingerprint(a: Pick<PmfAnalysis, 'verdict' | 'score' | 'signals'>, days: number): string {
  const raw = JSON.stringify([days, a.verdict, a.score, a.signals.map((x) => [x.id, x.value, x.level])]);
  let h1 = 0x811c9dc5, h2 = 0x01000193;
  for (let i = 0; i < raw.length; i++) {
    const c = raw.charCodeAt(i);
    h1 = Math.imul(h1 ^ c, 16777619) >>> 0;
    h2 = Math.imul(h2 ^ c, 2246822519) >>> 0;
  }
  return `${h1.toString(16).padStart(8, '0')}${h2.toString(16).padStart(8, '0')}`;
}

export { STAGE_LABEL };
