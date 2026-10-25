/** Texto del consentimiento (sin dependencias de servidor: lo muestra el navegador y lo guarda la constancia). */

export type ConsentKind = 'soi' | 'persons';

/** Texto exacto de la casilla por app: se muestra y se guarda tal cual en la constancia. */
export const CONSENT_STATEMENTS: Record<ConsentKind, string> = {
  soi: 'Acepto los Términos y condiciones, leí el Aviso de privacidad, consiento el tratamiento de mis datos de bienestar y soy mayor de 18 años.',
  persons: 'Acepto los Términos y condiciones, leí el Aviso de privacidad, consiento el tratamiento de mis conversaciones de práctica y soy mayor de 18 años.',
};
