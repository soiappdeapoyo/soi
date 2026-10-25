import { describe, it, expect } from 'vitest';
import { buildSpec, checkDescription, CONSENT_BOUNDARY, dayPlanFor, diffSpecs, normalizeDescribed, seeded, voiceFor, type Described } from '@/lib/persons/spec';
import { lastSeenAt, presenceAt, presenceLabel } from '@/lib/persons/presence';
import { applyEvents, decay, detectEvents, initialEmotion, labelFor, parseEmotion, type EmotionEvent } from '@/lib/persons/emotion';
import { planDelivery, typingSeconds } from '@/lib/persons/scheduler';
import { checkTurn } from '@/lib/persons/moderation';
import { canCreatePersona, canGenerate, personsLimits } from '@/lib/persons/entitlements';
import { blindSpots, emotionTimeline, ruleReport, type DebriefMessage } from '@/lib/persons/debrief';
import { PERSONA_PRESETS } from '@/config/persons-presets';

const TZ = 'America/Mexico_City';
/** Un instante a la hora local dada en CDMX (UTC−6, sin horario de verano desde 2022). Martes 13 de octubre de 2026. */
const at = (hh: number, mm = 0, day = 13) => new Date(Date.UTC(2026, 9, day, hh + 6, mm));

const lucia: Described = PERSONA_PRESETS[0]!.described;

describe('ficha (PersonSpec)', () => {
  it('bloquea personas reales, menores y lo sexual en la descripción', () => {
    expect(checkDescription('Quiero practicar con mi ex, que es diseñadora')).toBe('real_person');
    expect(checkDescription('Una cantante como Shakira')).toBe('real_person');
    expect(checkDescription('Chica de 16 años que estudia')).toBe('minor');
    expect(checkDescription('Una mujer sumisa y obediente')).toBe('sexual');
    expect(checkDescription('Una modelo desnuda')).toBe('sexual');
  });

  it('no bloquea descripciones normales', () => {
    expect(checkDescription('Mujer de 29, diseñadora con 15 años de experiencia, le gusta el café caliente y correr')).toBeNull();
    expect(checkDescription('Maestro de primaria que trabaja con niños, tranquilo y curioso')).toBeNull();
  });

  it('normaliza: edad adulta, límite de consentimiento, sin duplicados ni celebridades', () => {
    expect(normalizeDescribed({ ...lucia, age: 17 })).toBeNull();
    const n = normalizeDescribed({ ...lucia, name: 'Shakira 2', boundaries: ['No le gusta la impuntualidad'], traits: ['curiosa', 'Curiosa', 'directa'] })!;
    expect(n.name).not.toMatch(/shakira|\d/i);
    expect(n.boundaries).toContain(CONSENT_BOUNDARY);
    expect(n.traits).toEqual(['curiosa', 'directa']);
  });

  it('deriva voz y agenda de forma estable', () => {
    expect(voiceFor('femenino', 'x')).toBe(voiceFor('femenino', 'x'));
    expect(['Enceladus', 'Algieba', 'Achird']).toContain(voiceFor('masculino', 'abc'));
    for (const a of ['profesional', 'estudiante', 'freelance', 'turnos'] as const) {
      const plan = dayPlanFor(a, ['correr']);
      // Todo el día cubierto, sin huecos.
      for (const slots of [plan.weekday, plan.weekend]) {
        expect(slots[0]!.from).toBe(0);
        expect(slots[slots.length - 1]!.to).toBe(1440);
        slots.slice(1).forEach((s, i) => expect(s.from).toBe(slots[i]!.to));
      }
    }
    expect(dayPlanFor('profesional', ['correr']).weekday.some((s) => s.activity === 'corriendo')).toBe(true);
  });

  it('ajustar: lo estructural archiva; rasgos reinician apertura; límites, confianza', () => {
    expect(diffSpecs(lucia, { ...lucia, profession: 'Abogada' }).structural).toBe(true);
    expect(diffSpecs(lucia, { ...lucia, traits: ['tímida', 'amable'] })).toMatchObject({ structural: false, reset: 'openness' });
    expect(diffSpecs(lucia, { ...lucia, boundaries: ['Otra cosa'] }).reset).toBe('trust');
    expect(diffSpecs(lucia, { ...lucia, interests: ['fotografía', 'café'] })).toMatchObject({ structural: false, reset: 'none' });
    expect(diffSpecs(lucia, lucia).changes).toHaveLength(0);
  });
});

describe('presencia', () => {
  const plan = dayPlanFor('profesional', ['correr']);
  it('nunca en línea de madrugada; en línea en la noche', () => {
    expect(presenceAt(plan, at(3), TZ).state).toBe('asleep');
    expect(presenceAt(plan, at(21), TZ).state).toBe('online');
    expect(presenceAt(plan, at(10), TZ)).toMatchObject({ state: 'busy', activity: 'en el trabajo' });
  });
  it('dormir cruza la medianoche como una sola franja', () => {
    const p = presenceAt(plan, at(23, 45), TZ);
    expect(p.state).toBe('asleep');
    expect((p.endsAt.getTime() - at(23, 45).getTime()) / 60_000).toBeCloseTo(7 * 60 + 15, 0);
  });
  it('encabezado: en línea o última vez', () => {
    const now = at(10);
    expect(presenceLabel(presenceAt(plan, at(21), TZ), now, at(21), TZ)).toBe('en línea');
    const seen = lastSeenAt(plan, now, TZ, null);
    expect(presenceLabel(presenceAt(plan, now, TZ), seen, now, TZ)).toMatch(/^últ\. vez hoy a las 08:00$/);
  });
});

describe('emoción (función pura)', () => {
  const t = buildSpec(lucia, '', 'x').derived.temperament;
  it('preguntar por lo suyo sube; hablar solo de sí baja la apertura', () => {
    const base = initialEmotion(t);
    const up = applyEvents(base, detectEvents('¿Y tú corres en las mañanas o en la tarde?', { interests: lucia.interests, boundary: false, previousBoundary: false, hoursSinceLast: 0, trust: 0.2 }), t, at(20));
    expect(up.openness).toBeGreaterThan(base.openness);
    const ev = detectEvents('Yo trabajo en ventas y mi jefe me dice que yo soy el mejor de mi equipo siempre', { interests: [], boundary: false, previousBoundary: false, hoursSinceLast: 0, trust: 0.2 });
    expect(ev).toContain('self_centered');
    expect(applyEvents(base, ev, t, at(20)).openness).toBeLessThan(base.openness);
  });
  it('cambios acotados salvo cruzar un límite; la confianza no se recupera del todo', () => {
    const base = { ...initialEmotion(t), trust: 0.6 };
    const many = applyEvents(base, ['asked_about_her', 'humor', 'shared_self'], t, at(20));
    expect(many.openness - base.openness).toBeLessThanOrEqual(0.2 + 1e-9);
    const hurt = applyEvents(base, ['boundary_crossed'], t, at(20));
    expect(hurt.trust).toBeLessThan(base.trust - 0.2);
    expect(hurt.trustCeiling).toBeLessThan(1);
    expect(labelFor(hurt, at(21))).toBe('annoyed');
    const later = decay(hurt, 24 * 30, t, t.energy);
    expect(later.trust).toBeLessThanOrEqual(hurt.trustCeiling);
    expect(labelFor(later, at(21, 0, 14))).not.toBe('annoyed');
  });
  it('insistir después de un no marca riesgo', () => {
    const e = detectEvents('ándale, no seas así', { interests: [], boundary: true, previousBoundary: true, hoursSinceLast: 0, trust: 0.3 });
    expect(e).toEqual(['insisted_after_no']);
    expect(applyEvents(initialEmotion(t), e, t, at(20)).risk).toBe(true);
  });
  it('lee estados guardados incompletos', () => {
    expect(parseEmotion(null, t).openness).toBe(0.5);
    expect(parseEmotion({ trust: 5 }, t).trust).toBe(1);
  });
});

describe('agenda de respuesta', () => {
  const spec = buildSpec(lucia, '', 'x');
  const base = { emotion: initialEmotion(spec.derived.temperament), profile: 'professional' as const, boundary: false, voiceAllowed: false };
  const plan = spec.derived.dayPlan;
  it('en línea contesta en segundos; ocupada, al salir; dormida, al despertar', () => {
    const now = at(21);
    const online = planDelivery({ ...base, now, presence: presenceAt(plan, now, TZ), userText: 'hola', replies: ['hola!'], rand: seeded(1) });
    const s = (online.items[0]!.deliverAt.getTime() - now.getTime()) / 1000;
    expect(s).toBeGreaterThanOrEqual(8);
    expect(s).toBeLessThanOrEqual(60);

    const work = at(10);
    const busy = planDelivery({ ...base, now: work, presence: presenceAt(plan, work, TZ), userText: 'qué tal tu día', replies: ['bien'], rand: () => 0.9 });
    const m = (busy.items[0]!.deliverAt.getTime() - work.getTime()) / 60_000;
    expect(m).toBeGreaterThanOrEqual(3);
    expect(m).toBeLessThanOrEqual(240);

    const night = at(3);
    const asleep = planDelivery({ ...base, now: night, presence: presenceAt(plan, night, TZ), userText: 'hola', replies: ['buen día'], rand: seeded(2) });
    expect(asleep.items[0]!.deliverAt.getTime()).toBeGreaterThanOrEqual(at(7).getTime());
  });
  it('ocupada con algo importante: aviso cálido primero y la respuesta después', () => {
    const now = at(10);
    const r = planDelivery({ ...base, now, presence: presenceAt(plan, now, TZ), userText: 'Hoy me siento un poco triste, la verdad es que me pasó algo en el trabajo y quería contártelo porque confío en ti y me hace bien hablarlo contigo', replies: ['ay, qué pasó?'], vulnerable: true, rand: () => 0.5 });
    expect(r.items[0]!.meta?.ack).toBe(true);
    expect(r.items[1]!.deliverAt.getTime()).toBeGreaterThan(r.items[0]!.deliverAt.getTime());
    expect(r.readAt.getTime()).toBeLessThan(r.items[0]!.deliverAt.getTime());
  });
  it('un límite nunca va como nota de voz; las burbujas llegan en orden', () => {
    const run = at(18, 45); // corriendo
    const r = planDelivery({ ...base, voiceAllowed: true, boundary: true, now: run, presence: presenceAt(plan, run, TZ), userText: 'x', replies: ['no me escribas eso.', 'en serio'], rand: () => 0.1 });
    expect(r.items.every((i) => i.kind === 'text')).toBe(true);
    expect(r.items[1]!.deliverAt.getTime()).toBeGreaterThan(r.items[0]!.deliverAt.getTime());
    expect(typingSeconds('hola')).toBeGreaterThanOrEqual(2);
  });
});

describe('moderación del turno', () => {
  it('bloquea lo grave, marca límites y deja pasar lo normal', () => {
    expect(checkTurn('mándame nudes').level).toBe('block');
    expect(checkTurn('te voy a buscar, sé dónde vives').level).toBe('block');
    expect(checkTurn('estás bien sexy').level).toBe('boundary');
    expect(checkTurn('¿por qué no me contestas?').level).toBe('boundary');
    expect(checkTurn('qué rico se ve ese café, ¿dónde es?').level).toBe('ok');
    expect(checkTurn('hoy hice calentamiento antes de correr').level).toBe('ok');
    expect(checkTurn('estoy en la cama viendo series').level).toBe('ok');
  });
});

describe('cupos por plan', () => {
  it('Free: 2 personas, sin voz; prueba y SOI+: más', () => {
    const free = personsLimits('free');
    expect(free.voice).toBe(false);
    expect(canCreatePersona(free, 2).ok).toBe(false);
    expect(canCreatePersona(personsLimits('trial'), 2).ok).toBe(true);
    expect(canGenerate(free, 3).ok).toBe(false);
    expect(personsLimits('soi_plus').blindMode).toBe(true);
  });
});

describe('debrief', () => {
  const snap = (openness: number, events: EmotionEvent[]) => ({ valence: 0.1, energy: 0.5, openness, trust: 0.3, label: 'neutral' as const, events });
  const msgs: DebriefMessage[] = [
    { role: 'user', content: 'hola', emotion: snap(0.6, ['generic']) },
    { role: 'persona', content: 'hola, qué tal' },
    { role: 'user', content: 'yo hoy fui al gym y mi entrenador me dijo que yo soy el que más levanta', emotion: snap(0.4, ['self_centered']) },
    { role: 'persona', content: 'ah, ok' },
    { role: 'user', content: 'y mañana voy otra vez, me encanta el gym, yo siempre voy', emotion: snap(0.35, ['self_centered']) },
  ];
  it('línea de emociones con causa y puntos ciegos', () => {
    const tl = emotionTimeline(msgs);
    expect(tl).toHaveLength(3);
    expect(tl[1]).toMatchObject({ trend: 'down', cause: 'hablaste solo de ti' });
    const bs = blindSpots(msgs);
    expect(bs).toHaveLength(1);
    expect(bs[0]!.persona).toBe('ah, ok');
  });
  it('respaldo por reglas', () => {
    const r = ruleReport(msgs);
    expect(r.scores.reciprocidad).toBeLessThan(3);
    expect(r.improvements.length).toBeGreaterThan(0);
  });
});
