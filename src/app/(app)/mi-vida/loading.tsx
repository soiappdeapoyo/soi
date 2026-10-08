import { CardListSkeleton, TabsSkeleton } from '@/components/layout/skeletons';

export default function Loading() {
  return (
    <div className="mx-auto max-w-2xl px-4 pb-8 pt-6 sm:px-5 md:pt-8" aria-busy="true" aria-label="Cargando Mi Vida">
      <h1 className="text-3xl font-semibold tracking-tight">Mi Vida</h1>
      <p className="text-soi-muted">Todo lo que guardaste, a un toque de distancia.</p>
      <TabsSkeleton count={5} />
      <div className="pt-5"><CardListSkeleton rows={4} /></div>
    </div>
  );
}
