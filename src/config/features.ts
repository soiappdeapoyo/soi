/**
 * Interruptores de lanzamiento. Ocultan accesos en la interfaz sin borrar el código (se sigue desarrollando).
 */

/**
 * Cuentas de creador (activar la cuenta, panel profesional, enlaces del perfil). Apagado para el lanzamiento:
 * sin enlaces visibles y /creadores redirige a /yo, salvo para administradores (ADMIN_EMAILS), que lo siguen
 * viendo por la URL. Los perfiles públicos de creadores existentes y sus Moments siguen visibles.
 */
export const CREATOR_ACCOUNTS_ENABLED = false;
