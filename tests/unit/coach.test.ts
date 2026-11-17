import { describe, expect, it } from 'vitest';
import {
  asksForMoment, backoffDays, coachSlotNow, intensity, shouldSend, chatVoiceNote, closeness, daySeed, isEditRequest, learnStyle, proactiveVoice, pushBody,
  responsiveBoost, ruleMessage, unansweredStreak, validCoachMessage, VOICE_NOTES_PER_DAY,
} from '@/lib/coach/proactive';
import { staleIds, withoutArchived, type StaleCandidate } from '@/lib/moments/stale';

describe('SOI te escribe primero: intensidad que se adapta', () => {
  it('empieza con mañana y noche', () => {
    expect(intensity([])).toBe('normal');
    expect(shouldSend({ slot: 'manana', replied: [], daysSinceLast: null })).toBe(true);
    expect(shouldSend({ slot: 'noche', replied: [], daysSinceLast: null })).toBe(true);
    expect(shouldSend({ slot: 'mediodia', replied: [], daysSinceLast: null })).toBe(false);
  });
  it('sin respuesta no escribe uno nuevo; reintenta cada vez más espaciado y solo en la mañana', () => {
    expect(intensity([false, true])).toBe('pausa');
    expect(shouldSend({ slot: 'noche', replied: [false], daysSinceLast: 0 })).toBe(false);
    expect(shouldSend({ slot: 'manana', replied: [false], daysSinceLast: 0 })).toBe(false);
    expect(shouldSend({ slot: 'manana', replied: [false], daysSinceLast: 1 })).toBe(true);
    expect(shouldSend({ slot: 'manana', replied: [false, false, false], daysSinceLast: 3 })).toBe(false);
    expect(shouldSend({ slot: 'manana', replied: [false, false, false], daysSinceLast: 4 })).toBe(true);
    expect(backoffDays(1)).toBe(1);
    expect(backoffDays(2)).toBe(2);
    expect(backoffDays(9)).toBe(7);
  });
  it('con interacción manda más; con poca, reduce', () => {
    expect(intensity([true, true, true, false, true])).toBe('alta');
    expect(shouldSend({ slot: 'mediodia', replied: [true, true, true, true], daysSinceLast: 0 })).toBe(true);
    expect(intensity([true, false, false, false, false, false])).toBe('baja');
    expect(shouldSend({ slot: 'noche', replied: [true, false, false, false, false, false], daysSinceLast: 0 })).toBe(false);
    expect(shouldSend({ slot: 'manana', replied: [true, false, false, false, false, false], daysSinceLast: 1 })).toBe(true);
  });
  it('cuenta los sin respuesta desde el más reciente', () => {
    expect(unansweredStreak([false, false, true, false])).toBe(2);
    expect(unansweredStreak([true, false])).toBe(0);
    expect(unansweredStreak([])).toBe(0);
  });
});

describe('notas de voz', () => {
  it('3 al día en prueba y SOI+, nunca en Free ni con crisis', () => {
    expect(chatVoiceNote({ plan: 'trial', usedToday: 0, userTurns: 4, turnsSinceVoice: null, crisis: false })).toBe(true);
    expect(chatVoiceNote({ plan: 'trial', usedToday: VOICE_NOTES_PER_DAY, userTurns: 9, turnsSinceVoice: null, crisis: false })).toBe(false);
    expect(chatVoiceNote({ plan: 'free', usedToday: 0, userTurns: 9, turnsSinceVoice: null, crisis: false })).toBe(false);
    expect(chatVoiceNote({ plan: 'plus', usedToday: 0, userTurns: 9, turnsSinceVoice: null, crisis: true })).toBe(false);
  });
  it('solo cuando la plática ya dura lo suficiente y no seguidas', () => {
    expect(chatVoiceNote({ plan: 'trial', usedToday: 0, userTurns: 2, turnsSinceVoice: null, crisis: false })).toBe(false);
    expect(chatVoiceNote({ plan: 'trial', usedToday: 1, userTurns: 8, turnsSinceVoice: 1, crisis: false })).toBe(false);
    expect(chatVoiceNote({ plan: 'trial', usedToday: 1, userTurns: 8, turnsSinceVoice: 3, crisis: false })).toBe(true);
  });
  it('en el mensaje del día: en una ocasión o cada tanto', () => {
    expect(proactiveVoice({ plan: 'trial', usedToday: 0, crisisRecent: false, occasion: 'return', voiceDaysAgo: 0 })).toBe(true);
    expect(proactiveVoice({ plan: 'trial', usedToday: 0, crisisRecent: false, occasion: null, voiceDaysAgo: 1 })).toBe(false);
    expect(proactiveVoice({ plan: 'trial', usedToday: 0, crisisRecent: true, occasion: 'return', voiceDaysAgo: null })).toBe(false);
  });
});

describe('aprende de la persona', () => {
  it('más cercano entre más se conocen', () => {
    expect(closeness({ userMessages: 2, daysKnown: 1 })).toBe('nuevo');
    expect(closeness({ userMessages: 15, daysKnown: 3 })).toBe('conocido');
    expect(closeness({ userMessages: 80, daysKnown: 30 })).toBe('cercano');
  });
  it('aprende cómo escribe: corto, emojis, risas, sus expresiones', () => {
    const s = learnStyle(['jaja la neta sí 😅', 'la neta no pude hoy', 'jajaja ok la neta mañana', 'gracias 🙏'])!;
    expect(s.length).toBe('corto');
    expect(s.emojis).toBe(true);
    expect(s.laughs).toBe(true);
    expect(s.expressions.some((e) => e.includes('neta'))).toBe(true);
    expect(learnStyle(['hola'])).toBeNull();
  });
  it('lo que contesta pesa más; lo que ignora, menos', () => {
    const b = responsiveBoost([
      { hook: 'thread:1', replied: true }, { hook: 'thread:2', replied: true },
      { hook: 'goal:x', replied: false }, { hook: 'goal:y', replied: false },
    ]);
    expect(b.get('thread')).toBeGreaterThan(0);
    expect(b.get('goal')).toBeLessThan(0);
  });
});

describe('el mensaje', () => {
  it('saluda como amigo con su nombre, motiva y pregunta; nunca igual', () => {
    const a = ruleMessage({ name: 'Mimy', seed: daySeed('u1', '2026-11-17'), recent: [] });
    expect(a).toMatch(/^(Hola|Holaa|Hey|Hola, hola|Buenas) Mimy, ¿/);
    expect(a).toMatch(/\?$/);
    const b = ruleMessage({ name: 'Mimy', seed: daySeed('u1', '2026-11-18'), recent: [a] });
    expect(validCoachMessage(b, [a])).toBe(true);
    expect(validCoachMessage(a, [a])).toBe(false);
  });
  it('con crisis reciente: solo presencia, sin frases ni preguntas de más', () => {
    expect(ruleMessage({ name: 'Ana', seed: 3, recent: [], crisisRecent: true })).toMatch(/Aquí sigo/);
  });
  it('rechaza enlaces y cifras', () => {
    expect(validCoachMessage('Hola, entra a https://x.com para ver tu avance', [])).toBe(false);
    expect(validCoachMessage('Hola Ana, ya llevas 80% de tu meta, ¿cómo vas?', [])).toBe(false);
  });
  it('la notificación muestra la frase', () => {
    expect(pushBody('Hola Ana, ¿cómo sigues?', false)).toBe('Hola Ana, ¿cómo sigues?');
    expect(pushBody('Hola Ana', true)).toMatch(/^🎙️ Nota de voz · Hola Ana/);
  });
});

describe('Moments: pedir, cambiar y no saturar', () => {
  it('reconoce cuando pide o cambia un Moment', () => {
    expect(isEditRequest('Cambia mi Moment «Calma»: más corto')).toBe(true);
    expect(isEditRequest('hoy cambia todo en mi trabajo')).toBe(false);
    expect(asksForMoment('Diséñame un moment para dormir')).toBe(true);
    expect(asksForMoment('me siento cansada')).toBe(false);
  });
  it('archiva lo propuesto y no vivido en 7 días (nunca hábitos, con hora, vividos ni recientes)', () => {
    const now = Date.parse('2026-11-17T12:00:00Z');
    const old = '2026-11-01T12:00:00Z';
    const base: StaleCandidate = { id: 'a', creator_id: 'u', kind: 'recovery', status: 'private', parent_id: null, created_at: old, updated_at: old };
    const c = [base, { ...base, id: 'habit', kind: 'daily' }, { ...base, id: 'lived' }, { ...base, id: 'timed' },
      { ...base, id: 'new', created_at: '2026-11-15T12:00:00Z', updated_at: '2026-11-15T12:00:00Z' }, { ...base, id: 'copy', parent_id: 'p' }];
    expect(staleIds(c, new Set(['lived']), new Set(['timed']), now)).toEqual(['a']);
    expect(withoutArchived([{ id: '1', ref: 'm:a' }, { id: '2', ref: 'm:a', time: '08:00' }, { id: '3', ref: 's:x' }], new Set(['a'])).map((i) => i.id)).toEqual(['2', '3']);
  });
});

describe('momentos del día', () => {
  it('la mañana a su hora (si es de mañana) o a las 09:00, la noche a las 21:00', () => {
    expect(coachSlotNow(9 * 60 + 3, null)).toBe('manana');
    expect(coachSlotNow(7 * 60 + 30, '07:30')).toBe('manana');
    expect(coachSlotNow(9 * 60, '18:00')).toBe('manana');
    expect(coachSlotNow(21 * 60 + 10, null)).toBe('noche');
    expect(coachSlotNow(14 * 60 + 5, null)).toBe('mediodia');
    expect(coachSlotNow(16 * 60, null)).toBeNull();
  });
  it('la noche cierra el día (sin la pregunta de la mañana)', () => {
    const m = ruleMessage({ name: 'Ana', seed: 5, recent: [], slot: 'noche', about: 'Hoy me acordé de tu meta: «x». ¿Cómo la sientes?' });
    expect(m).not.toMatch(/tu meta/);
    expect(m).toMatch(/\?$/);
  });
});
