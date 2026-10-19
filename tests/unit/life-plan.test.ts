import { describe, it, expect, vi } from 'vitest';
import { parseBlocks } from '@/config/actions';
import { LIFE_AREAS } from '@/config/life-areas';
import { currentWeek, habitMomentBlocks, mondayOf, nextMonday, planByRules, planDates, readPlan, reviewWeek, ReviewBody } from '@/lib/life-plan';
import { northPrompt } from '@/lib/ai/prompts/north';
import { buildSystemPrompt } from '@/lib/ai/prompts';
import { nudgeFor } from '@/lib/reminders';
import type { North } from '@/lib/north';

vi.mock('@/lib/supabase/server', () => ({ createAdminClient: () => ({}) }));

const TZ = 'America/Mexico_City';
const area = (id: string) => LIFE_AREAS.find((a) => a.id === id)!;

describe('plan de 90 días', () => {
  it('por reglas: lo que la persona escribió manda; si no, de dónde a dónde', () => {
    const [salud, dinero] = planByRules([
      { area: area('salud'), current: 4, target: 7, want: 'Dormir 7 horas y entrenar 3 veces' },
      { area: area('dinero'), current: 3, target: null, want: null },
    ]);
    expect(salud).toMatchObject({ area: 'salud', goal: 'Dormir 7 horas y entrenar 3 veces', identity: 'Soy alguien que cuida su cuerpo' });
    expect(salud!.habit.tiny).toMatch(/2 minutos/);
    expect(salud!.milestones).toHaveLength(3);
    expect(dinero!.goal).toBe('Llevar dinero de 3 a 5');
    expect(dinero!.milestones[2]).toBe('Mes 3: llegar a 5/10 en dinero');
  });

  it('el Moment de un hábito es válido: 2 minutos con su señal y el voto por su identidad', () => {
    const blocks = habitMomentBlocks({ tiny: 'Leer una página', cue: 'Después de cenar' }, 'Soy alguien que lee');
    const { blocks: ok, errors } = parseBlocks(blocks);
    expect(errors).toEqual([]);
    expect(ok.map((b) => b.type)).toEqual(['timer', 'celebration']);
    expect(ok[0]!.config).toMatchObject({ instruction: 'Después de cenar: Leer una página. Hoy lo que cuenta es presentarte.' });
    expect(ok[1]!.config).toMatchObject({ message: 'Un voto más por ser alguien que lee.' });
  });

  it('90 días desde hoy y un plan roto se lee como ninguno', () => {
    expect(planDates('2026-10-17')).toEqual({ starts_on: '2026-10-17', ends_on: '2027-01-15' });
    expect(readPlan({ areas: [] })).toBeNull();
    expect(readPlan(null)).toBeNull();
    const plan = { areas: planByRules([{ area: area('salud'), current: 4, target: 7, want: null }]) };
    expect(readPlan(plan)?.areas[0]?.area).toBe('salud');
  });
});

describe('revisión semanal', () => {
  it('lunes de la semana y el siguiente', () => {
    expect(mondayOf('2026-10-18')).toBe('2026-10-12'); // domingo
    expect(mondayOf('2026-10-12')).toBe('2026-10-12');
    expect(mondayOf('2026-10-14')).toBe('2026-10-12');
    expect(nextMonday('2026-10-12')).toBe('2026-10-19');
  });

  it('toca el domingo y el lunes antes de las 12 (hora local), siempre por la semana que termina', () => {
    expect(reviewWeek(TZ, new Date('2026-10-18T20:00:00Z'))).toEqual({ due: true, weekStart: '2026-10-12' }); // domingo 14:00
    expect(reviewWeek(TZ, new Date('2026-10-19T15:00:00Z'))).toEqual({ due: true, weekStart: '2026-10-12' }); // lunes 09:00
    expect(reviewWeek(TZ, new Date('2026-10-19T20:00:00Z'))).toEqual({ due: false, weekStart: '2026-10-19' }); // lunes 14:00
    expect(reviewWeek(TZ, new Date('2026-10-15T15:00:00Z')).due).toBe(false); // jueves
    // Sábado 23:00 en México ya es domingo en UTC: manda la hora local.
    expect(reviewWeek(TZ, new Date('2026-10-18T05:00:00Z')).due).toBe(false);
  });

  it('el foco vale para la semana que empieza (desde el domingo de la revisión) y caduca', () => {
    const review = { week_start: '2026-10-12', next_area: 'salud', one_thing: 'Dejar el celular fuera del cuarto' };
    expect(currentWeek(review, TZ, new Date('2026-10-18T20:00:00Z'))).toMatchObject({ start: '2026-10-19', area: 'salud', label: 'Salud y energía' });
    expect(currentWeek(review, TZ, new Date('2026-10-22T15:00:00Z'))?.one_thing).toBe('Dejar el celular fuera del cuarto');
    expect(currentWeek(review, TZ, new Date('2026-11-05T15:00:00Z'))).toBeNull();
    expect(currentWeek({ ...review, next_area: 'otra' }, TZ, new Date('2026-10-20T15:00:00Z'))).toBeNull();
    expect(currentWeek(null, TZ)).toBeNull();
  });

  it('pide un foco concreto', () => {
    expect(ReviewBody.safeParse({ weekStart: '2026-10-12', area: 'salud', oneThing: 'x' }).success).toBe(false);
    expect(ReviewBody.safeParse({ weekStart: '2026-10-12', area: 'salud', oneThing: 'Caminar', scores: { salud: 6 } }).success).toBe(true);
  });

  it('el aviso del día invita a la revisión si no hay Moments pendientes', () => {
    const step = { kind: 'routine' as const, title: '', detail: '', cta: '', href: '/hoy' };
    expect(nudgeFor(step, { streak: 2, pendingToday: 0, reviewDue: true }).url).toBe('/mapa/semana');
    expect(nudgeFor(step, { streak: 2, pendingToday: 1, reviewDue: true }).url).toBe('/hoy');
  });
});

describe('norte compartido', () => {
  const base: North = { aim: 'Lanzar mi estudio', aimSource: 'purpose', obstacle: null, identity: { name: 'Empresaria', description: null }, enemy: null, hasMap: true, vision: 'Alguien que crea y cuida su cuerpo', focus: [{ label: 'Salud y energía', current: 4, target: 7, goal: 'Dormir 7 horas', habit: 'Caminar 2 minutos (Después de lavarme la cara)' }], week: { label: 'Salud y energía', one_thing: 'Celular fuera del cuarto' }, habits: [{ name: 'Caminar', cue: 'Después de lavarme la cara', time: '07:00' }], values: [], conflict: null, belief: null, works: '', drift: null, learning: null };

  it('con mapa: visión, enfoque con la distancia, el foco de la semana y sus hábitos', () => {
    const p = northPrompt(base);
    expect(p).toContain('Visión: Alguien que crea');
    expect(p).toContain('Enfoque Salud y energía: hoy 4/10, meta 7/10 · meta a 90 días: Dormir 7 horas');
    expect(p).toContain('Esta semana (Salud y energía): Celular fuera del cuarto');
    expect(p).toContain('Hábitos que construye: Caminar (Después de lavarme la cara)');
  });

  it('sin mapa: una invitación posible, sin insistir', () => {
    const p = northPrompt({ ...base, hasMap: false, focus: [], week: null });
    expect(p).toContain('/mapa/diagnostico');
    expect(p).toContain('No insistas');
  });

  it('llega a todos los agentes, pero nunca en crisis', () => {
    for (const a of ['meditacion', 'james_clear', 'napoleon_hill', 'riqueza'] as const) expect(buildSystemPrompt(a, { north: base })).toContain('NORTE DE LA PERSONA');
    expect(buildSystemPrompt('crisis', { north: base })).not.toContain('NORTE');
    expect(buildSystemPrompt('meditacion', {})).not.toContain('NORTE');
  });
});
