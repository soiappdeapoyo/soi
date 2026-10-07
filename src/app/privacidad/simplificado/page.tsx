import Link from 'next/link';
import { redirect } from 'next/navigation';
import type { Metadata } from 'next';
import { latestLegal } from '@/lib/legal';
import { LegalPage } from '@/components/legal-page';

export const metadata: Metadata = { title: 'Aviso de privacidad simplificado' };
// Se regenera al publicar desde /panel → Términos (revalidatePath); cada hora como respaldo.
export const revalidate = 3600;

export default async function PrivacidadSimplificadoPage() {
  const doc = await latestLegal('privacidad_corto');
  // Sin versión simplificada publicada, el aviso integral.
  if (!doc) redirect('/privacidad');
  return (
    <LegalPage
      kind="privacidad_corto"
      doc={doc}
      fallback={null}
      footer={<p>Consulta el <Link href="/privacidad">aviso de privacidad integral</Link>.</p>}
    />
  );
}
