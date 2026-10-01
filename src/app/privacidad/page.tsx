import type { Metadata } from 'next';

export const metadata: Metadata = { title: 'Privacidad' };

export default function PrivacidadPage() {
  return (
    <main id="main" className="prose mx-auto max-w-2xl px-5 py-10">
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
    </main>
  );
}
