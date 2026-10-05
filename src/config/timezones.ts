/**
 * Zonas horarias por país (IANA). La primera es la principal del país.
 * Las ciudades orientan a la persona (Morelia y la CDMX comparten America/Mexico_City).
 */
export const COUNTRY_TIMEZONES: Record<string, { tz: string; label: string }[]> = {
  MX: [
    { tz: 'America/Mexico_City', label: 'Centro (CDMX, Morelia, Guadalajara, Monterrey)' },
    { tz: 'America/Cancun', label: 'Sureste (Quintana Roo)' },
    { tz: 'America/Mazatlan', label: 'Pacífico (Sinaloa, Nayarit, BCS)' },
    { tz: 'America/Hermosillo', label: 'Sonora' },
    { tz: 'America/Chihuahua', label: 'Chihuahua' },
    { tz: 'America/Tijuana', label: 'Noroeste (Baja California)' },
  ],
  CO: [{ tz: 'America/Bogota', label: 'Colombia' }],
  AR: [{ tz: 'America/Argentina/Buenos_Aires', label: 'Argentina' }],
  CL: [{ tz: 'America/Santiago', label: 'Chile continental' }, { tz: 'Pacific/Easter', label: 'Isla de Pascua' }],
  PE: [{ tz: 'America/Lima', label: 'Perú' }],
  ES: [{ tz: 'Europe/Madrid', label: 'Península y Baleares' }, { tz: 'Atlantic/Canary', label: 'Canarias' }],
  US: [
    { tz: 'America/New_York', label: 'Este (Nueva York, Miami)' },
    { tz: 'America/Chicago', label: 'Centro (Chicago, Houston)' },
    { tz: 'America/Denver', label: 'Montaña (Denver)' },
    { tz: 'America/Phoenix', label: 'Arizona' },
    { tz: 'America/Los_Angeles', label: 'Pacífico (Los Ángeles)' },
    { tz: 'America/Puerto_Rico', label: 'Puerto Rico' },
  ],
};

export function defaultTimezone(country: string | null | undefined) {
  return COUNTRY_TIMEZONES[country ?? 'MX']?.[0]?.tz ?? 'America/Mexico_City';
}

/** ¿Es una zona IANA válida en este entorno? */
export function isValidTimezone(tz: string) {
  try { new Intl.DateTimeFormat('en-US', { timeZone: tz }); return true; } catch { return false; }
}
