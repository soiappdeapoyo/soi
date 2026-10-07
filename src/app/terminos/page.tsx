import type { Metadata } from 'next';
import { latestLegal } from '@/lib/legal';
import { LegalPage } from '@/components/legal-page';

export const metadata: Metadata = { title: 'Términos' };
// Se regenera al publicar desde /panel → Términos (revalidatePath); cada hora como respaldo.
export const revalidate = 3600;

export default async function TerminosPage() {
  return (
    <LegalPage
      kind="terminos"
      doc={await latestLegal('terminos')}
      fallback={<>
      <h1>Términos de uso</h1>
      <p><em>Plantilla base — revisar con asesoría legal antes de producción.</em></p>
      <p>SOI es una herramienta de bienestar y desarrollo personal. <strong>No sustituye la atención psicológica, psiquiátrica ni médica profesional.</strong> Si estás en riesgo, contacta a una línea de ayuda de tu país.</p>
      <h2>Suscripción</h2>
      <p>SOI ofrece 7 días de prueba con todo desbloqueado, un plan Free limitado y SOI+ por suscripción mensual o anual, cancelable en cualquier momento. Los Moments premium que publican los creadores se compran con un pago único.</p>
      <h2>Comunidad</h2>
      <p>No se permiten ventas, enlaces externos, consejos médicos, odio ni acoso. Moderamos automáticamente.</p>
      </>}
    />
  );
}
