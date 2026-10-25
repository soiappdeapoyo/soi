import { describe, it, expect } from 'vitest';
import { buildSpec, seeded, type Described } from '@/lib/persons/spec';
import { presenceAt } from '@/lib/persons/presence';
import { initialEmotion } from '@/lib/persons/emotion';
import { paceFor, planDelivery, START_TURNS } from '@/lib/persons/scheduler';
import { humanize, humanizeItems, quirksFor, typo, type Quirks } from '@/lib/persons/humanize';
import { newUserTurns, ruleTip, tipDue, TIP_EVERY, type PracticeLine } from '@/lib/persons/coach';
import { PERSONA_PRESETS } from '@/config/persons-presets';

const TZ = 'America/Mexico_City';
const at = (hh: number, mm = 0) => new Date(Date.UTC(2026, 9, 13, hh + 6, mm));
const lucia: Described = PERSONA_PRESETS[0]!.described;
const ALL: Quirks = { lowercase: 1, accents: 1, marks: 1, period: 1, abbrev: 1, typos: 0 };
const NONE: Quirks = { lowercase: 0, accents: 0, marks: 0, period: 0, abbrev: 0, typos: 0 };

describe('escritura a mano', () => {
  it('minúsculas, sin ¿¡, sin punto final, sin acentos y con abreviaciones', () => {
    const { text } = humanize('¿Qué tal? También pensé que sí.', ALL, () => 0);
    expect(text).toBe('qué tal? tmb pensé q sí'.normalize('NFD').replace(/[́]/g, '').normalize('NFC'));
  });

  it('sin rasgos, deja el texto igual', () => {
    expect(humanize('¿Qué tal? Bien.', NONE, () => 0.99).text).toBe('¿Qué tal? Bien.');
  });

  it('no toca enlaces ni números', () => {
    const { text } = humanize('Mira https://Ejemplo.com/Á a las 10:30.', ALL, () => 0);
    expect(text).toContain('https://Ejemplo.com/Á');
    expect(text).toContain('10:30');
  });

  it('un límite se escribe claro: sin dedazos ni abreviaciones', () => {
    const r = humanize('No me gusta que insistas, por favor para.', { ...ALL, typos: 1 }, () => 0, true);
    expect(r.correction).toBeNull();
    expect(r.text).toContain('por favor');
  });

  it('un dedazo nunca cambia la primera letra y a veces se corrige', () => {
    for (let i = 0; i < 20; i++) {
      const w = typo('mañana', seeded(i));
      expect(w[0]).toBe('m');
      expect(w).not.toBe('mañana');
    }
    const items = humanizeItems([{ content: 'nos vemos mañana temprano', kind: 'text' as const, deliverAt: new Date(0) }], { ...NONE, typos: 1 }, () => 0.1);
    expect(items).toHaveLength(2);
    expect(items[1]!.content.startsWith('*')).toBe(true);
    expect(items[1]!.deliverAt.getTime()).toBeGreaterThan(0);
  });

  it('las notas de voz no se tocan', () => {
    const items = humanizeItems([{ content: '¿Qué tal?', kind: 'voice' as const, deliverAt: new Date(0) }], ALL, () => 0);
    expect(items[0]!.content).toBe('¿Qué tal?');
  });

  it('alguien de estilo formal escribe más cuidado que alguien joven y relajado', () => {
    const formal = quirksFor({ age: 52, style: 'formal, cuida la ortografía', traits: ['serio'], name: 'A' });
    const casual = quirksFor({ age: 22, style: 'relajado, en minúsculas, con emojis', traits: ['sarcástica'], name: 'A' });
    expect(casual.lowercase).toBeGreaterThan(formal.lowercase);
    expect(casual.typos).toBeGreaterThan(formal.typos);
  });
});

describe('ritmo de la charla', () => {
  const spec = buildSpec(lucia, '', 'x');
  const plan = spec.derived.dayPlan;
  const base = { emotion: initialEmotion(spec.derived.temperament), profile: 'slow' as const, boundary: false, voiceAllowed: false, userText: 'hola', replies: ['holaa'] };

  it('al inicio contesta en segundos aunque esté trabajando o dormida', () => {
    for (const h of [10, 3]) {
      const now = at(h);
      const presence = presenceAt(plan, now, TZ);
      expect(paceFor({ userTurns: 0, lastPersonaAt: null, now, presence })).toBe('start');
      const p = planDelivery({ ...base, now, presence, pace: 'start', rand: seeded(h) });
      const s = (p.items[0]!.deliverAt.getTime() - now.getTime()) / 1000;
      expect(s).toBeGreaterThanOrEqual(3);
      expect(s).toBeLessThanOrEqual(10);
      expect(p.items).toHaveLength(1);
    }
  });

  it('si ya están platicando, sigue rápido; si no, su día manda', () => {
    const now = at(10);
    const presence = presenceAt(plan, now, TZ);
    expect(paceFor({ userTurns: START_TURNS, lastPersonaAt: new Date(now.getTime() - 60_000), now, presence })).toBe('engaged');
    expect(paceFor({ userTurns: START_TURNS, lastPersonaAt: new Date(now.getTime() - 3_600_000), now, presence })).toBe('normal');
    const p = planDelivery({ ...base, now, presence, pace: 'engaged', rand: seeded(3) });
    expect((p.items[0]!.deliverAt.getTime() - now.getTime()) / 1000).toBeLessThanOrEqual(40);
  });
});

describe('coach', () => {
  const line = (role: PracticeLine['role'], content: string, min: number, events: string[] = []): PracticeLine => ({
    role, content, at: new Date(Date.UTC(2026, 9, 13, 12, min)).toISOString(),
    emotion: role === 'user' ? { valence: 0, energy: 0.5, openness: 0.5, trust: 0.2, label: 'neutral', events: events as never } : null,
  });

  it('deja una idea cada TIP_EVERY mensajes tuyos', () => {
    const lines = [line('user', 'hola', 1), line('persona', 'hola!', 2), line('user', 'qué haces', 3), line('user', 'yo trabajo', 4)];
    expect(TIP_EVERY).toBe(3);
    expect(tipDue(lines, null)).toBe(true);
    expect(tipDue(lines, lines[1]!.at)).toBe(false);
    expect(newUserTurns(lines, lines[2]!.at)).toHaveLength(1);
  });

  it('sin IA, prioriza lo que más importa (respeto antes que estilo)', () => {
    const tip = ruleTip([line('user', 'jaja', 1, ['generic']), line('user', 'ándale', 2, ['insisted_after_no'])], () => 0);
    expect(tip).toMatch(/no/);
    expect(ruleTip([line('user', 'qué te gusta hacer?', 1, ['asked_about_her'])], () => 0)).toMatch(/preguntando/);
  });
});
