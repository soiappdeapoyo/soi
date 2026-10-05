'use client';

import { useState } from 'react';
import { Pause, Volume2 } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { unlockAudio } from '@/lib/voice/player';
import type { VoiceStyle } from '@/config/voices';

/** Escuchar un recurso con la voz guía (serena). */
export function ListenButton({ text, style = 'calm', label = 'Escuchar' }: { text: string; style?: VoiceStyle; label?: string }) {
  const [playing, setPlaying] = useState(false);
  async function toggle() {
    if (playing) {
      const { stopSpeaking } = await import('@/lib/voice/tts');
      stopSpeaking(); setPlaying(false); return;
    }
    unlockAudio();
    setPlaying(true);
    const { speak } = await import('@/lib/voice/tts');
    await speak(text, { style });
    setPlaying(false);
  }
  return (
    <Button size="sm" onClick={toggle} aria-pressed={playing}>
      {playing ? <Pause className="h-4 w-4" aria-hidden="true" /> : <Volume2 className="h-4 w-4" aria-hidden="true" />} {playing ? 'Pausar' : label}
    </Button>
  );
}
