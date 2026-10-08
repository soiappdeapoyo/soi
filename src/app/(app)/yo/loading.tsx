import { TabsSkeleton } from '@/components/layout/skeletons';

export default function Loading() {
  return (
    <div className="mx-auto max-w-2xl px-4 pb-8 pt-4 sm:px-5 md:pt-8" aria-busy="true" aria-label="Cargando tu perfil">
      <div className="h-10" />
      <div className="flex flex-col items-start gap-3">
        <div className="skeleton h-20 w-20 rounded-full" />
        <div className="skeleton h-6 w-40 rounded-md" />
        <div className="skeleton h-4 w-24 rounded" />
        <div className="skeleton h-4 w-full max-w-sm rounded" />
        <div className="flex gap-2"><div className="skeleton h-9 w-28 rounded-lg" /><div className="skeleton h-9 w-32 rounded-lg" /></div>
      </div>
      <TabsSkeleton count={4} />
      <div className="mt-5 flex flex-col gap-3">{[0, 1].map((i) => <div key={i} className="skeleton h-32 rounded-[20px]" />)}</div>
    </div>
  );
}
