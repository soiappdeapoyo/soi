import { describe, it, expect, vi, beforeEach } from 'vitest';
import { capacitiesByRules, levelFor } from '@/config/capacities';

const upserts: unknown[] = [];
vi.mock('@/lib/supabase/server', () => ({ createAdminClient: () => ({ from: () => ({ upsert: async (rows: unknown) => { upserts.push(rows); return { error: null }; }, delete: () => ({ eq: async () => ({}) }) }) }) }));
let aiFails = false;
vi.mock('@/lib/ai/fallback', () => ({
  objectWithFallback: async (o: { schema: { shape: Record<string, unknown> } }) => {
    if (aiFails) throw new Error('sin proveedor');
    if ('items' in o.schema.shape) return { object: { items: [{ ref: 's:brian_tracy_5min', identities: [0, 7], capacities: ['Claridad', 'Inventada'] }] } };
    return { object: { identities: [{ name: 'Empresario', description: 'Construyo un negocio con valor.', capacities: ['Liderazgo', 'Volar'] }] } };
  },
}));
vi.mock('@/lib/ai/hill-memory', () => ({ loadHillMemory: async () => ({ id: null, memory: { definite_chief_aim: 'Tener mi propia agencia' } }) }));

beforeEach(() => { upserts.length = 0; aiFails = false; });
const ids = [
  { id: 'i1', name: 'Empresario', description: null, capacities: ['Claridad', 'Liderazgo'], status: 'active', position: 0, created_at: '' },
  { id: 'i2', name: 'Persona saludable', description: null, capacities: ['Salud'], status: 'active', position: 1, created_at: '' },
];

describe('niveles y capacidades', () => {
  it('cada nivel pide un poco más y nunca hay 100%', () => {
    expect(levelFor(0)).toMatchObject({ level: 1, current: 0, next: 3 });
    expect(levelFor(3)).toMatchObject({ level: 2, current: 0, next: 5 });
    expect(levelFor(8).level).toBe(3);
    expect(levelFor(1000).progress).toBeLessThan(1);
  });
  it('capacidades por reglas: tipo de Moment + acciones más presentes', () => {
    expect(capacitiesByRules('recovery', ['breathing', 'meditation', 'writing'])).toEqual(['Calma', 'Claridad']);
    expect(capacitiesByRules('growth', ['exercise', 'exercise', 'pomodoro'])).toContain('Salud');
  });
});

describe('evidencia', () => {
  it('regresos: volver tras 2+ días sin practicar (en la zona de la persona)', async () => {
    const { comebacks } = await import('@/lib/identity/view');
    const r = comebacks(['2026-10-01T15:00:00Z', '2026-10-02T15:00:00Z', '2026-10-06T15:00:00Z'], 'America/Mexico_City');
    expect(r).toEqual([{ at: '2026-10-06T12:00:00.000Z', gap: 3 }]);
  });
  it('"SOI ha observado que…" solo con mejoras reales y datos en ambos periodos', async () => {
    const { observe } = await import('@/lib/identity/view');
    const now = Date.parse('2026-10-06T12:00:00Z');
    const at = (d: number) => new Date(now - d * 86_400_000).toISOString();
    const run = (d: number, done: boolean, learning: string | null = null) => ({ moment_id: null, moment_slug: 'x', started_at: at(d), completed_at: done ? at(d) : null, learning });
    const prior = [run(40, true), run(45, false), run(50, false), run(55, true)];
    const recent = [run(2, true, 'Me ayudó a ordenar el día'), run(5, true, 'Respirar antes de decidir'), run(8, true, 'Menos ruido'), run(12, true)];
    const obs = observe([...recent, ...prior], 'America/Mexico_City', now);
    expect(obs).toContain('Terminas más de lo que empiezas: abandonas menos tus Moments.');
    expect(obs.some((o) => o.startsWith('Reflexionas más'))).toBe(true);
    expect(obs.some((o) => o.startsWith('Practicas más días'))).toBe(true);
    expect(observe(recent, 'America/Mexico_City', now)).toEqual([]); // sin mes anterior no hay comparación
  });
});

describe('vínculos Moment → identidad', () => {
  it('la IA elige identidades y capacidades válidas (descarta índices e inventos)', async () => {
    const { classifyLinks } = await import('@/lib/identity/classify');
    const [l] = await classifyLinks('u', ids, [{ ref: 's:brian_tracy_5min', title: 'Ritual de 5 minutos', kind: 'daily', types: ['writing'] }]);
    expect(l).toEqual({ ref: 's:brian_tracy_5min', identity_ids: ['i1'], capacities: ['Claridad'] });
    expect(upserts).toHaveLength(1);
  });
  it('sin IA, reglas: capacidades del Moment y las identidades que las comparten', async () => {
    aiFails = true;
    const { classifyLinks } = await import('@/lib/identity/classify');
    const [l] = await classifyLinks('u', ids, [{ ref: 's:five_am_club', title: '5 AM', kind: 'growth', types: ['exercise', 'exercise', 'reading'] }]);
    expect(l!.capacities).toContain('Salud');
    expect(l!.identity_ids).toEqual(['i2']);
  });
  it('propone identidades con la IA y filtra capacidades inventadas; sin IA, según sus metas', async () => {
    const { proposeIdentities } = await import('@/lib/identity/propose');
    const ai = await proposeIdentities({} as never, 'u', { goals: ['Abrir mi agencia'] } as never, []);
    expect(ai).toEqual([{ name: 'Empresario', description: 'Construyo un negocio con valor.', capacities: ['Liderazgo'] }]);
    aiFails = true;
    const rules = await proposeIdentities({} as never, 'u', { goals: ['Ganar más dinero', 'Correr 10 km'] } as never, []);
    expect(rules.map((r) => r.name)).toEqual(expect.arrayContaining(['Arquitecto de mi riqueza', 'Persona saludable']));
  });
});
