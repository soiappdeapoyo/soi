import { describe, it, expect } from 'vitest';
import { blockSpeech } from '@/lib/moments/speech';
import { splitForSpeech } from '@/lib/voice/tts';

describe('blockSpeech', () => {
  it('lee la guía completa de la meditación, despacio', () => {
    const guide = 'Cierra los ojos. Lleva la atención a tu respiración. Siente tu cuerpo apoyado.';
    const r = blockSpeech({ type: 'meditation', title: 'Silencio', config: { guide } });
    expect(r.text).toBe(`Silencio. ${guide}`);
    expect(r.slow).toBe(true);
  });
  it('incluye instrucciones, no solo el título', () => {
    expect(blockSpeech({ type: 'timer', title: 'Escribe tu día', config: { instruction: 'Específico y positivo' } }).text).toBe('Escribe tu día. Específico y positivo.');
    expect(blockSpeech({ type: 'checklist', title: 'Prepárate', config: { items: ['Agua', 'Libreta'] } }).text).toBe('Prepárate. Agua. Libreta.');
    expect(blockSpeech({ type: 'breathing', title: 'Respira', config: { inhale: 4, exhale: 6 } }).text).toContain('4 segundos');
    expect(blockSpeech({ type: 'affirmation', title: 'Afirma', config: { text: 'Soy constante' } }).text).toBe('Afirma. Repite conmigo: Soy constante.');
  });
  it('no falla con config vacía', () => {
    expect(blockSpeech({ type: 'reflection', title: 'Piensa', config: {} }).text).toBe('Piensa.');
  });
});

describe('splitForSpeech', () => {
  it('divide en frases y respeta el máximo', () => {
    const long = `${'palabra '.repeat(80)}fin.`;
    const parts = splitForSpeech(`Hola. ¿Cómo estás? ${long}`, 120);
    expect(parts[0]).toBe('Hola.');
    expect(parts[1]).toBe('¿Cómo estás?');
    expect(parts.every((p) => p.length <= 120)).toBe(true);
    expect(parts.join(' ').replace(/\s+/g, ' ')).toContain('fin.');
  });
});
