import { redirect } from 'next/navigation';

/** Las rutinas ahora son Moments oficiales (tipo Diarios). */
export default function RutinasRedirect() {
  redirect('/impulso/explorar?tipo=daily');
}
