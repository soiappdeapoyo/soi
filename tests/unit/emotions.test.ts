import { describe, expect, it } from 'vitest';
import { EMOTIONS, emotionBySlug } from '@/config/emotions';

describe('hub de emociones', () => {
  it('tiene las 7 rutas pedidas, sin duplicados', () => {
    expect(EMOTIONS.map((e) => e.slug)).toEqual(['ansiedad', 'estres', 'desmotivacion', 'falta-de-enfoque', 'baja-autoestima', 'sentirse-estancado', 'procrastinacion']);
  });

  it('cumple los límites de SEO', () => {
    for (const e of EMOTIONS) {
      expect(e.title.length, e.slug).toBeLessThanOrEqual(54); // + " · SOI" ≤ 60
      expect(e.description.length, e.slug).toBeLessThanOrEqual(160);
    }
  });

  it('toda práctica y hábito cita su fuente (Regla #8)', () => {
    for (const e of EMOTIONS) {
      expect(e.technique.source.length).toBeGreaterThan(10);
      for (const h of e.habits) expect(h.source.length, h.title).toBeGreaterThan(5);
    }
  });

  it('las relacionadas existen y no se apuntan a sí mismas', () => {
    for (const e of EMOTIONS) for (const r of e.related) {
      expect(emotionBySlug(r), `${e.slug} → ${r}`).not.toBeNull();
      expect(r).not.toBe(e.slug);
    }
  });

  it('el guion de la animación es coherente', () => {
    for (const e of EMOTIONS) {
      const f = e.film;
      expect(f.chips).toContain(f.chip);
      expect(f.blocks.reduce((s, b) => s + b.minutes, 0), e.slug).toBe(f.minutes);
      expect(f.blocks.map((b) => b.label)).toContain(f.playing.label);
      expect(f.moodAfter).toBeGreaterThan(f.moodBefore);
    }
  });
});
