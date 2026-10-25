/** Horas y fechas como en WhatsApp, en la hora del dispositivo. */

const sameDay = (a: Date, b: Date) => a.getFullYear() === b.getFullYear() && a.getMonth() === b.getMonth() && a.getDate() === b.getDate();

export function clockTime(iso: string) {
  return new Date(iso).toLocaleTimeString('es-MX', { hour: '2-digit', minute: '2-digit', hourCycle: 'h23' });
}

/** En la lista: hora si es de hoy, "Ayer", o la fecha corta. */
export function listTime(iso: string, now = new Date()) {
  const d = new Date(iso);
  if (sameDay(d, now)) return clockTime(iso);
  if (sameDay(d, new Date(now.getTime() - 86_400_000))) return 'Ayer';
  return d.toLocaleDateString('es-MX', { day: '2-digit', month: '2-digit', year: '2-digit' });
}

/** Separador de fecha dentro del chat. */
export function dayLabel(iso: string, now = new Date()) {
  const d = new Date(iso);
  if (sameDay(d, now)) return 'Hoy';
  if (sameDay(d, new Date(now.getTime() - 86_400_000))) return 'Ayer';
  return d.toLocaleDateString('es-MX', { weekday: 'long', day: 'numeric', month: 'long' });
}

export function dayKey(iso: string) {
  const d = new Date(iso);
  return `${d.getFullYear()}-${d.getMonth()}-${d.getDate()}`;
}
