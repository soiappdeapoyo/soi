import { z } from 'zod/v3';
import { getSessionUser } from '@/lib/supabase/server';
import { isWorkKey } from '@/lib/library/openlibrary';
import { getExercise } from '@/lib/library/exercises';

const Body = z.discriminatedUnion('kind', [
  z.object({
    kind: z.literal('book'), key: z.string().refine(isWorkKey), title: z.string().trim().min(1).max(300),
    author: z.string().trim().max(200).nullable().optional(), coverUrl: z.string().regex(/^https:\/\/covers\.openlibrary\.org\/b\/id\/\d+-[SML]\.jpg$/).nullable().optional(),
    status: z.enum(['want', 'reading', 'done']).default('want'),
  }),
  z.object({ kind: z.literal('exercise'), id: z.string().min(2).max(120) }),
  z.object({ kind: z.literal('pdf'), path: z.string().max(300), title: z.string().trim().min(1).max(300), size: z.number().int().min(1).max(31_457_280) }),
]);

/** Agregar a mi biblioteca: un libro (Open Library), un ejercicio o un PDF ya subido a mi carpeta. */
export async function POST(req: Request) {
  const { supabase, user } = await getSessionUser();
  if (!user) return new Response('No autorizado', { status: 401 });
  const parsed = Body.safeParse(await req.json());
  if (!parsed.success) return Response.json({ ok: false, message: 'Datos inválidos.' }, { status: 400 });
  const b = parsed.data;

  let row: Record<string, unknown>;
  if (b.kind === 'book') {
    row = { kind: 'book', external_id: b.key, title: b.title, author: b.author ?? null, cover_url: b.coverUrl ?? null, status: b.status };
  } else if (b.kind === 'exercise') {
    const e = await getExercise(b.id);
    if (!e) return Response.json({ ok: false, message: 'No encontramos ese ejercicio.' }, { status: 404 });
    row = { kind: 'exercise', external_id: e.id, title: e.name, author: null, status: 'saved', metadata: { kind: e.kind, muscles: e.muscles, frames: e.frames } };
  } else {
    if (!b.path.startsWith(`${user.id}/`) || !b.path.endsWith('.pdf')) return Response.json({ ok: false, message: 'Archivo inválido.' }, { status: 400 });
    row = { kind: 'pdf', title: b.title, file_path: b.path, file_size: b.size, status: 'saved' };
  }

  const { data, error } = await supabase.from('library_items').insert({ user_id: user.id, ...row }).select('id').single();
  if (error?.code === '23505') {
    const { data: existing } = await supabase.from('library_items').select('id').eq('user_id', user.id).eq('kind', b.kind).eq('external_id', String(row.external_id)).maybeSingle();
    return Response.json({ ok: true, id: existing?.id, existed: true });
  }
  if (error) return Response.json({ ok: false, message: 'No se pudo guardar.' }, { status: 500 });
  return Response.json({ ok: true, id: data.id });
}
