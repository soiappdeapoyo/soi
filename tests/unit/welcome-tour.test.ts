import { describe, expect, it } from 'vitest';
import { TOUR_STEPS, bubblePlacement, shouldAutoShowTour } from '@/config/welcome-tour';
import { PRIMARY_TABS } from '@/config/navigation';

describe('recorrido de bienvenida', () => {
  it('aparece solo la primera vez', () => {
    expect(shouldAutoShowTour('/chat', null)).toBe(true);
    expect(shouldAutoShowTour('/hoy', '2026-10-23T10:00:00Z')).toBe(false);
  });

  it('nunca interrumpe un Moment en marcha ni el diagnóstico (ahí no hay barra)', () => {
    expect(shouldAutoShowTour('/m/reto_neville_7/play', null)).toBe(false);
    expect(shouldAutoShowTour('/mapa/diagnostico', null)).toBe(false);
    expect(shouldAutoShowTour('/m/reto_neville_7', null)).toBe(true);
  });

  it('bienvenida, cada pestaña de la barra en orden y cierra en SOI', () => {
    expect(TOUR_STEPS[0]!.target).toBeNull();
    expect(TOUR_STEPS.slice(1, -1).map((s) => s.target)).toEqual(PRIMARY_TABS.map((t) => t.id));
    expect(TOUR_STEPS.at(-1)!.target).toBe('soi');
  });

  it('burbuja arriba de la barra del teléfono, dentro de la pantalla y apuntando a la pestaña', () => {
    const p = bubblePlacement({ top: 760, left: 300, width: 70, height: 56 }, { width: 375, height: 812 });
    expect(p.side).toBe('top');
    expect(p.left + p.width).toBeLessThanOrEqual(375 - 12);
    expect(p.left).toBeGreaterThanOrEqual(12);
    expect(p.left + p.arrow).toBe(335);
    if (p.side === 'top') expect(p.bottom).toBe(812 - 760 + 14);
  });

  it('a la derecha de la pestaña en el sidebar de la computadora', () => {
    const p = bubblePlacement({ top: 120, left: 10, width: 260, height: 40 }, { width: 1280, height: 800 });
    expect(p.side).toBe('right');
    expect(p.left).toBe(284);
    expect(p.arrow).toBe(40);
  });
});
