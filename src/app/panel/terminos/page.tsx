import { requireAdmin } from '@/lib/admin/auth';
import { LEGAL_KINDS, latestLegal, type LegalKind } from '@/lib/legal';
import { LegalForm } from '@/components/admin/legal-form';

export default async function PanelLegal() {
  await requireAdmin();
  const kinds = Object.keys(LEGAL_KINDS) as LegalKind[];
  const docs = await Promise.all(kinds.map((k) => latestLegal(k)));
  return (
    <>
      <h1 className="text-2xl font-semibold">Términos</h1>
      <p className="mb-5 mt-1 text-sm text-soi-muted">
        Sube el documento, revísalo y publícalo. Cada publicación es una versión nueva (las anteriores se conservan) y queda en la auditoría.
      </p>
      <div className="flex flex-col gap-6">
        {kinds.map((k, i) => (
          <LegalForm
            key={k} kind={k} title={LEGAL_KINDS[k].title} path={LEGAL_KINDS[k].path}
            current={docs[i] ?? null}
          />
        ))}
      </div>
    </>
  );
}
