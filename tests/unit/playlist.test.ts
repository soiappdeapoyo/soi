import { describe, it, expect } from 'vitest';
import { playQueue, playHref } from '@/lib/day-plan';
import { officialMoment } from '@/config/official-moments';
import { chunkForVoice } from '@/lib/voice/tts';

const mo = (id: string) => ({ ...officialMoment('neville_sats')!, id, slug: id, official: false, title: `M ${id}`, required_minutes: 5 });
const item = (id: string, done = false) => ({ ref: `m:${id}`, done, moment: mo(id) });

describe('Hoy como lista de reproducción', () => {
  it('el siguiente es el próximo pendiente después del actual', () => {
    const q = playQueue([item('a', true), item('b'), item('c'), item('d', true), item('e')], 'm:b')!;
    expect(q.position).toBe(3);
    expect(q.total).toBe(5);
    expect(q.next?.title).toBe('M c');
    expect(q.next?.href).toBe('/m/c/play?lista=hoy&auto=1');
  });
  it('si no hay nada después, vuelve al primero pendiente antes; al final, no hay siguiente', () => {
    expect(playQueue([item('a'), item('b'), item('c', true)], 'm:b')!.next?.title).toBe('M a');
    expect(playQueue([item('a', true), item('b')], 'm:b')!.next).toBeNull();
  });
  it('fuera de la lista no hay modo lista; los oficiales se abren por slug', () => {
    expect(playQueue([item('a')], 'm:z')).toBeNull();
    expect(playHref(officialMoment('neville_sats')!)).toBe('/m/neville_sats/play?lista=hoy');
  });
});

describe('voz continua', () => {
  it('fragmentos cortos: la generación nunca tarda más que lo que suena el anterior', () => {
    const text = 'Respira profundo y suelta los hombros. '.repeat(40);
    const chunks = chunkForVoice(text);
    expect(chunks.join(' ').replace(/\s+/g, ' ').trim()).toBe(text.replace(/\s+/g, ' ').trim());
    expect(chunks.every((c) => c.length <= 260)).toBe(true);
  });
});
