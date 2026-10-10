'use client';

/**
 * Plataforma para instalar SOI y recibir avisos. No existe la instalación automática: Android/Chrome la ofrecen
 * con un toque (beforeinstallprompt) y en iPhone se hace desde Compartir → «Agregar a inicio». En iPhone los
 * avisos push solo funcionan con SOI instalada (iOS 16.4+).
 */

type InstallEvent = Event & { prompt: () => Promise<void>; userChoice: Promise<{ outcome: 'accepted' | 'dismissed' }> };

let deferred: InstallEvent | null = null;
const listeners = new Set<() => void>();
const emit = () => listeners.forEach((l) => l());

if (typeof window !== 'undefined') {
  // El navegador ofrece la instalación una sola vez y temprano: se guarda para usarla cuando tenga sentido.
  window.addEventListener('beforeinstallprompt', (e) => { e.preventDefault(); deferred = e as InstallEvent; emit(); });
  window.addEventListener('appinstalled', () => { deferred = null; emit(); });
}

export const subscribeInstall = (l: () => void) => { listeners.add(l); return () => listeners.delete(l); };
export const canPromptInstall = () => deferred !== null;

/** Muestra el diálogo del sistema para instalar. true si la persona aceptó. */
export async function promptInstall(): Promise<boolean> {
  if (!deferred) return false;
  const e = deferred;
  deferred = null;
  emit();
  await e.prompt();
  return (await e.userChoice).outcome === 'accepted';
}

export function isStandalone(): boolean {
  if (typeof window === 'undefined') return false;
  return window.matchMedia('(display-mode: standalone)').matches || (navigator as Navigator & { standalone?: boolean }).standalone === true;
}

export function isIOS(): boolean {
  if (typeof navigator === 'undefined') return false;
  // iPadOS se presenta como Mac con pantalla táctil.
  return /iphone|ipad|ipod/i.test(navigator.userAgent) || (navigator.platform === 'MacIntel' && navigator.maxTouchPoints > 1);
}

export const pushSupported = () => typeof window !== 'undefined' && 'serviceWorker' in navigator && 'PushManager' in window && 'Notification' in window;
