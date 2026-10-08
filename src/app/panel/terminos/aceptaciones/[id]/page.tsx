import Link from 'next/link';
import { notFound } from 'next/navigation';
import ReactMarkdown from 'react-markdown';
import remarkGfm from 'remark-gfm';
import { requireAdmin, audit } from '@/lib/admin/auth';
import { acceptanceDetail, LEGAL_KINDS, type LegalKind } from '@/lib/legal';
import { PrintButton } from '@/components/admin/print-button';

const TZ = 'America/Mexico_City';
const local = (iso: string) => new Intl.DateTimeFormat('es-MX', { dateStyle: 'long', timeStyle: 'long', timeZone: TZ }).format(new Date(iso));

/** Constancia de aceptación imprimible: quién, cuándo, desde dónde, qué declaró y el texto de lo que aceptó. */
export default async function AcceptanceRecord({ params }: { params: Promise<{ id: string }> }) {
  const admin = await requireAdmin();
  const { id } = await params;
  const detail = await acceptanceDetail(id);
  if (!detail) notFound();
  const { row, docs } = detail;
  await audit(admin.id, 'ver_aceptacion', row.user_id, { aceptacion: row.id });

  const versions: { kind: LegalKind; doc: (typeof docs)[LegalKind] }[] = [
    { kind: 'terminos', doc: docs.terminos },
    { kind: 'privacidad', doc: docs.privacidad },
    { kind: 'privacidad_corto', doc: docs.privacidad_corto },
  ];
  const Field = ({ label, children }: { label: string; children: React.ReactNode }) => (
    <div className="grid grid-cols-[160px_1fr] gap-3 border-b border-black/[0.06] py-2 text-sm last:border-0 print:grid-cols-[140px_1fr]">
      <dt className="text-soi-muted">{label}</dt><dd className="break-words">{children}</dd>
    </div>
  );

  return (
    <div className="mx-auto max-w-3xl">
      <div className="mb-4 flex items-center justify-between print:hidden">
        <Link href="/panel/terminos#aceptaciones" className="text-sm text-soi-muted hover:underline">← Registro de aceptaciones</Link>
        <PrintButton />
      </div>

      <article className="rounded-[20px] bg-white p-6 shadow-ring print:rounded-none print:p-0 print:shadow-none">
        <header className="border-b border-black/10 pb-4">
          <p className="text-sm font-semibold">SOI.</p>
          <h1 className="mt-2 text-2xl font-semibold">Constancia de aceptación</h1>
          <p className="mt-1 text-sm text-soi-muted">Términos y condiciones, aviso de privacidad y declaración de mayoría de edad</p>
        </header>

        <dl className="mt-4">
          <Field label="Folio"><span className="font-mono text-xs">{row.id}</span></Field>
          <Field label="Nombre">{row.display_name ?? '—'}</Field>
          <Field label="Correo">{row.email ?? '—'}</Field>
          <Field label="ID de cuenta"><span className="font-mono text-xs">{row.user_id ?? 'Cuenta eliminada'}</span></Field>
          <Field label="Fecha y hora">{local(row.accepted_at)} <span className="text-soi-muted">· UTC {row.accepted_at}</span></Field>
          <Field label="Dirección IP">{row.ip ?? '—'}</Field>
          <Field label="Navegador">{row.user_agent ?? '—'}</Field>
        </dl>

        <section className="mt-6">
          <h2 className="font-semibold">Declaraciones aceptadas</h2>
          <p className="mt-1 text-xs text-soi-muted">Texto exacto que la persona marcó antes de tocar «Continuar».</p>
          <ul className="mt-2 flex flex-col gap-1.5 text-sm">
            {row.statements.map((s) => <li key={s}>☑ {s}</li>)}
          </ul>
        </section>

        <section className="mt-6">
          <h2 className="font-semibold">Versiones vigentes al aceptar</h2>
          <dl className="mt-2">
            {versions.map(({ kind, doc }) => (
              <Field key={kind} label={LEGAL_KINDS[kind].title}>
                {doc ? <>Publicada el {local(doc.created_at)}{doc.file_name ? ` · ${doc.file_name}` : ''} <span className="font-mono text-xs text-soi-muted">({doc.id})</span></> : 'Plantilla base (sin documento publicado)'}
              </Field>
            ))}
          </dl>
        </section>

        <p className="mt-6 text-xs text-soi-muted">
          Generada desde el panel de administración de SOI el {local(new Date().toISOString())}. El registro es inalterable: cada aceptación se guarda una sola vez y no se edita.
        </p>

        {versions.filter((v) => v.doc).map(({ kind, doc }) => (
          <section key={kind} className="mt-8 border-t border-black/10 pt-6 print:break-before-page">
            <p className="text-xs uppercase tracking-wide text-soi-muted">Anexo · texto aceptado</p>
            <h2 className="mt-1 text-lg font-semibold">{LEGAL_KINDS[kind].title}</h2>
            <div className="prose prose-sm mt-3 max-w-none">
              <ReactMarkdown remarkPlugins={[remarkGfm]}>{doc!.content}</ReactMarkdown>
            </div>
          </section>
        ))}
      </article>
    </div>
  );
}
