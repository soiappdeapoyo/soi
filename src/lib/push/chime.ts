'use client';

/**
 * Sonido de recordatorio con Web Audio (sin archivos): tres campanadas suaves, como una alarma calmada.
 * Los navegadores no permiten sonidos propios en las notificaciones del sistema; esto suena cuando SOI está
 * abierta. Si el navegador aún no permite audio (sin un toque previo), simplemente no suena.
 */
export const SOUND_KEY = 'soi:reminder-sound';

export function soundEnabled(): boolean {
  try { return localStorage.getItem(SOUND_KEY) !== 'off'; } catch { return true; }
}
export function setSoundEnabled(on: boolean) {
  try { localStorage.setItem(SOUND_KEY, on ? 'on' : 'off'); } catch { /* sin almacenamiento */ }
}

export async function playChime(times = 3) {
  try {
    const Ctx = window.AudioContext ?? (window as unknown as { webkitAudioContext?: typeof AudioContext }).webkitAudioContext;
    if (!Ctx) return;
    const ctx = new Ctx();
    if (ctx.state === 'suspended') await ctx.resume();
    const start = ctx.currentTime + 0.05;
    for (let i = 0; i < times; i++) {
      const t = start + i * 0.9;
      // Campana: fundamental + armónico, ataque corto y caída larga.
      for (const [freq, gain] of [[880, 0.22], [1320, 0.08]] as const) {
        const o = ctx.createOscillator();
        const g = ctx.createGain();
        o.type = 'sine';
        o.frequency.value = freq;
        g.gain.setValueAtTime(0.0001, t);
        g.gain.exponentialRampToValueAtTime(gain, t + 0.02);
        g.gain.exponentialRampToValueAtTime(0.0001, t + 0.85);
        o.connect(g).connect(ctx.destination);
        o.start(t);
        o.stop(t + 0.9);
      }
    }
    setTimeout(() => void ctx.close(), (times * 0.9 + 0.3) * 1000);
  } catch { /* sin audio */ }
}
