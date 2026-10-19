import { describe, it, expect } from 'vitest';
import { LIFE_AREAS } from '@/config/life-areas';
import { CAPACITIES } from '@/config/capacities';
import { AGENTS } from '@/config/agents';
import { AssessmentBody, areaLine, buildMapView, mergeAreaGoals, suggestFocus, type Assessment, type LifeMap } from '@/lib/life-map';
import { buildKnown, parseUnderstanding } from '@/lib/self-knowledge';
import { firstStepsProgress, nextStep, type JourneyState } from '@/lib/journey';
import { nudgeFor } from '@/lib/reminders';

const DAY = 86_400_000;
const NOW = Date.parse('2026-10-17T12:00:00Z');
const at = (daysAgo: number) => new Date(NOW - daysAgo * DAY).toISOString();
const all = (n: number) => Object.fromEntries(LIFE_AREAS.map((a) => [a.id, n]));

describe('áreas de vida', () => {
  it('seis áreas, con capacidades reales y un agente que existe', () => {
    expect(LIFE_AREAS).toHaveLength(7);
    for (const a of LIFE_AREAS) {
      expect(a.capacities.every((c) => (CAPACITIES as readonly string[]).includes(c)), a.id).toBe(true);
      expect(a.agent in AGENTS, a.id).toBe(true);
    }
  });
});

describe('diagnóstico', () => {
  it('inicial y mensual piden las seis áreas; la semanal, al menos una', () => {
    expect(AssessmentBody.safeParse({ kind: 'inicial', scores: all(5) }).success).toBe(true);
    expect(AssessmentBody.safeParse({ kind: 'inicial', scores: { salud: 5 } }).success).toBe(false);
    expect(AssessmentBody.safeParse({ kind: 'semanal', scores: { salud: 5 } }).success).toBe(true);
    expect(AssessmentBody.safeParse({ kind: 'semanal', scores: {} }).success).toBe(false);
    expect(AssessmentBody.safeParse({ kind: 'inicial', scores: { ...all(5), salud: 11 } }).success).toBe(false);
    expect(AssessmentBody.safeParse({ kind: 'inicial', scores: all(5), focus: ['salud', 'dinero', 'trabajo'] }).success).toBe(false);
  });

  it('sugiere como enfoque las áreas más bajas (a igualdad, en orden)', () => {
    expect(suggestFocus({ salud: 6, emociones: 3, relaciones: 7, trabajo: 3, dinero: 2, proposito: 8 })).toEqual(['dinero', 'emociones']);
    expect(suggestFocus({})).toEqual([]);
  });

  it('las metas nuevas se suman a las anteriores; texto vacío borra la descripción', () => {
    const prev = { salud: { target: 7, want: 'Dormir bien' }, dinero: { target: 6 } };
    expect(mergeAreaGoals(prev, { salud: 8 }, { salud: '', proposito: 'Saber a dónde voy' })).toEqual({
      salud: { target: 8 }, dinero: { target: 6 }, proposito: { want: 'Saber a dónde voy' },
    });
  });
});

describe('la distancia', () => {
  const map: LifeMap = { vision: ' Alguien que cuida su cuerpo ', focus_areas: ['salud', 'dinero'], areas: { salud: { target: 8, want: 'Energía' }, dinero: { target: 6 } }, created_at: at(40), updated_at: at(40) };
  const assessments: Assessment[] = [
    { id: 'b', kind: 'mensual', scores: { ...all(5), salud: 6 }, created_at: at(5) },
    { id: 'a', kind: 'inicial', scores: { ...all(5), salud: 4, dinero: 3 }, created_at: at(40) },
    { id: 'c', kind: 'semanal', scores: { salud: 7 }, created_at: at(1) },
  ];

  it('punto de partida, hoy, meta, cambio, lo que falta y cuánto se cerró', () => {
    const v = buildMapView(map, assessments, [], NOW);
    expect(v.hasMap).toBe(true);
    expect(v.vision).toBe('Alguien que cuida su cuerpo');
    const salud = v.areas.find((a) => a.area.id === 'salud')!;
    expect(salud).toMatchObject({ baseline: 4, current: 7, previous: 6, target: 8, change: 3, gap: 1, focus: true, want: 'Energía' });
    expect(salud.closed).toBeCloseTo(0.75);
    const dinero = v.areas.find((a) => a.area.id === 'dinero')!;
    expect(dinero).toMatchObject({ baseline: 3, current: 5, gap: 1, change: 2 });
    expect(v.focus.map((a) => a.area.id)).toEqual(['salud', 'dinero']);
  });

  it('el chequeo mensual toca a los 30 días de la última medición completa (la semanal no cuenta)', () => {
    expect(buildMapView(map, assessments, [], NOW)).toMatchObject({ checkinDue: false, checkinInDays: 25 });
    expect(buildMapView(map, [assessments[1]!], [], NOW)).toMatchObject({ checkinDue: true, checkinInDays: 0 });
    expect(buildMapView(null, [], [], NOW)).toMatchObject({ hasMap: false, checkinDue: false, checkinInDays: null });
  });

  it('la evidencia de Mi Nuevo Yo cuenta para el área por sus capacidades', () => {
    const evidence = [
      { at: at(2), capacities: ['Salud'], weight: 1 },
      { at: at(10), capacities: ['Constancia', 'Calma'], weight: 2 },
      { at: at(45), capacities: ['Salud'], weight: 1 },
      { at: at(3), capacities: ['Mentalidad de riqueza'], weight: 1 },
    ];
    const v = buildMapView(map, assessments, evidence, NOW);
    expect(v.areas.find((a) => a.area.id === 'salud')).toMatchObject({ evidence7: 1, evidence30: 3 });
    expect(v.areas.find((a) => a.area.id === 'emociones')).toMatchObject({ evidence7: 0, evidence30: 2 });
    expect(v.areas.find((a) => a.area.id === 'dinero')).toMatchObject({ evidence7: 1, evidence30: 1 });
  });

  it('la línea de avance se lee natural y sin culpa', () => {
    const v = buildMapView(map, assessments, [], NOW);
    expect(areaLine(v.areas.find((a) => a.area.id === 'salud')!)).toBe('Subiste 3 desde el inicio · te falta 1 para tu meta');
    expect(areaLine({ ...v.areas[0]!, current: 8, target: 8, gap: 0 })).toMatch(/Llegaste a tu meta/);
    expect(areaLine({ ...v.areas[0]!, change: -1, gap: null, target: null })).toBe('Bajó un poco: pasa, y se puede retomar');
    expect(areaLine({ ...v.areas[0]!, current: null })).toBe('Sin medir todavía');
  });
});

describe('lo que SOI sabe de ti', () => {
  it('lee lo que entendió de una conversación', () => {
    expect(parseUnderstanding('Situación: Me cuesta levantarme\nSiente: cansancio\nQuiere: tener energía')).toEqual({ 'situación': 'Me cuesta levantarme', siente: 'cansancio', quiere: 'tener energía' });
  });

  it('reúne todo en cuatro grupos y cada dato dice cómo se borra', () => {
    const items = buildKnown({
      profile: { goals: ['Correr 10 km', ' '], blockers: ['El celular'], dominant_emotion: 'ansiedad' },
      purpose: { id: '00000000-0000-4000-8000-000000000001', aim: 'Lanzar mi estudio' },
      understandings: [{ id: '00000000-0000-4000-8000-000000000002', content: 'Situación: No duermo bien\nQuiere: descansar', created_at: at(1) }],
      habits: [{ name: 'Leer', mode: 'build', status: 'active', cue: 'Después de cenar' }, { name: 'Agua', mode: 'build', status: 'automatic' }],
      identities: [{ id: 'i1', name: 'Alguien que se cuida' }],
      enemy: { id: 'procrastinacion', name: 'La Procrastinación' },
    });
    const by = (g: string) => items.filter((i) => i.group === g).map((i) => i.text);
    expect(by('mueve')).toEqual(['Lanzar mi estudio', 'Correr 10 km']);
    expect(by('frena')).toEqual(['El celular', 'La Procrastinación']);
    expect(by('siente')).toEqual(['ansiedad', 'No duermo bien. Quieres: descansar']);
    expect(by('construye')).toEqual(['Alguien que se cuida', 'Leer · Después de cenar']);
    expect(items.find((i) => i.text === 'Correr 10 km')?.forget).toEqual({ kind: 'goal', value: 'Correr 10 km' });
    const enemy = items.find((i) => i.text === 'La Procrastinación')!;
    expect(enemy.forget).toBeUndefined();
    expect(enemy.href).toBe('/mi-vida/batallas/procrastinacion');
  });
});

describe('el mapa en el loop principal', () => {
  const base: JourneyState = { userMessages: 5, completedRuns: 2, firstCompleted: { runId: 'r1', completedAt: at(20) }, followedUp: true, proposal: null, unfinished: null, canRun: true };
  it('después del primer Moment y su seguimiento, toca dibujar el mapa', () => {
    expect(nextStep({ ...base, hasMap: false }, NOW)).toMatchObject({ kind: 'map', href: '/mapa/diagnostico' });
    expect(nextStep({ ...base, hasMap: true }, NOW).kind).toBe('routine');
    // Sin el dato, nunca se insiste.
    expect(nextStep(base, NOW).kind).toBe('routine');
  });
  it('antes va el primer Moment (el mapa no frena la activación) y no entra en la lista de primeros pasos', () => {
    expect(nextStep({ ...base, completedRuns: 0, firstCompleted: null, hasMap: false }, NOW).kind).not.toBe('map');
    expect(firstStepsProgress({ ...base, hasMap: false }, NOW)).toBeNull();
  });
  it('el aviso del día invita al mapa solo si no tiene Moments pendientes hoy', () => {
    const step = nextStep({ ...base, hasMap: false }, NOW);
    expect(nudgeFor(step, { streak: 3, pendingToday: 0 }).title).toBe('Dibuja tu mapa');
    expect(nudgeFor(step, { streak: 3, pendingToday: 2 }).title).toBe('Tu día está listo');
  });
});
