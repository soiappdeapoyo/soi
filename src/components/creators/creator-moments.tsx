import { MomentGrid } from './moment-grid';
import type { CreatorLayer } from '@/lib/creators/profile';

/** Pestañas de trabajo del creador: Moments (o los de un destacado) y Retos, en cuadrícula. */
export function CreatorMoments({ creator, tab, highlight, empty }: { creator: CreatorLayer; tab: string; highlight?: string | null; empty?: React.ReactNode }) {
  const h = tab === 'moments' && highlight ? creator.highlights.find((x) => x.id === highlight) : null;
  const list = tab === 'retos' ? creator.moments.filter((m) => m.kind === 'challenge') : h ? h.moments : creator.moments;
  return (
    <>
      {h && <p className="mb-2 px-1 text-sm text-soi-muted">Destacado: <span className="font-medium text-soi-ink">{h.title}</span></p>}
      <MomentGrid moments={list} empty={empty ?? <p className="py-10 text-center text-sm text-soi-muted">{tab === 'retos' ? 'Aún no hay retos.' : 'Aún no publica Moments.'}</p>} />
    </>
  );
}
