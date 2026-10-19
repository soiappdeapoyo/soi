import { redirect } from 'next/navigation';
import type { Metadata } from 'next';
import { getSessionUser } from '@/lib/supabase/server';
import { getProfile } from '@/lib/billing/check-access';
import { loadLifeMap } from '@/lib/life-map-server';
import { buildMapView, type AreaScores } from '@/lib/life-map';
import { buildSnapshot, loadChapterDue, loadChapters } from '@/lib/chapters-server';
import { snapshotLines } from '@/lib/chapters';
import { ChapterReview } from '@/components/map/chapter-review';

export const metadata: Metadata = { title: 'Cierra tu capítulo' };

const fmt = (d: string) => new Intl.DateTimeFormat('es-MX', { day: 'numeric', month: 'long', year: 'numeric', timeZone: 'UTC' }).format(new Date(`${d}T12:00:00Z`));

/** Cerrar el capítulo que toca (90 días o el año). Si no toca ninguno, de vuelta a Mi mapa. */
export default async function ChapterPage() {
  const { supabase, user } = await getSessionUser();
  if (!user) redirect('/login?next=/mapa/capitulo');
  const profile = await getProfile(user.id);
  const tz = profile?.timezone ?? 'America/Mexico_City';
  const [{ due }, { map, assessments }, chapters] = await Promise.all([
    loadChapterDue(supabase, user.id, tz), loadLifeMap(supabase, user.id), loadChapters(supabase, user.id),
  ]);
  if (!due) redirect('/mi-vida?tab=mapa');
  const view = buildMapView(map, assessments);
  const previous: AreaScores = Object.fromEntries(view.areas.filter((a) => a.current !== null).map((a) => [a.area.id, a.current]));
  const snap = await buildSnapshot(supabase, user.id, due, previous, tz);
  // Al cerrar el año: la carta que se escribió hace un año o, la primera vez, la visión con la que empezó.
  const lastYear = chapters.find((c) => c.kind === 'anual' && c.letter);
  const pastLetter = lastYear?.letter ? { text: lastYear.letter, label: 'Lo que te escribiste hace un año' }
    : map?.vision ? { text: map.vision, label: 'Cuando empezaste, escribiste que querías ser alguien que…' } : null;

  return (
    <div className="mx-auto max-w-xl px-5 pt-4 md:pt-10">
      <ChapterReview kind={due.kind} periodStart={due.period_start} periodEnd={due.period_end} range={`Del ${fmt(due.period_start)} al ${fmt(due.period_end)}`}
        lines={snapshotLines(snap)} previous={previous} start={(snap.scores_start ?? {}) as AreaScores} prevFocus={map?.focus_areas ?? []}
        prevVision={map?.vision ?? null} pastLetter={pastLetter} />
    </div>
  );
}
