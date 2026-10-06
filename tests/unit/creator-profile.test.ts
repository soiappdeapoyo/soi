import { describe, it, expect, vi } from 'vitest';

vi.mock('@/lib/moments/auto-cover', () => ({ scheduleAutoCover: () => {} }));
import { parseHighlights, creatorBlocks } from '@/lib/creators/profile';
import { youtubeId } from '@/components/moments/builder-fields';
import { buildTools, CONTENT_TOOLS } from '@/lib/ai/tools';
import { parseBlocks } from '@/config/actions';

const uid = '11111111-2222-4333-8444-555555555555';

describe('perfil de creador', () => {
  it('destacados: título corto y al menos un Moment; lo inválido se descarta entero', () => {
    const ok = [{ id: 'abcd1234', title: 'Mañanas', moment_ids: [uid] }];
    expect(parseHighlights(ok)).toEqual(ok);
    expect(parseHighlights([{ id: 'abcd1234', title: '', moment_ids: [uid] }])).toEqual([]);
    expect(parseHighlights('nada')).toEqual([]);
  });
});

describe('cuenta de creador: sin IA en su contenido', () => {
  it('el chat no tiene herramientas que generan contenido', () => {
    const base = { supabase: {} as never, userId: 'u', access: { youtube: true, evidence: true } };
    const creator = Object.keys(buildTools({ ...base, creator: true }));
    for (const t of CONTENT_TOOLS) expect(creator).not.toContain(t);
    expect(creator).toContain('registerEnemy');
    expect(Object.keys(buildTools(base))).toContain('createMoment');
  });
  it('un libro se vive leyendo páginas, no con el resumen de la IA', () => {
    const out = creatorBlocks([{ type: 'book', config: { title: 'Hábitos atómicos', mode: 'summary' } }, { type: 'writing', config: { prompt: 'x' } }]);
    expect(out[0]!.config.mode).toBe('read');
    expect(out[1]!.config).toEqual({ prompt: 'x' });
  });
});

describe('medios propios', () => {
  it('link de YouTube en cualquier formato', () => {
    for (const u of ['https://www.youtube.com/watch?v=dQw4w9WgXcQ', 'https://youtu.be/dQw4w9WgXcQ?t=3', 'https://youtube.com/shorts/dQw4w9WgXcQ', 'dQw4w9WgXcQ']) expect(youtubeId(u)).toBe('dQw4w9WgXcQ');
    expect(youtubeId('https://vimeo.com/123')).toBeNull();
  });
  it('bloque imagen: solo rutas propias de moment-assets', () => {
    const good = parseBlocks([{ id: 'b1', type: 'image', title: 'Mira', minutes: 1, config: { path: `${uid}/images/${uid}.webp`, caption: 'Respira' } }]);
    expect(good.blocks).toHaveLength(1);
    const bad = parseBlocks([{ id: 'b1', type: 'image', title: 'Mira', minutes: 1, config: { path: 'https://otro.com/x.jpg' } }]);
    expect(bad.blocks).toHaveLength(0);
  });
});
