import { revalidatePath } from 'next/cache';
import { z } from 'zod';
import { createAdminClient } from '@/lib/supabase/server';
import { adminFromRequest, audit } from '@/lib/admin/auth';
import { LEGAL_KIND_IDS, LEGAL_KINDS, LEGAL_MAX_CHARS } from '@/lib/legal';

const Body = z.object({
  kind: z.enum(LEGAL_KIND_IDS),
  content: z.string().trim().min(1).max(LEGAL_MAX_CHARS),
  fileName: z.string().trim().max(200).nullish(),
});

/** Publica una versión nueva de un documento legal (términos o avisos de privacidad). Queda en la auditoría. */
export async function POST(req: Request) {
  const admin = await adminFromRequest();
  if (!admin) return new Response('No encontrado', { status: 404 });
  const parsed = Body.safeParse(await req.json().catch(() => null));
  if (!parsed.success) return Response.json({ ok: false, message: 'El documento está vacío o es demasiado largo.' }, { status: 400 });
  const { kind, content, fileName } = parsed.data;

  const { data, error } = await createAdminClient().from('legal_documents')
    .insert({ kind, content, file_name: fileName || null, created_by: admin.id }).select('id').single();
  if (error) return Response.json({ ok: false, message: 'No se pudo publicar.' }, { status: 500 });

  revalidatePath(LEGAL_KINDS[kind].path);
  await audit(admin.id, `legal_${kind}`, null, { version: data.id, archivo: fileName ?? null, caracteres: content.length });
  return Response.json({ ok: true });
}
