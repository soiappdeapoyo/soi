import { describe, it, expect, vi } from 'vitest';
import { parseBlocks, defaultBlock, exerciseSeconds } from '@/config/actions';
import { blockSpeech } from '@/lib/moments/speech';

vi.mock('@/lib/supabase/server', () => ({ createAdminClient: () => ({}) }));
vi.mock('@/lib/library/exercises', async (orig) => {
  const real = await orig<typeof import('@/lib/library/exercises')>();
  return {
    ...real,
    allExercises: async () => [{ id: 'Pushups', name: 'Pushups', kind: 'calistenia', level: 'Principiante', equipment: 'Sin equipo', muscles: ['Pecho'], secondary: [], instructions: [], frames: ['https://raw.githubusercontent.com/yuhonas/free-exercise-db/main/exercises/Pushups/0.jpg', 'https://raw.githubusercontent.com/yuhonas/free-exercise-db/main/exercises/Pushups/1.jpg'] }],
  };
});
vi.mock('@/lib/library/openlibrary', () => ({
  searchBooks: async () => [{ key: '/works/OL527464W', title: 'Think and Grow Rich', author: 'Napoleon Hill', year: 1937, coverUrl: 'https://covers.openlibrary.org/b/id/14542536-M.jpg' }],
}));

describe('acciones de biblioteca', () => {
  it('libro, ejercicio y documento validan su config', () => {
    const { blocks, errors } = parseBlocks([
      { id: 'a', type: 'book', title: 'Ideas', minutes: 5, config: { title: 'Goals!', mode: 'summary' } },
      { id: 'b', type: 'exercise', title: 'Lagartijas', minutes: 3, config: { name: 'Lagartijas', query: 'push up', sets: 3, reps: 12 } },
      { id: 'c', type: 'document', title: 'Guía', minutes: 10, config: { title: 'Guía', itemId: '6f1c0b4e-1111-4222-8333-444455556666' } },
      { id: 'd', type: 'document', title: 'Sin PDF', minutes: 10, config: { title: 'x' } },
      { id: 'e', type: 'exercise', title: 'Mala', minutes: 3, config: { name: 'x', exerciseId: 'Pushups', frames: ['https://evil.com/a.jpg'] } },
    ]);
    expect(blocks.map((b) => b.id)).toEqual(['a', 'b', 'c']);
    expect(errors).toHaveLength(2);
  });
  it('el bloque por defecto de ejercicio es válido', () => {
    expect(parseBlocks([defaultBlock('exercise')]).errors).toEqual([]);
  });
  it('duración del ejercicio: series × trabajo + descansos', () => {
    expect(exerciseSeconds({ sets: 3, reps: 10, rest: 30 })).toBe(3 * 30 + 2 * 30);
    expect(exerciseSeconds({ sets: 2, seconds: 45, rest: 15 })).toBe(2 * 45 + 15);
  });
  it('la voz lee las instrucciones de las acciones nuevas', () => {
    expect(blockSpeech({ type: 'exercise', title: 'Lagartijas', config: { name: 'Lagartijas', sets: 3, reps: 12, rest: 30 } }).text)
      .toBe('Lagartijas. Lagartijas: 3 series de 12 repeticiones, con 30 segundos de descanso.');
    expect(blockSpeech({ type: 'book', title: 'Libro', config: { title: 'Goals!', author: 'Brian Tracy', mode: 'read', pages: 10 } }).text).toContain('Lee 10 páginas de Goals! de Brian Tracy');
  });
  it('lo que diseña la IA por nombre se resuelve: ejercicio con animación y libro con portada', async () => {
    const { resolveLibraryBlocks } = await import('@/lib/moments/library-blocks');
    const { blocks } = parseBlocks([
      { id: 'a', type: 'exercise', title: 'Lagartijas', minutes: 3, config: { name: 'Lagartijas', query: 'push', sets: 3, reps: 10 } },
      { id: 'b', type: 'book', title: 'Ideas', minutes: 5, config: { title: 'Piense y hágase rico' } },
    ]);
    const [ex, book] = await resolveLibraryBlocks(blocks);
    expect(ex!.config.exerciseId).toBe('Pushups');
    expect((ex!.config.frames as string[]).length).toBe(2);
    expect(book!.config.key).toBe('/works/OL527464W');
    expect(book!.config.cover).toMatch(/covers\.openlibrary\.org/);
  });
});
