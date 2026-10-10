import { describe, expect, it } from 'vitest';
import { CHALLENGE_SLUGS, OFFICIAL_CHALLENGES, dayMinutes } from '@/config/official-challenges';
import { OFFICIAL_MOMENTS, officialMoment } from '@/config/official-moments';
import { parseBlocks } from '@/config/actions';
import { blocksForDay, challengeLength } from '@/lib/moments/challenge';

describe('retos oficiales de 7 días', () => {
  it('están entre los Moments oficiales con slug único', () => {
    for (const slug of Object.values(CHALLENGE_SLUGS)) expect(officialMoment(slug)?.kind).toBe('challenge');
    const slugs = OFFICIAL_MOMENTS.map((m) => m.slug);
    expect(new Set(slugs).size).toBe(slugs.length);
  });

  for (const m of OFFICIAL_CHALLENGES) {
    describe(m.title, () => {
      it('todos los bloques son válidos y con id único', () => {
        const { blocks, errors } = parseBlocks(m.blocks);
        expect(errors).toEqual([]);
        expect(blocks).toHaveLength(m.blocks.length);
        expect(new Set(m.blocks.map((b) => b.id)).size).toBe(m.blocks.length);
      });
      it('cada práctica cita su fuente (Regla #8)', () => {
        expect(m.blocks.filter((b) => b.type !== 'celebration' && !b.source)).toEqual([]);
      });
      it('dura 7 días y cada día trae algo nuevo', () => {
        expect(challengeLength(m.blocks, m.duration_days)).toBe(7);
        for (let d = 1; d <= 7; d++) expect(blocksForDay(m.blocks, d).some((b) => b.day === d)).toBe(true);
      });
      it('los minutos mostrados salen del contenido', () => {
        const days = Array.from({ length: 7 }, (_, i) => dayMinutes(m.blocks, i + 1));
        expect(Math.abs(m.required_minutes - days.reduce((a, b) => a + b, 0) / 7)).toBeLessThanOrEqual(0.5);
        expect(Math.max(...days)).toBeLessThanOrEqual(20);
      });
    });
  }
});
