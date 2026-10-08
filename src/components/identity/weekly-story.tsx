'use client';

import { useEffect, useState } from 'react';

/** Retrato semanal de en quién te estás convirtiendo (lo escribe la IA una vez por semana con tus datos reales). */
export function WeeklyStory() {
  const [story, setStory] = useState<string | null | undefined>(undefined);
  useEffect(() => {
    let alive = true;
    fetch('/api/identities/story').then((r) => r.json()).then((j) => alive && setStory(j.story ?? null)).catch(() => alive && setStory(null));
    return () => { alive = false; };
  }, []);
  if (story === undefined) return <div className="skeleton h-28 rounded-[20px]" aria-label="Escribiendo en quién te estás convirtiendo" />;
  if (!story) return null;
  return (
    <article className="rounded-[20px] bg-soi-sidebar p-4">
      <p className="text-xs font-medium text-soi-muted">Quién estás siendo</p>
      <div className="mt-2 space-y-2">{story.split(/\n\s*\n/).map((p, i) => <p key={i} className="text-[15px] leading-relaxed">{p}</p>)}</div>
    </article>
  );
}
