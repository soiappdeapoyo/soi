/**
 * Interruptores de lanzamiento. Ocultan accesos en la interfaz sin borrar el código (se sigue desarrollando).
 */

/**
 * Cuentas de creador (activar la cuenta, panel profesional, enlaces del perfil). Apagado para el lanzamiento:
 * sin enlaces visibles y /creadores redirige a /yo, salvo para administradores (ADMIN_EMAILS), que lo siguen
 * viendo por la URL. Los perfiles públicos de creadores existentes y sus Moments siguen visibles.
 */
export const CREATOR_ACCOUNTS_ENABLED = false;

/**
 * Dictado por micrófono en el chat (reconocimiento de voz del navegador). Apagado para el lanzamiento: falla en
 * iPhone y en la PWA, se corta con el silencio y no pone puntuación. Después del lanzamiento: transcripción con
 * Whisper (Groq) y vista previa en vivo donde el navegador lo soporte.
 */
export const DICTATION_ENABLED = false;
