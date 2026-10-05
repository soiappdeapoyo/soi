import { describe, it, expect, vi, beforeEach } from 'vitest';
import { parseBlocks, type ActionBlock } from '@/config/actions';
import { blockConfigFor } from '@/lib/guided';
import { blockSpeech } from '@/lib/moments/speech';

vi.mock('@/lib/supabase/server', () => ({ createAdminClient: () => ({}) }));
vi.mock('@/lib/ai/rag', () => ({ recall: async () => [{ title: 'Deseo', content: 'Quiero vivir junto al mar' }] }));
const calls: { instructions: string; prompt: string }[] = [];
vi.mock('@/lib/ai/fallback', () => ({
  objectWithFallback: async (o: { instructions: string; prompt: string; schema: { shape: Record<string, unknown> } }) => {
    calls.push({ instructions: o.instructions, prompt: o.prompt });
    const keys = Object.keys(o.schema.shape);
    if (keys.includes('script')) return { object: { title: 'Volver al mar', technique: 'Coherencia', script: 'Llega a tu respiración.\n\nImagina el mar.', source: 'Joe Dispenza' } };
    if (keys.includes('affirmations')) return { object: { title: 'Merezco', affirmations: ['Merezco calma', 'Confío en mí', 'Avanzo cada día'], source: 'Napoleon Hill' } };
    return { object: { title: 'Casa junto al mar', desire: 'Vivir junto al mar', assumption: 'Ya vivo junto al mar', scene: 'Abro la ventana y escucho las olas mientras preparo café; mi hermana me dice: qué bonito es tu hogar.', feeling: 'Paz y gratitud', action: 'Investigar dos zonas hoy', source: 'Neville Goddard' } };
  },
}));

const supabaseStub = { from: () => ({ insert: () => ({ select: () => ({ single: async () => ({ data: { id: '6f1c0b4e-1111-4222-8333-444455556666' } }) }) }) }) };
const block = (p: Partial<ActionBlock>): ActionBlock => ({ id: 'b', type: 'timer', title: 'Paso', minutes: 5, config: { instruction: '' }, ...p });

beforeEach(() => { calls.length = 0; });

describe('acciones guiadas', () => {
  it('valida meditación larga, varias afirmaciones y la nueva manifestación', () => {
    const { blocks, errors } = parseBlocks([
      { id: 'a', type: 'meditation', title: 'Calma', minutes: 5, config: { guide: 'x'.repeat(3000) } },
      { id: 'b', type: 'affirmation', title: 'Afirma', minutes: 2, config: { text: 'Soy capaz', items: ['Soy capaz', 'Confío'] } },
      { id: 'c', type: 'manifestation', title: 'Manifiesta', minutes: 5, config: { desire: 'Un hogar', assumption: 'Ya vivo ahí', scene: 'Abro la puerta…' } },
    ]);
    expect(errors).toEqual([]);
    expect(blocks).toHaveLength(3);
  });
  it('la voz lee la manifestación completa, despacio', () => {
    const r = blockSpeech({ type: 'manifestation', title: 'Hogar', config: { desire: 'Un hogar', assumption: 'Ya vivo ahí', scene: 'Abro la puerta.', feeling: 'Paz' } });
    expect(r.text).toContain('Lo que vas a manifestar: Un hogar.');
    expect(r.text).toContain('Asúmelo así: Ya vivo ahí.');
    expect(r.text).toContain('Abro la puerta.');
    expect(r.style).toBe('calm');
  });
  it('convierte el contenido de la biblioteca en el bloque correcto', () => {
    const b = blockConfigFor({ kind: 'affirmations', content: { title: 'T', affirmations: ['A', 'B'], source: 'Hill' } }, 'id1');
    expect(b).toMatchObject({ type: 'affirmation', config: { text: 'A', items: ['A', 'B'], itemId: 'id1' } });
  });
});

describe('enriquecimiento: "medita" ya no es solo tiempo', () => {
  it('detecta pasos sin contenido', async () => {
    const { needsContent } = await import('@/lib/moments/enrich');
    expect(needsContent(block({ type: 'meditation', config: { guide: 'Cierra los ojos.' } }))).toBe('meditation');
    expect(needsContent(block({ title: 'Manifiesta tu deseo' }))).toBe('manifestation');
    expect(needsContent(block({ title: 'Medita 5 minutos' }))).toBe('meditation');
    expect(needsContent(block({ type: 'affirmation', config: { text: 'Soy capaz' } }))).toBe('affirmations');
    expect(needsContent(block({ type: 'meditation', config: { guide: 'x'.repeat(400) } }))).toBeNull();
    expect(needsContent(block({ title: 'Escribe tu día', config: { instruction: 'Escribe' } }))).toBeNull();
  });
  it('los agentes escriben el contenido con su ficha y el contexto de la persona, y se guarda en la biblioteca', async () => {
    const { enrichGuidedBlocks } = await import('@/lib/moments/enrich');
    const profile = { display_name: 'Ana', goals: ['Vivir junto al mar'], blockers: ['miedo a cambiar'], dominant_emotion: 'Ansiedad', recurring_themes: [], archetype: null } as never;
    const { blocks, changed } = await enrichGuidedBlocks(supabaseStub as never, 'u1', profile, [
      block({ id: 'm', title: 'Medita', config: { instruction: '' } }),
      block({ id: 'x', title: 'Manifiesta', config: { instruction: '' } }),
      block({ id: 'w', type: 'writing', title: 'Escribe', config: { prompt: '¿Qué sientes?' } }),
    ], 'Calma para decidir mudarme');
    expect(changed).toBe(true);
    expect(blocks[0]).toMatchObject({ type: 'meditation', config: { guide: expect.stringContaining('Imagina el mar') } });
    expect(blocks[1]).toMatchObject({ type: 'manifestation', config: { assumption: 'Ya vivo junto al mar', itemId: expect.any(String) } });
    expect(blocks[2]!.type).toBe('writing');
    const meditationCall = calls.find((c) => c.instructions.includes('Calma'))!;
    expect(meditationCall.instructions).toContain('Joe Dispenza');
    expect(meditationCall.prompt).toContain('Vivir junto al mar');
    expect(meditationCall.prompt).toContain('Ansiedad');
    expect(calls.find((c) => c.instructions.includes('Asunción'))!.instructions).toContain('Neville Goddard');
    expect(parseBlocks(blocks).errors).toEqual([]);
  });
  it('si el agente falla, el Moment sigue igual', async () => {
    const fb = await import('@/lib/ai/fallback');
    const spy = vi.spyOn(fb, 'objectWithFallback').mockRejectedValueOnce(new Error('sin proveedor'));
    const { enrichGuidedBlocks } = await import('@/lib/moments/enrich');
    const original = [block({ type: 'meditation', config: { guide: 'Respira.' } })];
    const { blocks } = await enrichGuidedBlocks(supabaseStub as never, 'u1', null, original, 'x');
    expect(blocks[0]).toEqual(original[0]);
    spy.mockRestore();
  });
});
