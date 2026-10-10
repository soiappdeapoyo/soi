import { describe, expect, it } from 'vitest';
import { dueReminders, inWindow, localMinutesIn, nudgeFor, scheduledDue, toMinutes, type ReminderInput } from '@/lib/reminders';
import type { NextStep } from '@/lib/journey';

const routine: NextStep = { kind: 'routine', title: '', detail: '', cta: 'Ir a Hoy', href: '/hoy' };
const base: ReminderInput = {
  localMinutes: 9 * 60 + 2, items: [], reminderTime: null, activeToday: false, sent: new Set(),
  step: routine, streak: 0, pendingToday: 0, scheduled: [],
};
const item = { id: 'i1', time: '08:15', title: 'Respirar antes del trabajo', minutes: 5, href: '/m/a/play?lista=hoy', done: false };

describe('horas', () => {
  it('lee HH:MM y la ventana cruza la medianoche', () => {
    expect(toMinutes('08:15')).toBe(495);
    expect(toMinutes('nada')).toBeNull();
    expect(inWindow(495, 495)).toBe(true);
    expect(inWindow(509, 495)).toBe(true);
    expect(inWindow(510, 495)).toBe(false);
    expect(inWindow(3, 23 * 60 + 55)).toBe(true);
  });
  it('minutos locales en otra zona', () => {
    expect(localMinutesIn('America/Mexico_City', new Date('2026-10-10T15:30:00Z'))).toBe(9 * 60 + 30);
  });
});

describe('qué avisar', () => {
  it('la hora de un Moment de su día es una alarma, una sola vez y solo si no lo vivió', () => {
    const at = { ...base, localMinutes: 8 * 60 + 17, items: [item] };
    expect(dueReminders(at)).toEqual([expect.objectContaining({ kind: 'moment', ref: 'i1', alarm: true, url: item.href })]);
    expect(dueReminders({ ...at, sent: new Set(['moment:i1']) })).toEqual([]);
    expect(dueReminders({ ...at, items: [{ ...item, done: true }] })).toEqual([]);
    expect(dueReminders({ ...at, localMinutes: 8 * 60 + 40 })).toEqual([]);
  });

  it('la invitación del día: a su hora, si hoy no vino, una vez', () => {
    expect(dueReminders(base)).toEqual([expect.objectContaining({ kind: 'nudge', alarm: false })]);
    expect(dueReminders({ ...base, activeToday: true })).toEqual([]);
    expect(dueReminders({ ...base, sent: new Set(['nudge:daily']) })).toEqual([]);
    expect(dueReminders({ ...base, reminderTime: '19:30', localMinutes: 19 * 60 + 31 })).toHaveLength(1);
    expect(dueReminders({ ...base, reminderTime: '19:30' })).toEqual([]);
  });

  it('nunca de madrugada por defecto, pero respeta la hora que eligió', () => {
    expect(dueReminders({ ...base, reminderTime: '23:00', localMinutes: 23 * 60 })).toHaveLength(1);
  });

  it('no junta la invitación con la alarma de un Moment', () => {
    const both = { ...base, items: [{ ...item, time: '09:00' }] };
    expect(dueReminders(both).map((n) => n.kind)).toEqual(['moment']);
  });

  it('los recordatorios pedidos en el chat', () => {
    expect(dueReminders({ ...base, activeToday: true, scheduled: [{ id: 'k1', title: 'Llamar a mamá' }] }))
      .toEqual([expect.objectContaining({ kind: 'scheduled', ref: 'k1', body: 'Llamar a mamá' })]);
  });

  it('el texto sigue el siguiente paso del loop', () => {
    expect(nudgeFor({ ...routine, kind: 'follow_up', href: '/chat?nueva=1&run=r' }, { streak: 0, pendingToday: 0 }).url).toBe('/chat?nueva=1&run=r');
    expect(nudgeFor(routine, { streak: 0, pendingToday: 2 }).body).toMatch(/^2 Moments/);
    expect(nudgeFor(routine, { streak: 5, pendingToday: 0 }).title).toBe('Llevas 5 días');
  });
});

describe('recordatorios pedidos en el chat', () => {
  const now = new Date('2026-10-10T15:05:00Z'); // 09:05 en Ciudad de México
  it('hora local sin zona: hoy y dentro de la ventana', () => {
    expect(scheduledDue('2026-10-10T09:00:00', 'America/Mexico_City', now)).toBe(true);
    expect(scheduledDue('2026-10-10T08:30', 'America/Mexico_City', now)).toBe(false);
    expect(scheduledDue('2026-10-11T09:00', 'America/Mexico_City', now)).toBe(false);
  });
  it('con zona: tiempo absoluto', () => {
    expect(scheduledDue('2026-10-10T15:00:00Z', 'America/Mexico_City', now)).toBe(true);
    expect(scheduledDue('2026-10-10T09:00:00-06:00', 'America/Mexico_City', now)).toBe(true);
    expect(scheduledDue('2026-10-10T16:00:00Z', 'America/Mexico_City', now)).toBe(false);
    expect(scheduledDue('mañana', 'America/Mexico_City', now)).toBe(false);
  });
});
