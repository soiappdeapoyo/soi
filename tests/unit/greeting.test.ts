import { describe, expect, it } from 'vitest';
import { firstName, greetingFor, reminderSpeech } from '@/lib/voice/greeting';

describe('saludo hablado de los recordatorios', () => {
  it('toma solo el primer nombre y descarta correos', () => {
    expect(firstName('mimy')).toBe('Mimy');
    expect(firstName('María José Pérez')).toBe('María');
    expect(firstName('ana@correo.com')).toBeNull();
    expect(firstName('  ')).toBeNull();
    expect(firstName(null)).toBeNull();
  });

  it('saluda según la hora local', () => {
    expect(greetingFor(8 * 60)).toBe('Hola, buenos días.');
    expect(greetingFor(15 * 60)).toBe('Hola, buenas tardes.');
    expect(greetingFor(21 * 60)).toBe('Hola, buenas noches.');
    expect(greetingFor(2 * 60)).toBe('Hola, buenas noches.');
  });

  it('llama dos veces por su nombre y dice la invitación del día', () => {
    const s = reminderSpeech({ name: 'Mimy', kind: 'nudge', title: 'Tu día está listo', body: 'Un Moment te espera. Dale play y SOI te guía.', localMinutes: 9 * 60 });
    expect(s).toBe('Mimy… Mimy… Hola, buenos días. Tu día está listo. Un Moment te espera. Dale play y SOI te guía. Aquí estoy cuando quieras.');
  });

  it('la alarma de un Moment se dice como se habla', () => {
    const s = reminderSpeech({ name: null, kind: 'moment', title: 'Es hora de «Respira y empieza»', body: '5 min · toca para empezar.', localMinutes: 7 * 60 + 30 });
    expect(s).toBe('Hola, buenos días. Es hora de Respira y empieza. 5 minutos. Cuando quieras, empezamos.');
  });
});
