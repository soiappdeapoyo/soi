import { adminFromRequest, audit } from '@/lib/admin/auth';
import { exportUserData } from '@/lib/account/server';
import { exportFileName } from '@/lib/account/rules';

export const maxDuration = 60;

/** Exportar los datos de una cuenta desde el panel (p. ej. para atender una solicitud de acceso). Auditado. */
export async function GET(_req: Request, { params }: { params: Promise<{ id: string }> }) {
  const admin = await adminFromRequest();
  if (!admin) return new Response('No encontrado', { status: 404 });
  const { id } = await params;
  const data = await exportUserData(id);
  if (!data) return new Response('Cuenta no encontrada.', { status: 404 });
  await audit(admin.id, 'exportar_datos', id);
  return new Response(JSON.stringify(data, null, 2), {
    headers: {
      'Content-Type': 'application/json; charset=utf-8',
      'Content-Disposition': `attachment; filename="${exportFileName().replace('mis-datos', id.slice(0, 8))}"`,
      'Cache-Control': 'no-store',
    },
  });
}
