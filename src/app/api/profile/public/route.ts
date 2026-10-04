import { z } from 'zod/v3';
import { getSessionUser, createAdminClient } from '@/lib/supabase/server';
import { detectCrisis } from '@/lib/ai/crisis';
import { hardFilter, MODERATION_COPY } from '@/lib/ai/moderation';
import { moderateImage, IMAGE_REASON_COPY } from '@/lib/ai/image-moderation';
import { moderateFields } from '@/lib/social/guard';
import { MAX_PROFILE_LINKS, normalizeLink } from '@/lib/social/profile-links';

const Body = z.object({
  display_name: z.string().trim().min(1).max(60),
  bio: z.string().trim().max(200).default(''),
  links: z.array(z.object({ label: z.string().trim().max(40).default(''), url: z.string().trim().max(300) })).max(MAX_PROFILE_LINKS).default([]),
  /** Ruta en post-media de la nueva foto (carpeta propia). */
  avatarPath: z.string().max(300).optional(),
});

/**
 * Perfil público: nombre, foto, biografía y enlaces (solo creadores).
 * La biografía no admite enlaces ni ventas (para eso están los enlaces); la foto pasa por moderación de imagen.
 */
export async function PATCH(req: Request) {
  const { supabase, user } = await getSessionUser();
  if (!user) return new Response('No autorizado', { status: 401 });
  const parsed = Body.safeParse(await req.json());
  if (!parsed.success) return Response.json({ ok: false, message: 'Revisa los datos del perfil.' }, { status: 400 });
  const { display_name, bio, avatarPath } = parsed.data;

  const text = [display_name, bio].join('\n');
  if (detectCrisis(text)) return Response.json({ ok: false, reason: 'crisis', message: MODERATION_COPY.crisis }, { status: 422 });
  const hard = hardFilter(text);
  if (hard === 'link') return Response.json({ ok: false, message: 'La biografía no admite enlaces. Agrégalos en "Enlaces".' }, { status: 422 });
  if (hard) return Response.json({ ok: false, message: MODERATION_COPY[hard] }, { status: 422 });

  const { data: creator } = await supabase.from('creator_profiles').select('user_id, display_name, bio').eq('user_id', user.id).maybeSingle();
  const links = [];
  for (const l of parsed.data.links) {
    if (!l.url) continue;
    const url = normalizeLink(l.url);
    if (!url) return Response.json({ ok: false, message: `"${l.url.slice(0, 40)}" no es un enlace válido.` }, { status: 400 });
    const labelHard = l.label ? hardFilter(l.label) : null;
    if (labelHard === 'venta') return Response.json({ ok: false, message: MODERATION_COPY.venta }, { status: 422 });
    links.push({ label: l.label, url });
  }
  if (links.length && !creator) return Response.json({ ok: false, message: 'Los enlaces son para creadores. Activa tu Estudio de creador.' }, { status: 403 });

  const changedText = [display_name !== (creator?.display_name ?? null) ? display_name : null, bio || null];
  const blocked = await moderateFields([...changedText, ...links.map((l) => l.label)]);
  if (blocked) return blocked;

  const admin = createAdminClient();
  let avatarUrl: string | undefined;
  if (avatarPath) {
    if (!avatarPath.startsWith(`${user.id}/`)) return Response.json({ ok: false, message: 'Imagen inválida.' }, { status: 400 });
    const { data: file, error } = await admin.storage.from('post-media').download(avatarPath);
    if (error || !file) return Response.json({ ok: false, message: 'No encontramos tu foto. Súbela de nuevo.' }, { status: 400 });
    const verdict = await moderateImage(new Uint8Array(await file.arrayBuffer()), file.type || 'image/webp');
    if (!verdict) return Response.json({ ok: false, message: 'No pudimos revisar tu foto ahora. Intenta de nuevo en un momento.' }, { status: 503 });
    if (!verdict.allowed) {
      await admin.storage.from('post-media').remove([avatarPath]);
      return Response.json({ ok: false, reason: verdict.reason, message: IMAGE_REASON_COPY[verdict.reason] }, { status: 422 });
    }
    avatarUrl = admin.storage.from('post-media').getPublicUrl(avatarPath).data.publicUrl;
  }

  const { error } = await admin.from('user_profiles')
    .update({ display_name, bio: bio || null, ...(avatarUrl ? { avatar_url: avatarUrl } : {}) }).eq('user_id', user.id);
  if (error) return Response.json({ ok: false, message: 'No se pudo guardar.' }, { status: 500 });
  if (creator) {
    await admin.from('creator_profiles')
      .update({ display_name, links, ...(bio ? { bio } : {}), ...(avatarUrl ? { avatar_url: avatarUrl } : {}), updated_at: new Date().toISOString() })
      .eq('user_id', user.id);
  }
  return Response.json({ ok: true, avatar_url: avatarUrl ?? null, links });
}
