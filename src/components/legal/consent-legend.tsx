import Link from 'next/link';

const linkClass = 'underline underline-offset-2';

/**
 * Leyenda del consentimiento junto al botón que se toca (el texto exacto vive en `CONSENT_STATEMENTS`).
 * Los documentos abren en otra pestaña para no perder el inicio de sesión.
 */
export function ConsentLegend({ action = 'Al continuar con Google', className = '' }: { action?: string; className?: string }) {
  return (
    <p className={`text-center text-xs leading-5 text-soi-muted ${className}`}>
      {action}, aceptas los <Link href="/terminos" target="_blank" className={linkClass}>Términos y condiciones</Link>,
      declaras que leíste el <Link href="/privacidad" target="_blank" className={linkClass}>Aviso de privacidad</Link> y
      que eres mayor de 18 años.
    </p>
  );
}
