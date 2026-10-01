import { describe, it, expect } from 'vitest';
import { detectCrisis } from '@/lib/ai/crisis';

describe('detectCrisis', () => {
  it.each([
    'ya no quiero vivir', 'No quiero seguir vivir así', 'me quiero morir', 'pienso en el suicidio',
    'quiero cortarme', 'no vale la pena seguir', 'quiero desaparecer para siempre',
  ])('detecta: %s', (t) => expect(detectCrisis(t)).toBe(true));

  it.each(['quiero vivir mejor', 'me siento cansada', 'cómo hago SATS'])('no detecta: %s', (t) => expect(detectCrisis(t)).toBe(false));
});
