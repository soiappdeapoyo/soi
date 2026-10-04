import { z } from 'zod/v3';
import { getSessionUser } from '@/lib/supabase/server';

const Body = z.object({ reason: z.string().trim().max(200).default('') });

/** Reportar. Tres reportes de personas distintas ocultan la publicación hasta revisión. */
export async function POST(req: Request, { params }: { params: Promise<{ id: string }> }) {
  const { id } = await params;
  const { supabase, user } = await getSessionUser();
  if (!user) return new Response('No autorizado', { status: 401 });
  const parsed = Body.safeParse(await req.json().catch(() => ({})));
  const { error } = await supabase.rpc('report_post', { p_post: id, p_reason: parsed.success ? parsed.data.reason : '' });
  return Response.json({ ok: !error });
}
