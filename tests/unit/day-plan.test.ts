import { describe, it, expect, vi } from 'vitest';
import { dateInTz, startOfTodayISO, hourInTz } from '@/lib/utils';
import { nextPending, partOfDay, DayItemsSchema } from '@/lib/day-plan';
import { buildOpener } from '@/lib/opener';
import type { Exercise } from '@/lib/library/exercises';

vi.mock('@/lib/supabase/server', () => ({ createAdminClient: () => ({}) }));

describe('fechas en la zona horaria de la persona', () => {
  // Domingo 4 de octubre, 21:30 en Ciudad de México = lunes 5, 03:30 UTC.
  const sundayNight = new Date('2026-10-05T03:30:00Z');
  it('el domingo en la noche sigue siendo domingo (no lunes en UTC)', () => {
    expect(sundayNight.toISOString().slice(0, 10)).toBe('2026-10-05');
    expect(dateInTz(sundayNight, 'America/Mexico_City')).toBe('2026-10-04');
    expect(new Intl.DateTimeFormat('es', { weekday: 'long', timeZone: 'America/Mexico_City' }).format(sundayNight)).toBe('domingo');
  });
  it('"hoy" empieza a la medianoche local', () => {
    expect(startOfTodayISO('America/Mexico_City', sundayNight)).toBe('2026-10-04T06:00:00.000Z');
    expect(hourInTz('America/Mexico_City', sundayNight)).toBe(21);
  });
});

describe('Mi día', () => {
  it('parte del día por hora local', () => {
    expect(partOfDay(6)).toBe('manana');
    expect(partOfDay(15)).toBe('tarde');
    expect(partOfDay(21)).toBe('noche');
    expect(partOfDay(2)).toBe('noche');
  });
  it('el siguiente: el primero pendiente cuya hora ya llegó; si no, el primero pendiente', () => {
    const items = [
      { id: 'a', time: '07:00', done: true },
      { id: 'b', time: '15:00', done: false },
      { id: 'c', time: '22:00', done: false },
    ];
    expect(nextPending(items, 16)).toBe('b');
    expect(nextPending(items, 9)).toBe('b');
    expect(nextPending([{ id: 'x', done: false }, { id: 'y', time: '08:00', done: false }], 7)).toBe('x');
  });
  it('valida referencias y horas', () => {
    expect(DayItemsSchema.safeParse([{ id: '1', ref: 's:neville_sats', time: '21:30' }]).success).toBe(true);
    expect(DayItemsSchema.safeParse([{ id: '1', ref: 'https://evil', time: '25:00' }]).success).toBe(false);
  });
  it('el saludo propone lo planeado en Mi día', () => {
    const o = buildOpener({ name: 'Ana', hour: 15, today: '2026-10-04', onboardingCompleted: true, lastRitualDate: '2026-10-04', ritualAvailable: true, weakestLink: null, lastConversationTitle: null,
      proposal: { id: 'm1', title: 'Pausa de tarde', minutes: 5, cover: null, planned: true } });
    expect(o.text).toContain('En tu día sigue «Pausa de tarde».');
    expect(o.proposal?.why).toBe('Es lo que planeaste en Mi día.');
  });
});

describe('guías de estiramiento', () => {
  const ex = (id: string, muscles: string[]): Exercise => ({ id, name: id, kind: 'estiramiento', level: 'Principiante', equipment: 'Sin equipo', muscles, secondary: [], instructions: [], frames: [`https://raw.githubusercontent.com/yuhonas/free-exercise-db/main/exercises/${id}/0.jpg`, `https://raw.githubusercontent.com/yuhonas/free-exercise-db/main/exercises/${id}/1.jpg`] });
  it('relaciona el texto en español con la zona del cuerpo', async () => {
    const { stretchFor } = await import('@/lib/moments/library-blocks');
    const list = [ex('Neck_Side_Stretch', ['Cuello']), ex('Shoulder_Stretch', ['Hombros']), ex('Hamstring_Stretch', ['Isquiotibiales'])];
    expect(stretchFor('Cuello: inclina a cada lado', list)?.[0]).toContain('Neck_Side_Stretch');
    expect(stretchFor('Hombros: círculos hacia atrás', list)?.[0]).toContain('Shoulder_Stretch');
    expect(stretchFor('Toca la punta de tus pies', list)?.[0]).toContain('Hamstring_Stretch');
    expect(stretchFor('Sonríe y respira', list)).toBeNull();
  });
});
