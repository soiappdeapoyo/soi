import { describe, expect, it } from 'vitest';
import { analyzeConversations, complaintHits, detectComplaints, redact, type PrevReply, type UserMsg } from '@/lib/admin/conversation-signals';

let n = 0;
const msg = (conv: string, content: string, minute: number, user = 'u1'): UserMsg =>
  ({ id: `m${++n}`, conversation_id: conv, user_id: user, content, created_at: `2026-10-20T10:${String(minute).padStart(2, '0')}:00Z`, agent_category: 'calma' });

describe('quejas en las conversaciones', () => {
  it('detecta las frases típicas sin importar acentos ni mayúsculas', () => {
    expect(detectComplaints('Esto NO me sirve')).toEqual(['no_sirve']);
    expect(detectComplaints('no me entiendes, no es lo que te pedí')).toEqual(['no_entiende']);
    expect(detectComplaints('ya me lo dijiste')).toEqual(['repetitivo']);
    expect(detectComplaints('es demasiado largo, algo más corto')).toEqual(['largo']);
    expect(detectComplaints('No quiero un ejercicio, solo quiero hablar')).toEqual(['no_propongas']);
    expect(detectComplaints('pareces robot')).toEqual(['robotico']);
    expect(detectComplaints('el audio no se escucha')).toEqual(['tecnico']);
    expect(detectComplaints('me siento mejor, gracias')).toEqual([]);
  });

  it('nunca analiza una conversación con señales de crisis', () => {
    const msgs = [msg('c1', 'ya no quiero vivir', 1), msg('c1', 'esto no me sirve', 2)];
    expect(detectComplaints('ya no quiero vivir, esto no me sirve')).toEqual([]);
    expect(complaintHits(msgs)).toEqual([]);
    const r = analyzeConversations(msgs, new Map());
    expect(r.conversations).toBe(0);
    expect(r.crisisExcluded).toBe(1);
  });

  it('quita correos, teléfonos y enlaces de los ejemplos', () => {
    expect(redact('escríbeme a ana@mail.com o al +52 55 1234 5678, mira https://x.com/a')).toBe('escríbeme a [correo] o al [teléfono], mira [enlace]');
  });

  it('cuenta conversaciones con queja, si se fue después y lo que dijo SOI antes', () => {
    const a1 = msg('c1', 'me siento ansiosa', 1);
    const a2 = msg('c1', 'esto no me sirve', 3);
    const b1 = msg('c2', 'hola', 1, 'u2');
    const c1 = msg('c3', 'muy largo', 1, 'u3');
    const c2 = msg('c3', 'ok gracias', 5, 'u3');
    const prev = new Map<string, PrevReply>([[a2.id, { content: 'Te propongo un Moment de 15 minutos', agent: 'calma', provider: 'deepseek', tools: ['createMoment'] }]]);
    const r = analyzeConversations([a1, a2, b1, c1, c2], prev);
    expect(r.conversations).toBe(3);
    expect(r.withComplaint).toBe(2);
    expect(r.leftAfter).toBe(1);
    expect(r.oneMessage).toBe(1);
    expect(r.byCategory.map((x) => x.id).sort()).toEqual(['largo', 'no_sirve']);
    const ex = r.examples.find((e) => e.category === 'no_sirve')!;
    expect(ex).toMatchObject({ agent: 'calma', provider: 'deepseek', tools: ['createMoment'], position: 2, leftAfter: true, before: 'Te propongo un Moment de 15 minutos' });
    expect(r.examples[0]!.leftAfter).toBe(true);
  });
});
