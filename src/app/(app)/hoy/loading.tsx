import { CardListSkeleton } from '@/components/layout/skeletons';

export default function Loading() {
  return (
    <div className="mx-auto flex max-w-xl flex-col gap-5 px-5 py-6 md:py-10" aria-busy="true" aria-label="Cargando Hoy">
      <div className="flex flex-col gap-2">
        <div className="skeleton h-4 w-32 rounded" />
        <div className="skeleton h-8 w-56 rounded-md" />
        <div className="skeleton h-4 w-64 rounded" />
      </div>
      <div className="skeleton h-5 w-60 rounded" />
      <div className="skeleton h-56 rounded-[20px]" />
      <CardListSkeleton rows={3} />
    </div>
  );
}
