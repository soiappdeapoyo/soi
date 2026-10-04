import { redirect } from 'next/navigation';

/** Los Blueprints ahora son SOI Moments. */
export default async function BlueprintRedirect({ params, searchParams }: { params: Promise<{ id: string }>; searchParams: Promise<{ compra?: string }> }) {
  const [{ id }, { compra }] = await Promise.all([params, searchParams]);
  redirect(`/m/${id}${compra ? `?compra=${compra}` : ''}`);
}
