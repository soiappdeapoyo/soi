import { describe, it, expect, vi } from 'vitest';
import { buildTools } from '@/lib/ai/tools';

function fakeSupabase() {
  const inserts: Record<string, unknown>[] = [];
  const client = {
    from: () => ({
      insert: (row: Record<string, unknown>) => {
        inserts.push(row);
        return { select: () => ({ single: async () => ({ data: { id: 'm-1', required_minutes: 14 }, error: null }) }) };
      },
    }),
  };
  return { client, inserts };
}

type Exec = (input: unknown, opts: unknown) => Promise<Record<string, unknown>>;

describe('herramienta createMoment', () => {
  const input = {
    title: 'Reconectar', objective: 'Volver a sentir dirección', kind: 'recovery', reason: 'Hoy te sientes sin rumbo',
    source: 'Diseñado por SOI · basado en Brian Tracy',
    blocks: [
      { type: 'breathing', title: 'Respira', minutes: 2, config: {} },
      { type: 'writing', title: 'Escribe', minutes: 4, config: { prompt: '¿Qué te preocupa?' } },
      { type: 'checklist', title: 'Lista vacía', minutes: 2, config: { items: [] } },
      { type: 'next_step', title: 'Próximo paso', minutes: 2, config: { instruction: 'Una acción hoy' } },
    ],
  };

  it('valida con el catálogo, descarta lo inválido y guarda un Moment privado', async () => {
    const { client, inserts } = fakeSupabase();
    const tools = buildTools({ supabase: client as never, userId: 'u-1', access: { youtube: true, evidence: true, routines: true, ritual: true } });
    const out = await (tools.createMoment.execute as unknown as Exec)(input, { toolCallId: 't', messages: [] });
    expect(out).toMatchObject({ ok: true, id: 'm-1', minutes: 14, locked: false });
    expect((out.blocks as unknown[]).length).toBe(3);
    expect(inserts[0]).toMatchObject({ creator_id: 'u-1', status: 'private', kind: 'recovery' });
    expect((inserts[0]!.blocks as { config: Record<string, unknown> }[])[0]!.config).toEqual({ inhale: 4, exhale: 6 });
  });

  it('si quedan menos de 2 bloques válidos devuelve los errores para que la IA corrija', async () => {
    const { client, inserts } = fakeSupabase();
    const tools = buildTools({ supabase: client as never, userId: 'u-1', access: { youtube: true, evidence: true } });
    const out = await (tools.createMoment.execute as unknown as Exec)({ ...input, blocks: [input.blocks[0], input.blocks[2]] }, { toolCallId: 't', messages: [] });
    expect(out.ok).toBe(false);
    expect(inserts).toHaveLength(0);
  });

  it('marca como bloqueado para Free (ejecutar requiere SOI+)', async () => {
    vi.spyOn(console, 'error').mockImplementation(() => {});
    const { client } = fakeSupabase();
    const tools = buildTools({ supabase: client as never, userId: 'u-1', access: { youtube: false, evidence: false, routines: false, ritual: false } });
    const out = await (tools.createMoment.execute as unknown as Exec)(input, { toolCallId: 't', messages: [] });
    expect(out.locked).toBe(true);
  });
});
