import { describe, it, expect, vi } from 'vitest';

vi.mock('@/lib/integrations/youtube', () => ({ searchYouTube: async () => [{ id: 'v1', title: 'Charla', channel: 'Canal', thumbnail: '' }] }));
vi.mock('@/lib/ai/rag', () => ({ remember: async () => {} }));
vi.mock('@/lib/moments/library-blocks', () => ({ ownsDocuments: async () => true, resolveLibraryBlocks: async (b: unknown) => b }));

import { videoPolicy } from '@/lib/momentum';
import { momentRunOpener } from '@/lib/opener';
import { buildTools } from '@/lib/ai/tools';

const supabase = {
  from: () => ({ insert: (row: { blocks: unknown[] }) => ({ select: () => ({ single: async () => ({ data: { id: 'x', required_minutes: row.blocks.length }, error: null }) }) }) }),
} as never;
const opts = { toolCallId: 't', messages: [] } as never;
const blocks = [
  { type: 'video', title: 'Mira', minutes: 5, config: { query: 'Joe Dispenza' } },
  { type: 'reflection', title: 'Piensa', minutes: 2, config: { question: '¿Qué te llevas?' } },
  { type: 'next_step', title: 'Haz', minutes: 2, config: { instruction: 'Un paso' } },
];
const moment = { title: 'Inspírate', objective: 'Subir la energía', kind: 'learning', reason: 'Porque sí', source: 'SOI', blocks };
const tools = (video: 'none' | 'quick' | 'in_moment') => buildTools({ supabase, userId: 'u', access: { youtube: true, evidence: true, routines: true }, video }) as never as Record<string, { execute: (i: unknown, o: unknown) => Promise<Record<string, unknown>> }>;

describe('un solo video por respuesta, según el estado', () => {
  it('ansiedad o energía: sin video; poca energía: video rápido; pedir video manda', () => {
    expect(videoPolicy('REGULATE', 'estoy con ansiedad')).toBe('none');
    expect(videoPolicy('EXECUTE', 'quiero avanzar con mi meta')).toBe('none');
    expect(videoPolicy('INSPIRE', 'hoy no tengo ganas')).toBe('quick');
    expect(videoPolicy('REGULATE', 'pásame un video para calmarme')).toBe('quick');
    expect(videoPolicy(null, 'quiero aprender a aplicar el video de Dispenza')).toBe('in_moment');
  });

  it('video rápido: se muestra uno y el Moment de la misma respuesta va sin video', async () => {
    const t = tools('quick');
    expect((await t.youtubeSearch!.execute({ query: 'Dispenza' }, opts)).videos).toHaveLength(1);
    expect((await t.youtubeSearch!.execute({ query: 'otro' }, opts)).videos).toHaveLength(0);
    const r = await t.createMoment!.execute(moment, opts);
    expect((r.blocks as { type: string }[]).map((b) => b.type)).toEqual(['reflection', 'next_step']);
  });

  it('video dentro del Moment: sin youtubeSearch aparte', async () => {
    const t = tools('in_moment');
    const r = await t.createMoment!.execute(moment, opts);
    expect((r.blocks as { type: string }[])[0]!.type).toBe('video');
    expect((await t.youtubeSearch!.execute({ query: 'x' }, opts)).skipped).toBeTruthy();
  });

  it('sin video: ni rápido ni dentro del Moment', async () => {
    const t = tools('none');
    expect((await t.youtubeSearch!.execute({ query: 'x' }, opts)).skipped).toBeTruthy();
    expect(((await t.createMoment!.execute(moment, opts)).blocks as { type: string }[]).some((b) => b.type === 'video')).toBe(false);
  });
});

describe('hablar con SOI después de un Moment', () => {
  it('SOI sabe qué viviste y cómo te fue, con respuestas de un toque', () => {
    const ok = momentRunOpener({ title: 'SATS', helped: true, moodBefore: 2, moodAfter: 4, name: 'Lucía M.' });
    expect(ok.text).toBe('Lucía, acabas de vivir «SATS» y se nota que te hizo bien. ¿Qué quieres contarme de cómo te fue?');
    expect(ok.replies).toHaveLength(3);
    const meh = momentRunOpener({ title: 'SATS', helped: false, moodBefore: null, moodAfter: null });
    expect(meh.text).toMatch(/^Acabas de vivir «SATS»\. Me dijiste que no del todo/);
    expect(meh.replies.map((r) => r.label)).toContain('Hazme otro');
  });
});
