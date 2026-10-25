import { createAdminClient } from '@/lib/supabase/server';
import { loadPersona, personsApiSession } from '@/lib/persons/server';

/** La persona abrió el chat: lo entregado hasta ahora queda leído (los no leídos de la lista se apagan). */
export async function POST(_req: Request, { params }: { params: Promise<{ id: string }> }) {
  const s = await personsApiSession();
  if (s instanceof Response) return s;
  const persona = await loadPersona(s.userId, (await params).id);
  if (!persona) return new Response(null, { status: 404 });
  await createAdminClient().from('personas').update({ last_read_at: new Date().toISOString() }).eq('id', persona.id);
  return new Response(null, { status: 204 });
}
