import { redirect } from 'next/navigation';
import { IMPULSO_ENABLED } from '@/config/features';

/** El feed vive ahora en Impulso y la biblioteca en Mi Vida. Se conservan /momentos/[id] y /momentos/nuevo. */
export default async function MomentosPage({ searchParams }: { searchParams: Promise<{ tab?: string }> }) {
  const { tab } = await searchParams;
  if (tab === 'biblioteca') redirect('/mi-vida');
  if (!IMPULSO_ENABLED) redirect('/mi-vida?tab=moments');
  redirect(tab === 'tendencias' ? '/impulso?tab=tendencias' : '/impulso');
}
