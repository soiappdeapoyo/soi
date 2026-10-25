import { describe, expect, it } from 'vitest';
import { autoPromptPath, deviceFrom, promptEligible, showsFeedbackBubble, cleanText } from '@/lib/feedback';
import { analyzeFeedback, feedbackForPmf, matchesFilter, type FeedbackRow } from '@/lib/admin/feedback';

const NOW = Date.UTC(2026, 9, 25, 12);
const row = (p: Partial<FeedbackRow>): FeedbackRow => ({
  id: Math.random().toString(36), user_id: 'u1', rating: null, liked: null, disliked: null, path: '/hoy', device: 'android',
  plan: 'trial', account_days: 2, source: 'bubble', crisis: false, created_at: new Date(NOW - 3_600_000).toISOString(), ...p,
});

describe('burbuja de opinión', () => {
  it('no estorba en el chat, en un Moment en marcha ni en los flujos de pantalla completa', () => {
    expect(showsFeedbackBubble('/hoy')).toBe(true);
    expect(showsFeedbackBubble('/mi-vida')).toBe(true);
    expect(showsFeedbackBubble('/chat')).toBe(false);
    expect(showsFeedbackBubble('/chat/abc')).toBe(false);
    expect(showsFeedbackBubble('/m/ritual/play')).toBe(false);
    expect(showsFeedbackBubble('/mapa/diagnostico')).toBe(false);
    expect(showsFeedbackBubble('/m/ritual')).toBe(true);
  });

  it('se abre sola una vez, en una pantalla tranquila y cuando ya tiene opinión', () => {
    const base = { promptedAt: null, tourSeen: true, sentBefore: false, completedMoments: 3, accountDays: 0 };
    expect(promptEligible(base)).toBe(true);
    expect(promptEligible({ ...base, completedMoments: 1, accountDays: 3 })).toBe(true);
    expect(promptEligible({ ...base, completedMoments: 0, accountDays: 10 })).toBe(false);
    expect(promptEligible({ ...base, completedMoments: 2, accountDays: 1 })).toBe(false);
    expect(promptEligible({ ...base, promptedAt: '2026-10-01' })).toBe(false);
    expect(promptEligible({ ...base, sentBefore: true })).toBe(false);
    expect(promptEligible({ ...base, tourSeen: false })).toBe(false);
    expect(autoPromptPath('/hoy')).toBe(true);
    expect(autoPromptPath('/m/abc')).toBe(false);
  });

  it('reconoce el dispositivo y limpia el texto', () => {
    expect(deviceFrom('Mozilla/5.0 (Linux; Android 14; SM-A146M) Chrome/130 Mobile')).toBe('android');
    expect(deviceFrom('Mozilla/5.0 (iPhone; CPU iPhone OS 18_0 like Mac OS X)')).toBe('ios');
    expect(deviceFrom('Mozilla/5.0 (Windows NT 10.0; Win64; x64)')).toBe('desktop');
    expect(deviceFrom(null)).toBe('other');
    expect(cleanText('   ')).toBeNull();
    expect(cleanText('x'.repeat(1500))!.length).toBe(1000);
  });
});

describe('lo que dicen (panel)', () => {
  const rows = [
    row({ rating: 4, liked: 'la voz' }),
    row({ rating: 3, user_id: 'u2', device: 'ios' }),
    row({ rating: 1, disliked: 'en Mi día no se lee el título, escríbeme a ana@x.com', path: '/mi-vida?tab=dia', user_id: 'u3' }),
    row({ rating: 2, disliked: 'ya no quiero seguir', crisis: true, user_id: 'u4' }),
    row({ liked: 'todo', created_at: new Date(NOW - 20 * 86_400_000).toISOString() }),
  ];

  it('promedio, reparto, positivas, por pantalla y por dispositivo', () => {
    const a = analyzeFeedback(rows, NOW);
    expect(a.total).toBe(5);
    expect(a.people).toBe(4);
    expect(a.rated).toBe(4);
    expect(a.avg).toBe(2.5);
    expect(a.distribution).toEqual([1, 1, 1, 1]);
    expect(a.positive).toMatchObject({ num: 2, den: 4, pct: 50 });
    expect(a.weekly).toHaveLength(8);
    expect(a.weekly.at(-1)!.n).toBe(4);
    expect(a.byDevice[0]).toMatchObject({ key: 'android', n: 4 });
    expect(a.byPath.find((g) => g.key === '/mi-vida?tab=dia')).toMatchObject({ n: 1, low: 1, changes: 1 });
    expect(a.crisis).toBe(1);
  });

  it('filtros', () => {
    expect(rows.filter((r) => matchesFilter(r, 'baja'))).toHaveLength(2);
    expect(rows.filter((r) => matchesFilter(r, 'gusta'))).toHaveLength(2);
    expect(rows.filter((r) => matchesFilter(r, 'cambia'))).toHaveLength(2);
  });

  it('a Analytics IA llega recortado, sin contacto y nunca lo que trae crisis', () => {
    const f = feedbackForPmf(rows);
    expect(f.quotes).toHaveLength(1);
    expect(f.quotes[0]!.said).toContain('[correo]');
    expect(f.quotes[0]!.said).not.toContain('ana@x.com');
    expect(JSON.stringify(f)).not.toContain('ya no quiero seguir');
  });
});
