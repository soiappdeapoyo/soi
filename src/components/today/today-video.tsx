'use client';

import { useEffect, useState } from 'react';
import Link from 'next/link';
import { Lock } from 'lucide-react';
import { SoiPlayer, type SoiVideo } from '@/components/media/soi-player';
import type { MomentumState } from '@/lib/momentum';

/**
 * Video recomendado para el estado de hoy. Se pide en el cliente para no bloquear la página
 * con la API de YouTube; el skeleton respeta la forma final (sin saltos de layout).
 */
export function TodayVideo({ state }: { state: MomentumState }) {
  const [data, setData] = useState<{ locked: boolean; video: SoiVideo | null } | null>(null);

  useEffect(() => {
    let alive = true;
    fetch(`/api/today/video?state=${state}`).then((r) => r.json()).then((j) => { if (alive) setData(j); }).catch(() => alive && setData({ locked: false, video: null }));
    return () => { alive = false; };
  }, [state]);

  if (!data) return <div className="skeleton aspect-video w-full rounded-[14px]" aria-label="Buscando un video para ti" />;
  if (data.locked) {
    return (
      <p className="flex items-center gap-2 rounded-[14px] bg-soi-sidebar p-3 text-sm text-soi-muted">
        <Lock className="h-4 w-4" aria-hidden="true" /> Los videos dentro de SOI son parte de <Link href="/planes" className="underline underline-offset-4">SOI+</Link>.
      </p>
    );
  }
  if (!data.video) {
    return (
      <p className="rounded-[14px] bg-soi-sidebar p-3 text-sm text-soi-muted">
        Hoy no encontré un video. Prueba una afirmación corta con <Link href="/chat?agent=afirmacion" className="underline underline-offset-4">SOI</Link>.
      </p>
    );
  }
  return <SoiPlayer video={data.video} />;
}
