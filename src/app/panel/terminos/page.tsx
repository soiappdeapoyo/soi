import { requireAdmin } from '@/lib/admin/auth';
import { LEGAL_KINDS, latestLegal, listAcceptances, type LegalKind } from '@/lib/legal';
import { LegalForm } from '@/components/admin/legal-form';
import { AcceptancesList } from '@/components/admin/acceptances-list';
import { Input } from '@/components/ui/input';
import { Button } from '@/components/ui/button';

export default async function PanelLegal({ searchParams }: { searchParams: Promise<{ q?: string }> }) {
  await requireAdmin();
  const q = (await searchParams).q ?? '';
  const kinds = Object.keys(LEGAL_KINDS) as LegalKind[];
  const [docs, acceptances] = await Promise.all([
    Promise.all(kinds.map((k) => latestLegal(k))),
    listAcceptances({ q }),
  ]);
  return (
    <>
      <h1 className="text-2xl font-semibold">Términos</h1>
      <p className="mb-5 mt-1 text-sm text-soi-muted">
        Sube el documento, revísalo y publícalo. Cada publicación es una versión nueva (las anteriores se conservan) y queda en la auditoría.
        Publicar una versión nueva de los términos o del aviso de privacidad vuelve a pedir la aceptación a todas las personas.
      </p>
      <div className="flex flex-col gap-6">
        {kinds.map((k, i) => (
          <LegalForm key={k} kind={k} title={LEGAL_KINDS[k].title} path={LEGAL_KINDS[k].path} current={docs[i] ?? null} />
        ))}

        <section id="aceptaciones" className="rounded-[20px] bg-white p-5 shadow-ring">
          <h2 className="font-semibold">Registro de aceptaciones</h2>
          <p className="mt-1 text-sm text-soi-muted">Cada vez que alguien acepta los términos y declara ser mayor de 18 años. Abre la constancia para imprimirla o guardarla en PDF.</p>
          <form className="mt-4 flex gap-2" action="/panel/terminos#aceptaciones">
            <Input name="q" defaultValue={q} placeholder="Buscar por correo, nombre o ID de cuenta" aria-label="Buscar aceptaciones" />
            <Button type="submit" variant="outline">Buscar</Button>
          </form>
          <div className="mt-4">
            {acceptances.error
              ? <p className="text-sm text-soi-muted">No se pudo leer el registro ({acceptances.error}). ¿Ya se aplicó la migración 0027?</p>
              : <AcceptancesList rows={acceptances.rows} />}
          </div>
        </section>
      </div>
    </>
  );
}
