import type { Metadata } from 'next';

export const metadata: Metadata = { title: 'Términos' };

export default function TerminosPage() {
  return (
    <main id="main" className="prose mx-auto max-w-2xl px-5 py-10">
      <h1>Términos de uso</h1>
      <p><em>Plantilla base — revisar con asesoría legal antes de producción.</em></p>
      <p>SOI es una herramienta de bienestar y desarrollo personal. <strong>No sustituye la atención psicológica, psiquiátrica ni médica profesional.</strong> Si estás en riesgo, contacta a una línea de ayuda de tu país.</p>
      <h2>Suscripción</h2>
      <p>SOI ofrece 7 días de prueba con todo desbloqueado, un plan Free limitado y SOI+ por suscripción mensual o anual, cancelable en cualquier momento. No existen pagos únicos.</p>
      <h2>Comunidad</h2>
      <p>No se permiten ventas, enlaces externos, consejos médicos, odio ni acoso. Moderamos automáticamente.</p>
    </main>
  );
}
