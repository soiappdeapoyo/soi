import { getSessionUser } from '@/lib/supabase/server';
import { getStripe } from '@/lib/billing/stripe';
import { appUrl } from '@/lib/utils';

/** Compra única de un Blueprint premium. El webhook registra la compra y la parte del creador. */
export async function POST(_req: Request, { params }: { params: Promise<{ id: string }> }) {
  const { id } = await params;
  const { supabase, user } = await getSessionUser();
  if (!user) return new Response('No autorizado', { status: 401 });

  const { data: bp } = await supabase.from('soi_blueprints')
    .select('id, title, objective, tier, price_cents, currency, status, creator_id').eq('id', id).maybeSingle();
  if (!bp || bp.status !== 'published' || bp.tier !== 'premium') return Response.json({ ok: false, message: 'No disponible.' }, { status: 404 });
  if (bp.creator_id === user.id) return Response.json({ ok: false, message: 'Es tu propio Blueprint.' }, { status: 400 });

  const { data: bought } = await supabase.from('blueprint_purchases').select('id').eq('blueprint_id', id).eq('user_id', user.id).maybeSingle();
  if (bought) return Response.json({ ok: true, url: appUrl(`/blueprints/${id}`) });

  const session = await getStripe().checkout.sessions.create({
    mode: 'payment',
    customer_email: user.email,
    line_items: [{
      quantity: 1,
      price_data: {
        currency: bp.currency as string,
        unit_amount: bp.price_cents as number,
        product_data: { name: `Blueprint SOI: ${bp.title as string}`, description: (bp.objective as string).slice(0, 300) },
      },
    }],
    client_reference_id: user.id,
    metadata: { kind: 'blueprint', user_id: user.id, blueprint_id: id },
    success_url: appUrl(`/blueprints/${id}?compra=ok`),
    cancel_url: appUrl(`/blueprints/${id}`),
    locale: 'es-419',
  });
  return Response.json({ ok: true, url: session.url });
}
