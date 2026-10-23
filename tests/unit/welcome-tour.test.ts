import { describe, expect, it } from 'vitest';
import { TOUR_SLIDES, shouldAutoShowTour } from '@/config/welcome-tour';
import { PRIMARY_TABS } from '@/config/navigation';

describe('introducción de bienvenida', () => {
  it('aparece sola solo la primera vez', () => {
    expect(shouldAutoShowTour('/chat', null)).toBe(true);
    expect(shouldAutoShowTour('/hoy', '2026-10-23T10:00:00Z')).toBe(false);
  });

  it('nunca interrumpe un Moment en marcha ni el diagnóstico', () => {
    expect(shouldAutoShowTour('/m/reto_neville_7/play', null)).toBe(false);
    expect(shouldAutoShowTour('/mapa/diagnostico', null)).toBe(false);
    expect(shouldAutoShowTour('/m/reto_neville_7', null)).toBe(true);
  });

  it('cada pestaña que nombra existe con el mismo icono', () => {
    for (const s of TOUR_SLIDES) {
      if (!s.tab) continue;
      expect(PRIMARY_TABS.find((t) => t.label === s.tab!.label)?.icon).toBe(s.tab.icon);
    }
  });
});
