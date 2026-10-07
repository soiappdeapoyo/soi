import { describe, it, expect } from 'vitest';
import { pickThread } from '@/lib/opener-thread';
import { buildOpener } from '@/lib/opener';

const base = { name: 'Lucía M.', hour: 9, today: '2026-10-06', onboardingCompleted: true, lastRitualDate: null, ritualAvailable: false, weakestLink: null, lastConversationTitle: 'Trabajo' };

describe('lo pendiente', () => {
  it('retoma lo que contó (no un chip) y respeta lo que ya cerró', () => {
    expect(pickThread(['Hoy llego con algo de carga.', 'El trabajo me tiene sin dormir desde el lunes', 'sí'])).toEqual({ quote: 'El trabajo me tiene sin dormir desde el lunes' });
    expect(pickThread(['Proponme algo para ahora.', 'Sigue igual.'])).toBeNull();
    expect(pickThread(['El trabajo me tiene sin dormir desde el lunes', 'Gracias, ya me siento mejor'])).toBeNull();
  });
  it('si fue sensible, no cita sus palabras', () => {
    expect(pickThread(['A veces siento que no quiero seguir viviendo así'])).toEqual({ quote: null });
  });
});

describe('al abrir el chat', () => {
  it('lo pendiente manda: una sola pregunta y tres chips', () => {
    const o = buildOpener({ ...base, thread: { quote: 'El trabajo me tiene sin dormir', dayLabel: 'ayer' } });
    expect(o.text).toBe('Buenos días, Lucía. Ayer me contaste: «El trabajo me tiene sin dormir». ¿Cómo siguió?');
    expect(o.replies.map((r) => r.label)).toEqual(['Mejor', 'Sigue igual', 'Hoy es otra cosa']);
    expect(o.links.map((r) => r.label)).toEqual(['Proponme algo']);
    expect(o.kind).toBe('thread');
  });
  it('tema sensible: pregunta con cuidado, sin citar', () => {
    expect(buildOpener({ ...base, thread: { quote: null, dayLabel: 'ayer' } }).text).toContain('Ayer hablamos de algo importante para ti. ¿Cómo sigues hoy?');
  });
  it('sin pendiente: cómo llegas, con tres estados', () => {
    const o = buildOpener(base);
    expect(o.text).toContain('¿Cómo llegas hoy');
    expect(o.replies).toHaveLength(3);
    expect(o.kind).toBe('checkin');
  });
  it('primera vez: qué es SOI y una sola pregunta, sin chips', () => {
    const o = buildOpener({ ...base, onboardingCompleted: false, firstTime: true });
    expect(o.text).toBe('Hola, Lucía. Soy SOI: te acompaño a sentirte mejor con pequeños momentos para tu mente y tu día. Para empezar, ¿qué te trae por aquí hoy?');
    expect(o.replies).toEqual([]);
    expect(o.links).toEqual([]);
    expect(o.kind).toBe('first');
  });
});
