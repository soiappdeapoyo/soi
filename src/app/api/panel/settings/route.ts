import { createAdminClient } from '@/lib/supabase/server';
import { adminFromRequest, audit } from '@/lib/admin/auth';
import { forgetSettings, getSettings, SettingsSchema, SETTING_KEYS, type AppSettings } from '@/lib/settings';

/** Guarda ajustes (tarifas, prueba, límites). Solo administradores; queda en la auditoría con el antes y el después. */
export async function PUT(req: Request) {
  const admin = await adminFromRequest();
  if (!admin) return new Response('No encontrado', { status: 404 });
  const parsed = SettingsSchema.partial().safeParse(await req.json().catch(() => null));
  if (!parsed.success) return Response.json({ ok: false, message: `Revisa «${String(parsed.error.issues[0]?.path.join(' › ') ?? '')}»: está fuera del rango permitido.` }, { status: 400 });
  const before = await getSettings();
  const patch = parsed.data;
  const rows = (Object.keys(patch) as (keyof AppSettings)[]).map((field) => ({
    key: SETTING_KEYS[field], value: patch[field], updated_at: new Date().toISOString(), updated_by: admin.id,
  }));
  if (!rows.length) return Response.json({ ok: true });
  const { error } = await createAdminClient().from('app_settings').upsert(rows);
  if (error) return Response.json({ ok: false, message: 'No se pudo guardar.' }, { status: 500 });
  forgetSettings();
  const changed = Object.fromEntries((Object.keys(patch) as (keyof AppSettings)[]).map((f) => [f, { antes: before[f], ahora: patch[f] }]));
  await audit(admin.id, 'ajustes', null, changed);
  return Response.json({ ok: true });
}
