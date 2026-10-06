import { z } from 'zod/v3';
import { getSessionUser } from '@/lib/supabase/server';
import { isCapacity } from '@/config/capacities';
import { resetLinks } from '@/lib/identity/classify';

const Patch = z.object({
  name: z.string().trim().min(2).max(60).optional(),
  description: z.string().trim().max(240).optional(),
  capacities: z.array(z.string()).max(6).optional(),
  status: z.enum(['active', 'archived']).optional(),
});

export async function PATCH(req: Request, { params }: { params: Promise<{ id: string }> }) {
  const { id } = await params;
  const { supabase, user } = await getSessionUser();
  if (!user) return new Response('No autorizado', { status: 401 });
  const parsed = Patch.safeParse(await req.json().catch(() => null));
  if (!parsed.success) return Response.json({ ok: false }, { status: 400 });
  const p = parsed.data;
  const { error } = await supabase.from('identities').update({
    ...(p.name ? { name: p.name } : {}), ...(p.description !== undefined ? { description: p.description || null } : {}),
    ...(p.capacities ? { capacities: p.capacities.filter(isCapacity).slice(0, 6) } : {}), ...(p.status ? { status: p.status } : {}),
    updated_at: new Date().toISOString(),
  }).eq('id', id).eq('user_id', user.id);
  if (error) return Response.json({ ok: false }, { status: 500 });
  await resetLinks(user.id);
  return Response.json({ ok: true });
}
