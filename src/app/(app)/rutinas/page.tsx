import { redirect } from 'next/navigation';
import { IMPULSO_ENABLED } from '@/config/features';

/** Las rutinas ahora son Moments oficiales (tipo Diarios). */
export default function RutinasRedirect() {
  redirect(IMPULSO_ENABLED ? '/impulso/explorar?tipo=daily' : '/mi-vida?tab=moments');
}
