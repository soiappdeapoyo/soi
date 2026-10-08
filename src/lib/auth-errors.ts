/**
 * Por qué falló un inicio de sesión (Google o enlace mágico), para mostrar un mensaje útil en /login.
 * Recibe el texto de error de Google o de Supabase (sin datos personales) y devuelve un motivo corto.
 */
export type AuthFailure = 'cancelled' | 'interrupted' | 'expired' | 'auth';

export function authFailureReason(raw: string): AuthFailure {
  const t = raw.toLowerCase();
  // Primero el vencimiento: un enlace mágico vencido llega como access_denied + otp_expired.
  if (/otp_expired|expired|already (been )?used/.test(t)) return 'expired';
  // PKCE: el inicio empezó en otra pestaña, otro navegador, o se tocó el botón dos veces.
  if (/code verifier|code_verifier|flow_state|flow state|pkce|bad_code_verifier/.test(t)) return 'interrupted';
  if (/access_denied|cancel|user denied/.test(t)) return 'cancelled';
  return 'auth';
}

export const AUTH_FAILURE_MESSAGE: Record<AuthFailure, string> = {
  cancelled: 'Se canceló el inicio con Google. Cuando quieras, vuelve a intentarlo.',
  interrupted: 'El inicio de sesión se interrumpió (pasa si se abrió en otra pestaña o en otro navegador, o si tocaste el botón dos veces). Inténtalo de nuevo desde aquí.',
  expired: 'El enlace ya venció o ya se usó. Pide uno nuevo o entra con Google.',
  auth: 'No pudimos iniciar sesión. Intenta de nuevo.',
};

export function authFailureMessage(code: string | null): string | null {
  if (!code) return null;
  return AUTH_FAILURE_MESSAGE[(code in AUTH_FAILURE_MESSAGE ? code : 'auth') as AuthFailure];
}
