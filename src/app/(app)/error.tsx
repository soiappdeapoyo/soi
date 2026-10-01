'use client';

import { Button } from '@/components/ui/button';

export default function AppError({ reset }: { error: Error; reset: () => void }) {
  return (
    <div className="mx-auto max-w-md p-8 text-center" role="alert">
      <h1 className="text-2xl font-bold">Algo no salió como esperábamos</h1>
      <p className="mt-2 text-black/70">Respira. Tu información está a salvo.</p>
      <Button className="mt-6" onClick={reset}>Intentar de nuevo</Button>
    </div>
  );
}
