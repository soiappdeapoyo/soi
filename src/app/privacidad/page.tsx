import type { Metadata } from 'next';
import { latestLegal } from '@/lib/legal';
import { LegalPage } from '@/components/legal-page';

export const metadata: Metadata = { title: 'Privacidad' };
// Se regenera al publicar desde /panel → Términos (revalidatePath); cada hora como respaldo.
export const revalidate = 3600;

export default async function PrivacidadPage() {
  return (
    <LegalPage
      kind="privacidad"
      doc={await latestLegal('privacidad')}
      fallback={<>
      <h1>Política de privacidad</h1>
      <p><em>Plantilla base — revisar con asesoría legal antes de producción.</em></p>
      <h2>Qué guardamos</h2>
      <p>Tu perfil, conversaciones, rutinas, evidencias y publicaciones de comunidad, para personalizar tu experiencia. Cada registro está protegido con seguridad a nivel de fila: solo tú puedes verlo.</p>
      <h2>IA</h2>
      <p>Tus mensajes se procesan con proveedores de IA (Google Gemini, Groq, DeepSeek) únicamente para generar respuestas.</p>
      <h2>Analítica</h2>
      <p>Medimos eventos de uso anónimos; nunca enviamos el contenido de tus mensajes a herramientas de analítica.</p>
      <h2>Tus derechos</h2>
      <p>Puedes solicitar la exportación o eliminación de tus datos en cualquier momento.</p>
      </>}
    />
  );
}
