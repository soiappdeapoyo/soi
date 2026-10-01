export const CRISIS_RESOURCES: Record<string, { name: string; phone: string }[]> = {
  MX: [{ name: 'Línea de la Vida', phone: '800 911 2000' }],
  AR: [{ name: 'Centro de Asistencia al Suicida', phone: '135' }],
  CO: [{ name: 'Línea 106', phone: '106' }],
  CL: [{ name: 'Salud Responde', phone: '600 360 7777' }],
  PE: [{ name: 'Línea 113 opción 5', phone: '113' }],
  ES: [{ name: 'Teléfono de la Esperanza', phone: '717 003 717' }],
  US: [{ name: '988 Suicide & Crisis Lifeline', phone: '988' }],
};

export const SUPPORTED_COUNTRIES = Object.keys(CRISIS_RESOURCES);

export function getCrisisResources(country?: string | null) {
  return CRISIS_RESOURCES[(country ?? 'MX').toUpperCase()] ?? CRISIS_RESOURCES.MX!;
}
