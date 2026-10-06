'use client';

import { useEffect } from 'react';
import { track } from '@/components/providers/analytics';

/** Registra un evento una sola vez al aparecer (p. ej. una propuesta en el chat). Sin contenido de mensajes. */
export function TrackOnce({ event, props }: { event: string; props?: Record<string, unknown> }) {
  useEffect(() => { track(event, props); }, []); // eslint-disable-line react-hooks/exhaustive-deps
  return null;
}
