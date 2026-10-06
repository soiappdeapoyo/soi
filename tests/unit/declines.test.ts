import { describe, it, expect } from 'vitest';
import { declinedFilter, lastDecline, type Decline } from '@/lib/declines';
import { buildOpener } from '@/lib/opener';

const now = Date.parse('2026-10-06T21:00:00Z');
const d = (ref: string, kind: string, part: Decline['part'], daysAgo: number): Decline => ({ ref, title: `M ${ref}`, kind, part, at: new Date(now - daysAgo * 86_400_000).toISOString() });

describe('"Ahora no" se vuelve aprendizaje', () => {
  it('el mismo Moment no vuelve en 3 días; lo planeado o un reto, solo hoy', () => {
    const f = declinedFilter([d('s:neville_sats', 'recovery', 'noche', 1)], 'noche', now);
    expect(f.allows('s:neville_sats', 'recovery')).toBe(false);
    expect(f.allows('s:neville_sats', 'recovery', true)).toBe(true);
    expect(f.allows('m:otro', 'recovery')).toBe(true);
    expect(declinedFilter([d('s:neville_sats', 'recovery', 'noche', 4)], 'noche', now).allows('s:neville_sats', 'recovery')).toBe(true);
  });
  it('dos "ahora no" al mismo tipo a la misma hora: ese tipo deja de proponerse a esa hora (no a otras)', () => {
    const ds = [d('m:a', 'recovery', 'noche', 2), d('m:b', 'recovery', 'noche', 5)];
    expect(declinedFilter(ds, 'noche', now).allowsKind('recovery')).toBe(false);
    expect(declinedFilter(ds, 'noche', now).allows('m:c', 'recovery', true)).toBe(true);
    expect(declinedFilter(ds, 'manana', now).allowsKind('recovery')).toBe(true);
  });
  it('el saludo lo reconoce y propone algo distinto (o no propone nada)', () => {
    expect(lastDecline([d('m:a', 'daily', 'manana', 3)], now)).toBeNull();
    const base = { name: 'Lucía', hour: 21, today: '2026-10-06', onboardingCompleted: true, lastRitualDate: null, ritualAvailable: false, weakestLink: null, lastConversationTitle: null, checkin: 'high_energy' as const };
    const withOther = buildOpener({ ...base, declined: { title: 'SATS', dayLabel: 'ayer' }, proposal: { id: 'x', title: 'Gratitud', minutes: 5, cover: null } });
    expect(withOther.text).toContain('Ayer preferiste dejar «SATS» para otro momento; lo tomé en cuenta.');
    expect(buildOpener({ ...base, declined: { title: 'SATS', dayLabel: 'hoy' }, proposal: null }).text).toContain('Hace un rato preferiste dejar «SATS»');
    expect(withOther.proposal?.title).toBe('Gratitud');
    const none = buildOpener({ ...base, declined: { title: 'SATS', dayLabel: 'ayer' }, proposal: null });
    expect(none.text).toContain('así que no te propongo nada: tú dime qué te gustaría.');
    expect(none.proposal).toBeNull();
  });
});
