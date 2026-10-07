import type { SupabaseClient } from '@supabase/supabase-js';
import { detectCrisis } from '@/lib/ai/crisis';
import { dayLabelFor } from '@/lib/opener-context';

/**
 * Lo pendiente: si en los últimos 3 días hubo una conversación con algo que la persona contó (no un toque en un
 * chip) y no la cerró ("gracias, ya estoy mejor"), el saludo la retoma con sus palabras: "¿Cómo siguió?".
 * Si lo que contó tenía señales de crisis, no se cita: se pregunta con cuidado.
 */
export type OpenerThread = { quote: string | null; dayLabel: string; conversationId: string };

// Respuestas de un toque y frases de sistema: no son "algo que contó".
const NOT_A_TOPIC = /^(hoy llego|proponme|sigamos con|mejor, gracias|sigue igual|hoy es otra|ahora no|eso no me|se me hizo|no era el momento|hazme otro|me hizo bien|algo me cost|quiero repetirlo|mi reflexi[oó]n de|ahora no tengo tanto)/i;
const CLOSED = /(gracias[,! ]+(ya )?(me siento|estoy) mejor|ya (lo )?resolv|ya estoy bien|todo bien ya|listo,? gracias)/i;

const quote = (t: string, max = 90) => {
  const s = t.replace(/\s+/g, ' ').trim();
  return s.length > max ? `${s.slice(0, max - 1).trimEnd()}…` : s;
};

/** Elige qué retomar de una conversación (mensajes de la persona, en orden). */
export function pickThread(userMessages: string[]): { quote: string | null } | null {
  const said = userMessages.map((m) => m.trim()).filter((m) => m.length >= 25 && !NOT_A_TOPIC.test(m));
  if (!said.length) return null;
  if (CLOSED.test(userMessages.at(-1) ?? '')) return null;
  const topic = said[0]!;
  return { quote: detectCrisis(topic) ? null : quote(topic) };
}

export async function loadThread(supabase: SupabaseClient, userId: string, timeZone: string): Promise<OpenerThread | null> {
  const since = new Date(Date.now() - 3 * 86_400_000).toISOString();
  const { data: conv } = await supabase.from('conversations').select('id, last_message_at').eq('user_id', userId).eq('is_archived', false)
    .gte('last_message_at', since).order('last_message_at', { ascending: false }).limit(1).maybeSingle();
  if (!conv) return null;
  const { data: msgs } = await supabase.from('messages').select('content').eq('conversation_id', conv.id).eq('role', 'user')
    .order('created_at', { ascending: true }).limit(12);
  const picked = pickThread((msgs ?? []).map((m) => String(m.content ?? '')));
  const dayLabel = dayLabelFor(conv.last_message_at as string, timeZone);
  if (!picked || !dayLabel) return null;
  return { quote: picked.quote, dayLabel, conversationId: conv.id as string };
}
