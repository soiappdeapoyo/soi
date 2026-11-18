import { describe, expect, it } from 'vitest';
import { extendedTrialEnd, meaningfulFeedback, rewardEligible, rewardNotification, weeksLeft } from '@/lib/trial-reward';

const now = Date.parse('2026-11-17T12:00:00Z');
const ended = '2026-11-16T12:00:00Z';

describe('Usa SOI un mes gratis', () => {
  it('gana días al terminar la prueba, nunca con SOI+ ni pasando los 28', () => {
    expect(rewardEligible({ plan: 'free', trial_ends_at: ended, feedback_reward_days: 0 }, now)).toBe(true);
    expect(rewardEligible({ plan: 'trial', trial_ends_at: ended, feedback_reward_days: 14 }, now)).toBe(true);
    expect(rewardEligible({ plan: 'trial', trial_ends_at: '2026-11-20T00:00:00Z', feedback_reward_days: 0 }, now)).toBe(false);
    expect(rewardEligible({ plan: 'soi_plus', trial_ends_at: ended, feedback_reward_days: 0 }, now)).toBe(false);
    expect(rewardEligible({ plan: 'free', trial_ends_at: ended, feedback_reward_days: 21 }, now)).toBe(false);
  });
  it('solo cuenta una opinión con algo escrito', () => {
    expect(meaningfulFeedback(null, null)).toBe(false);
    expect(meaningfulFeedback('ok', null)).toBe(false);
    expect(meaningfulFeedback('Me gustan los Moments', null)).toBe(true);
  });
  it('7 días más desde hoy y un aviso por cada vez que termina', () => {
    expect(extendedTrialEnd(ended, now)).toBe('2026-11-24T12:00:00.000Z');
    expect(weeksLeft(0)).toBe(3);
    expect(weeksLeft(14)).toBe(1);
    const first = rewardNotification({ trial_ends_at: ended, feedback_reward_days: 0 });
    expect(first.title).toBe('Usa SOI un mes gratis');
    expect(first.body).toMatch(/28 días/);
    expect(first.ref).toBe('trial-feedback:2026-11-16');
    expect(rewardNotification({ trial_ends_at: ended, feedback_reward_days: 14 }).body).toMatch(/última/);
  });
});
