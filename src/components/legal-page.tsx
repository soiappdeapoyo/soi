import ReactMarkdown from 'react-markdown';
import remarkGfm from 'remark-gfm';
import { LEGAL_KINDS, splitTitle, type LegalDoc } from '@/lib/legal';

/** Documento legal publicado desde /panel → Términos; sin publicar, la plantilla base (`fallback`). */
export function LegalPage({ doc, kind, fallback }: { doc: LegalDoc | null; kind: LegalDoc['kind']; fallback: React.ReactNode }) {
  if (!doc) return <main id="main" className="prose mx-auto max-w-2xl px-5 py-10">{fallback}</main>;
  const { title, body } = splitTitle(doc.content);
  const updated = new Date(doc.createdAt).toLocaleDateString('es-MX', { dateStyle: 'long', timeZone: 'America/Mexico_City' });
  return (
    <main id="main" className="prose mx-auto max-w-2xl px-5 py-10">
      <h1>{title ?? LEGAL_KINDS[kind].title}</h1>
      <p className="text-sm text-soi-muted">Última actualización: {updated}</p>
      <ReactMarkdown remarkPlugins={[remarkGfm]}>{body}</ReactMarkdown>
    </main>
  );
}
