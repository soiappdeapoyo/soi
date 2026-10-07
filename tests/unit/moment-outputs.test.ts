import { describe, it, expect } from 'vitest';
import { outputMemories, outputText } from '@/lib/moments/outputs';
import { shouldSummarize } from '@/lib/ai/understanding';

describe('lo que escribe en un Moment se vuelve memoria', () => {
  const ctx = { momentTitle: 'Calma antes de dormir', blockTitles: { b2: 'Escribe lo pendiente', b3: 'Gratitud', b4: '¿Cómo estás?' }, moodBefore: 2, moodAfter: 4 };
  it('reflexión, escritura, gratitud y emociones, con su contexto y su arco de ánimo', () => {
    const m = outputMemories({
      b1: { type: 'breathing', done: true } as never,
      b2: { type: 'writing', text: 'Mañana hablo con mi jefe sobre el proyecto' },
      b3: { type: 'gratitude', items: ['Mi hermana', 'Un café tranquilo', ''] },
      b4: { type: 'emotion_log', word: 'Alivio' },
      b5: { type: 'reflection', text: 'ok', skipped: false },
    }, ctx);
    expect(m.map((x) => x.blockType)).toEqual(['writing', 'gratitude', 'emotion_log']);
    expect(m[0]!.content).toBe('En «Calma antes de dormir» (paso «Escribe lo pendiente») escribió: «Mañana hablo con mi jefe sobre el proyecto». Llegó mal y terminó bien.');
    expect(m[1]!.content).toContain('agradeció: Mi hermana; Un café tranquilo.');
    expect(m[1]!.category).toBe('emocion');
    expect(m[0]!.said).toBe('Mañana hablo con mi jefe sobre el proyecto');
  });
  it('lo saltado o vacío no se guarda', () => {
    expect(outputText({ type: 'writing', text: 'algo largo', skipped: true })).toBeNull();
    expect(outputText({ type: 'gratitude', items: [] })).toBeNull();
  });
});

describe('el chat aprende', () => {
  it('resume cada 3 mensajes, nunca en crisis', () => {
    expect([1, 2, 3, 4, 6].map((n) => shouldSummarize(n, false))).toEqual([false, false, true, false, true]);
    expect(shouldSummarize(3, true)).toBe(false);
  });
});

describe('lo más revelador primero', () => {
  it('reflexión o escritura antes que gratitud', async () => {
    const { bestWritten } = await import('@/lib/moments/outputs');
    expect(bestWritten({ a: { type: 'gratitude', items: ['Mi mamá'] }, b: { type: 'writing', text: 'Voy a terminar la propuesta' } })).toBe('Voy a terminar la propuesta');
    expect(bestWritten({ a: { type: 'gratitude', items: ['Mi mamá'] } })).toBe('Mi mamá');
    expect(bestWritten(null)).toBeNull();
  });
});
