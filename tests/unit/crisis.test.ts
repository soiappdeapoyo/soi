import { describe, it, expect } from 'vitest';
import { detectCrisis, detectDistress, normalize } from '@/lib/ai/crisis';

describe('detectCrisis', () => {
  it.each([
    'ya no quiero vivir', 'No quiero seguir vivir así', 'me quiero morir', 'pienso en el suicidio',
    'quiero cortarme', 'no vale la pena seguir', 'quiero desaparecer para siempre',
    'quiero morirme', 'Quiero matarme', 'me voy a matar', 'no quiero seguir viviendo',
    'voy a quitarme la vida', 'todos estarían mejor sin mí', 'quiero dormir y no despertar',
    'me corto cuando me siento mal', 'SUICIDARME', 'pienso en acabar con mi vida',
    'soy una carga para mi familia', 'ojalá no despertara mañana', 'I want to die',
    'a veces quiero hacerme daño', 'me lastimo cuando estoy sola',
  ])('detecta: %s', (t) => expect(detectCrisis(t)).toBe(true));

  it.each([
    'quiero vivir mejor', 'me siento cansada', 'cómo hago SATS',
    'me muero de risa con mi hermana', 'me quiero morir de vergüenza jaja', 'mañana me corto el pelo',
    'vamos a matar el tiempo', 'me muero de ganas de empezar', 'quiero despertar temprano',
  ])('no detecta: %s', (t) => expect(detectCrisis(t)).toBe(false));
});

describe('detectDistress', () => {
  it.each(['ya no aguanto más', 'no veo salida', 'nada tiene sentido', 'estoy harta de todo', 'no puedo más'])(
    'detecta malestar: %s', (t) => expect(detectDistress(t)).toBe(true),
  );
  it.each(['hoy fue un buen día', 'quiero más energía'])('no detecta: %s', (t) => expect(detectDistress(t)).toBe(false));
});

describe('normalize', () => {
  it('quita acentos y signos', () => expect(normalize('¡Mañana   QUIERO morir!')).toBe('manana quiero morir'));
});
