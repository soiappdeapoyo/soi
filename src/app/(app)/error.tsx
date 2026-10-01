'use client';

import { Button } from '@/components/ui/button';

export default function AppError({ reset }: { error: Error; reset: () => void }) {
  return (
    <div className="mx-auto max-w-md animate-enter p-8 text-center" role="alert">
      <h1 className="text-2xl font-semibold">Algo no salió como esperábamos</h1>
      <p className="mt-2 text-soi-muted">Respira. Tu información está a salvo.</p>
      <Button className="mt-6" onClick={reset}>Intentar de nuevo</Button>
    </div>
  );
}
