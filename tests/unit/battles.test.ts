import { describe, it, expect, vi } from 'vitest';
import { ENEMIES, detectEnemies, enemyById } from '@/config/enemies';
import { CAPACITIES } from '@/config/capacities';
import { parseBlocks } from '@/config/actions';
import { buildSystemPrompt } from '@/lib/ai/prompts';

vi.mock('@/lib/supabase/server', () => ({ createAdminClient: () => ({}) }));

describe('enemigos interiores', () => {
  it('13 enemigos; sus aliados son Capacidades y su Moment es válido y cita fuente', () => {
    expect(ENEMIES).toHaveLength(13);
    for (const e of ENEMIES) {
      expect(e.allies.every((a) => (CAPACITIES as readonly string[]).includes(a)), e.id).toBe(true);
      const { errors } = parseBlocks(e.counter.blocks.map((b, i) => ({ ...b, id: `x${i}` })));
      expect(errors, e.id).toEqual([]);
      expect(e.counter.source.length).toBeGreaterThan(5);
    }
  });
  it('detección por frases típicas (respaldo sin IA)', () => {
    expect(detectEnemies('Lo hago mañana, hoy no tengo cabeza')).toContain('saboteador');
    expect(detectEnemies('¿Y si sale mal? No sé si aceptar el trabajo')).toContain('duda');
    expect(detectEnemies('No lo publiqué porque no estaba perfecto')).toContain('perfeccionista');
    expect(detectEnemies('Hoy fue un buen día y terminé el reporte')).toEqual([]);
  });
});

describe('victorias, intensidad y patrones', () => {
  const D = 86_400_000;
  const now = Date.parse('2026-10-06T18:00:00Z');
  const iso = (t: number) => new Date(t).toISOString();
  it('se vence si en 3 días se vive un Moment que entrena a sus aliados o su Moment "Contra…"', async () => {
    const { pairVictories } = await import('@/lib/battles');
    const events = [
      { id: 'a', enemy: 'duda', source: 'chat', evidence: null, goal: null, occurred_at: iso(now - 5 * D) },
      { id: 'b', enemy: 'duda', source: 'chat', evidence: null, goal: null, occurred_at: iso(now - 4 * D) },
      { id: 'c', enemy: 'perfeccionista', source: 'chat', evidence: null, goal: null, occurred_at: iso(now - 2 * D) },
      { id: 'd', enemy: 'miedo', source: 'chat', evidence: null, goal: null, occurred_at: iso(now - 20 * D) },
    ];
    const runs = [
      { id: 'r1', at: iso(now - 3.5 * D), title: 'Ritual', capacities: ['Claridad' as const] },
      { id: 'r2', at: iso(now - 1 * D), title: `Contra ${enemyById('perfeccionista')!.name}: Entrega la versión 1`, capacities: [] },
      { id: 'r3', at: iso(now - 10 * D), title: 'Calma', capacities: ['Calma' as const] },
    ];
    const won = pairVictories(events, runs);
    expect(won.get('a')?.id).toBe('r1');
    expect(won.has('b')).toBe(false); // el mismo Moment no vence dos veces a la misma Duda
    expect(won.get('c')?.id).toBe('r2');
    expect(won.has('d')).toBe(false); // más de 3 días después
  });
  it('intensidad: sube con apariciones recientes y baja con victorias', async () => {
    const { intensity, intensityLabel } = await import('@/lib/battles');
    const a = intensity([iso(now - D), iso(now - 2 * D), iso(now - 3 * D)], [], now);
    const b = intensity([iso(now - D), iso(now - 2 * D), iso(now - 3 * D)], [iso(now - D), iso(now - 2 * D)], now);
    expect(a).toBeGreaterThan(b);
    expect(intensityLabel(a)).toBe('Fuerte');
    expect(intensity([], [], now)).toBe(0);
  });
  it('patrón: "últimamente aparece por las tardes; antes por la mañana"', async () => {
    const { timePattern } = await import('@/lib/battles');
    const at = (daysAgo: number, utcHour: number) => {
      const d = new Date(now - daysAgo * D); d.setUTCHours(utcHour, 0, 0, 0);
      return { id: `${daysAgo}-${utcHour}`, enemy: 'procrastinacion', source: 'chat', evidence: null, goal: null, occurred_at: d.toISOString() };
    };
    // CDMX = UTC-6: 22:00 UTC = 16:00 (tarde); 14:00 UTC = 8:00 (mañana)
    const events = [at(2, 22), at(5, 22), at(9, 22), at(35, 14), at(40, 14), at(45, 14)];
    expect(timePattern(events, 'America/Mexico_City', now)).toBe('Últimamente aparece por las tardes. Antes aparecía por la mañana.');
  });
});

describe('chat', () => {
  it('el prompt nombra a los enemigos como algo externo y pide registrarlos', () => {
    const p = buildSystemPrompt('brian_tracy', {});
    expect(p).toContain('ENEMIGOS INTERIORES');
    expect(p).toContain('nunca como un defecto de la persona');
    expect(p).toContain('registerEnemy');
  });
});
