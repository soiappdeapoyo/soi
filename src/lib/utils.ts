import { clsx, type ClassValue } from 'clsx';
import { twMerge } from 'tailwind-merge';

export function cn(...inputs: ClassValue[]) {
  return twMerge(clsx(inputs));
}

export function todayISO(timeZone = 'America/Mexico_City') {
  return new Intl.DateTimeFormat('en-CA', { timeZone, year: 'numeric', month: '2-digit', day: '2-digit' }).format(new Date());
}

/** Fecha local (YYYY-MM-DD) de un instante en la zona horaria de la persona (no en UTC). */
export function dateInTz(at: Date | number | string, timeZone = 'America/Mexico_City') {
  const d = at instanceof Date ? at : new Date(at);
  try {
    return new Intl.DateTimeFormat('en-CA', { timeZone, year: 'numeric', month: '2-digit', day: '2-digit' }).format(d);
  } catch {
    return d.toISOString().slice(0, 10);
  }
}

/** Instante (ISO) en que empezó "hoy" en la zona horaria de la persona: su medianoche local. */
export function startOfTodayISO(timeZone = 'America/Mexico_City', now = new Date()) {
  try {
    const parts = new Intl.DateTimeFormat('en-US', { timeZone, hourCycle: 'h23', hour: 'numeric', minute: 'numeric', second: 'numeric' }).formatToParts(now);
    const n = (t: string) => Number(parts.find((p) => p.type === t)?.value ?? 0);
    return new Date(now.getTime() - ((n('hour') * 60 + n('minute')) * 60 + n('second')) * 1000 - now.getMilliseconds()).toISOString();
  } catch {
    const d = new Date(now); d.setUTCHours(0, 0, 0, 0); return d.toISOString();
  }
}

/** Hora local (0–23) en la zona horaria de la persona. */
export function hourInTz(timeZone = 'America/Mexico_City', now = new Date()) {
  try {
    return Number(new Intl.DateTimeFormat('en-US', { hour: 'numeric', hourCycle: 'h23', timeZone }).format(now));
  } catch {
    return now.getHours();
  }
}

export function appUrl(path = '') {
  return `${baseUrl()}${path}`;
}

// Sin APP_URL, en Vercel se usa su dominio (producción o la vista previa) en vez de localhost.
function baseUrl() {
  const explicit = process.env.APP_URL?.trim().replace(/\/$/, '');
  if (explicit && !(process.env.VERCEL && explicit.includes('localhost'))) return explicit;
  const vercelHost = process.env.VERCEL_ENV === 'production'
    ? process.env.VERCEL_PROJECT_PRODUCTION_URL ?? process.env.VERCEL_URL
    : process.env.VERCEL_URL;
  return vercelHost ? `https://${vercelHost}` : 'http://localhost:3000';
}
