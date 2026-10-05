import { describe, it, expect, vi } from 'vitest';
import { timeContextPrompt } from '@/lib/time-of-day';
import { COUNTRY_TIMEZONES, defaultTimezone, isValidTimezone } from '@/config/timezones';
import { hillPrompt, HILL_PRINCIPLES } from '@/lib/ai/prompts/napoleon-hill';
import { buildSystemPrompt } from '@/lib/ai/prompts';
import { RouterSchema } from '@/lib/ai/router';
import { AGENTS, PRACTICE_AGENTS } from '@/config/agents';

vi.mock('@/lib/supabase/server', () => ({ createAdminClient: () => ({}) }));

describe('hora local en el chat', () => {
  it('6:50 en Morelia es mañana: rituales, no descompresión', () => {
    const t = timeContextPrompt('America/Mexico_City', new Date('2026-10-05T12:50:00Z'));
    expect(t.part).toBe('manana');
    expect(t.hour).toBe(6);
    expect(t.prompt).toMatch(/lunes, 5 de octubre/);
    expect(t.prompt).toContain('rituales matutinos');
    expect(t.prompt).toContain('No propongas descompresión');
  });
  it('de noche: bajar el ritmo y SATS', () => {
    expect(timeContextPrompt('America/Mexico_City', new Date('2026-10-06T04:00:00Z')).prompt).toContain('SATS');
  });
  it('etiqueta de día relativa en la zona de la persona', async () => {
    const { dayLabelFor } = await import('@/lib/opener-context');
    const now = new Date('2026-10-05T12:50:00Z'); // lunes 6:50 en CDMX
    expect(dayLabelFor('2026-10-05T03:30:00Z', 'America/Mexico_City', now)).toBe('ayer'); // domingo 21:30 local
    expect(dayLabelFor('2026-10-02T15:00:00Z', 'America/Mexico_City', now)).toBe('viernes');
    expect(dayLabelFor('2026-09-20T15:00:00Z', 'America/Mexico_City', now)).toBeNull();
  });
});

describe('zonas horarias por país', () => {
  it('todas son válidas y la principal de México es la del centro (Morelia)', () => {
    for (const zones of Object.values(COUNTRY_TIMEZONES)) for (const z of zones) expect(isValidTimezone(z.tz), z.tz).toBe(true);
    expect(defaultTimezone('MX')).toBe('America/Mexico_City');
    expect(defaultTimezone('ES')).toBe('Europe/Madrid');
    expect(isValidTimezone('Marte/Olympus')).toBe(false);
  });
});

describe('Napoleon Hill', () => {
  it('es agente, está en el sidebar y el router puede elegirlo', () => {
    expect(AGENTS.napoleon_hill.label).toBe('Napoleon Hill');
    expect(PRACTICE_AGENTS[0]).toBe('napoleon_hill');
    expect(RouterSchema.shape.agent.options).toContain('napoleon_hill');
  });
  it('13 principios con preguntas y Moment, y memoria longitudinal en el prompt', () => {
    expect(HILL_PRINCIPLES).toHaveLength(13);
    expect(HILL_PRINCIPLES.every((p) => p.ask.length && p.moment)).toBe(true);
    const p = hillPrompt({ definite_chief_aim: 'Lanzar mi estudio de diseño', deadline: 'marzo 2027', obstacle: 'indecisión' });
    expect(p).toContain('Propósito principal: Lanzar mi estudio de diseño');
    expect(p).toContain('DIAGNOSTICA');
    expect(hillPrompt(null)).toContain('Empieza por el Deseo');
  });
  it('el pack de Hill solo viaja cuando habla Hill (ahorro de tokens)', () => {
    expect(buildSystemPrompt('napoleon_hill', {})).toContain('LOS 13 PRINCIPIOS');
    expect(buildSystemPrompt('afirmacion', {})).not.toContain('LOS 13 PRINCIPIOS');
    expect(buildSystemPrompt('napoleon_hill', {}).length - buildSystemPrompt('brian_tracy', {}).length).toBeLessThan(5000);
  });
});
