import { requireImpulso } from '@/lib/impulso';

/** Parte de Impulso: oculto en el MVP salvo para administradores (`IMPULSO_ENABLED`). */
export default async function ImpulsoGate({ children }: { children: React.ReactNode }) {
  await requireImpulso();
  return children;
}
