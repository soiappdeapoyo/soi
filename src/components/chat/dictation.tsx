'use client';

import { useEffect, useRef, useState } from 'react';
import { Mic } from 'lucide-react';
import { cn } from '@/lib/utils';

type Recognition = {
  lang: string; continuous: boolean; interimResults: boolean;
  start: () => void; stop: () => void;
  onresult: ((e: { resultIndex: number; results: ArrayLike<{ 0: { transcript: string }; isFinal: boolean }> }) => void) | null;
  onend: (() => void) | null; onerror: (() => void) | null;
};
type RecognitionCtor = new () => Recognition;

function recognitionCtor(): RecognitionCtor | null {
  if (typeof window === 'undefined') return null;
  const w = window as unknown as { SpeechRecognition?: RecognitionCtor; webkitSpeechRecognition?: RecognitionCtor };
  return w.SpeechRecognition ?? w.webkitSpeechRecognition ?? null;
}

/**
 * Dictar en lugar de escribir: desahogarse hablando cuesta menos. Usa el reconocimiento de voz del navegador
 * (gratis; el audio no pasa por SOI). El texto aparece en el campo para revisarlo antes de enviar.
 * Si el navegador no lo soporta, el botón no se muestra.
 */
export function DictationButton({ value, onChange, disabled, onUsed }: {
  value: string; onChange: (text: string) => void; disabled?: boolean; onUsed?: () => void;
}) {
  const [supported, setSupported] = useState(false);
  const [listening, setListening] = useState(false);
  const rec = useRef<Recognition | null>(null);
  const base = useRef('');

  useEffect(() => { setSupported(Boolean(recognitionCtor())); }, []);
  useEffect(() => () => rec.current?.stop(), []);

  function toggle() {
    if (listening) { rec.current?.stop(); return; }
    const Ctor = recognitionCtor();
    if (!Ctor) return;
    const r = new Ctor();
    const nav = typeof navigator !== 'undefined' ? navigator.language : 'es-MX';
    r.lang = nav.toLowerCase().startsWith('es') ? nav : 'es-MX';
    r.continuous = true;
    r.interimResults = true;
    base.current = value ? `${value.trimEnd()} ` : '';
    let finalText = '';
    r.onresult = (e) => {
      let interim = '';
      for (let i = e.resultIndex; i < e.results.length; i++) {
        const res = e.results[i]!;
        if (res.isFinal) finalText += res[0].transcript;
        else interim += res[0].transcript;
      }
      onChange(`${base.current}${finalText}${interim}`.replace(/\s+/g, ' ').trimStart());
    };
    r.onend = () => { setListening(false); rec.current = null; };
    r.onerror = () => { setListening(false); rec.current = null; };
    rec.current = r;
    try { r.start(); setListening(true); onUsed?.(); } catch { setListening(false); }
  }

  if (!supported) return null;
  return (
    <button type="button" onClick={(e) => { e.stopPropagation(); toggle(); }} disabled={disabled}
      aria-pressed={listening} aria-label={listening ? 'Dejar de dictar' : 'Dictar'}
      className={cn('press relative flex h-10 w-10 shrink-0 items-center justify-center rounded-lg disabled:opacity-25',
        listening ? 'bg-soi-accent-soft text-soi-accent' : 'text-soi-muted hover:bg-black/[0.04] hover:text-soi-ink')}>
      {listening && <span aria-hidden="true" className="absolute inset-1 animate-thinking rounded-lg ring-2 ring-soi-accent/40" />}
      <Mic className="h-5 w-5" aria-hidden="true" />
    </button>
  );
}
