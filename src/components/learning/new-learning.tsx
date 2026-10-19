'use client';

import { useState, useTransition } from 'react';
import { useRouter } from 'next/navigation';
import { toast } from 'sonner';
import { track } from '@/components/providers/analytics';
import { LearningForm } from './learning-form';

/** Anotar lo aprendido de un libro, curso, podcast o documento (`/aprender`). */
export function NewLearning({ source }: { source?: string }) {
  const router = useRouter();
  const [, start] = useTransition();
  // Al guardar, el formulario vuelve a empezar vacío.
  const [round, setRound] = useState(0);
  return (
    <LearningForm
      key={round}
      initialSource={source}
      autoFocus={Boolean(source)}
      onSubmit={async (input) => {
        const res = await fetch('/api/learnings', { method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify(input) }).catch(() => null);
        const json = await res?.json().catch(() => null);
        if (!res?.ok) return json?.message ?? 'No se pudo guardar.';
        track('learning_saved', { kind: input.kind, with_action: Boolean(input.action) });
        toast(input.action ? 'Guardado. En 3 días te pregunto si funcionó.' : 'Guardado en lo que aprendes.');
        setRound((n) => n + 1);
        start(() => router.refresh());
        return null;
      }}
    />
  );
}
