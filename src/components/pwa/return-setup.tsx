'use client';

import { useEffect, useState, useSyncExternalStore } from 'react';
import { toast } from 'sonner';
import { Bell, BellOff, Check, Download, PlusSquare, Share, Volume2, VolumeX } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Dialog } from '@/components/ui/dialog';
import { track } from '@/components/providers/analytics';
import { canPromptInstall, isIOS, isStandalone, promptInstall, subscribeInstall } from '@/lib/pwa/platform';
import { ENABLE_MESSAGE, disablePush, enablePush, pushAvailability, saveReminderTime } from '@/lib/push/client';
import { playChime, setSoundEnabled, soundEnabled } from '@/lib/push/chime';
import { DEFAULT_REMINDER_TIME } from '@/lib/reminders';
import { cn } from '@/lib/utils';

const DISMISS_KEY = 'soi:return-setup-dismissed';
const DISMISS_MS = 7 * 86_400_000;

type Props = {
  /** El servidor ya tiene una suscripción de avisos para esta persona. */
  pushOn: boolean;
  reminderTime: string | null;
  /** card: invitación que se oculta sola cuando ya está todo listo (Hoy, final del Moment). settings: Ajustes. */
  variant?: 'card' | 'settings';
  where: string;
};

/**
 * "Ten SOI a un toque": 1) agrégala a tu pantalla de inicio, 2) elige a qué hora te aviso. La instalación nunca es
 * automática (los navegadores no lo permiten): Android la ofrece con un toque y en iPhone se explica cómo. En iPhone
 * los avisos solo existen con SOI instalada, por eso el orden.
 */
export function ReturnSetup({ pushOn, reminderTime, variant = 'card', where }: Props) {
  const [ready, setReady] = useState(false);
  const [standalone, setStandalone] = useState(false);
  const [ios, setIos] = useState(false);
  const [dismissed, setDismissed] = useState(false);
  const [on, setOn] = useState(pushOn);
  const [granted, setGranted] = useState(false);
  const [time, setTime] = useState(reminderTime ?? DEFAULT_REMINDER_TIME);
  const [busy, setBusy] = useState(false);
  const [howTo, setHowTo] = useState(false);
  const [sound, setSound] = useState(true);
  const canInstall = useSyncExternalStore(subscribeInstall, canPromptInstall, () => false);

  useEffect(() => {
    setStandalone(isStandalone());
    setIos(isIOS());
    setGranted(typeof Notification !== 'undefined' && Notification.permission === 'granted');
    setSound(soundEnabled());
    try { setDismissed(Date.now() - Number(localStorage.getItem(DISMISS_KEY) ?? 0) < DISMISS_MS); } catch { /* sin almacenamiento */ }
    setReady(true);
  }, []);

  if (!ready) return null;
  const notifyOn = on && granted;
  const installable = !standalone && (canInstall || ios);
  const avail = pushAvailability();
  // En la tarjeta: nada que ofrecer (ya instalada o no se puede, y los avisos listos o imposibles) → no se muestra.
  if (variant === 'card' && (dismissed || ((!installable) && (notifyOn || avail === 'unsupported')))) return null;

  async function install() {
    if (canInstall) {
      track('pwa_install_prompt', { where });
      const ok = await promptInstall();
      track(ok ? 'pwa_installed' : 'pwa_install_dismissed', { where });
      if (ok) toast('Listo: SOI está en tu pantalla de inicio');
      return;
    }
    setHowTo(true);
    track('pwa_install_howto', { where });
  }

  async function notify() {
    setBusy(true);
    const r = await enablePush(time);
    setBusy(false);
    track(r === 'ok' ? 'push_enabled' : 'push_not_enabled', { where, result: r, time });
    if (r !== 'ok') { toast(ENABLE_MESSAGE[r]); return; }
    setOn(true);
    setGranted(true);
    toast(`Te aviso todos los días a las ${time}`);
  }

  async function changeTime(t: string) {
    setTime(t);
    if (notifyOn && /^\d{2}:\d{2}$/.test(t)) await saveReminderTime(t);
  }

  async function turnOff() {
    setBusy(true);
    await disablePush();
    setBusy(false);
    setOn(false);
    track('push_disabled', { where });
  }

  function dismiss() {
    try { localStorage.setItem(DISMISS_KEY, String(Date.now())); } catch { /* sin almacenamiento */ }
    setDismissed(true);
    track('return_setup_dismissed', { where });
  }

  const step = (n: number, done: boolean, label: string, body: React.ReactNode) => (
    <li className="flex gap-3">
      <span className={cn('nums mt-0.5 flex h-6 w-6 shrink-0 items-center justify-center rounded-full text-xs', done ? 'bg-soi-accent-soft text-soi-accent' : 'bg-soi-tray text-soi-muted')}>
        {done ? <Check className="h-3.5 w-3.5" aria-label="Hecho" /> : n}
      </span>
      <div className="min-w-0 flex-1">
        <p className={cn('text-[15px] font-medium', done && 'text-soi-muted')}>{label}</p>
        {body}
      </div>
    </li>
  );

  const installDone = standalone;
  const showInstall = installable || installDone;

  return (
    <section aria-labelledby={`rs-${where}`} className={cn(variant === 'card' ? 'rounded-[20px] bg-soi-sidebar p-1.5' : '')}>
      <div className={cn(variant === 'card' ? 'rounded-[14px] bg-white p-4 shadow-ring' : '')}>
        <h2 id={`rs-${where}`} className={cn('font-semibold', variant === 'card' ? 'text-[17px]' : 'text-lg')}>
          {variant === 'card' ? 'Ten SOI a un toque' : 'Recordatorios y app'}
        </h2>
        <p className="mt-0.5 text-sm text-soi-muted">Agrégala a tu pantalla de inicio y SOI te avisa a la hora que elijas para volver.</p>
        <ol className="mt-4 flex flex-col gap-4">
          {showInstall && step(1, installDone, installDone ? 'SOI está en tu pantalla de inicio' : 'Agrégala a tu pantalla de inicio',
            installDone ? null : (
              <Button size="sm" variant="outline" className="mt-2" onClick={install}>
                {canInstall ? <><Download className="h-4 w-4" aria-hidden="true" /> Agregar a mi inicio</> : <><PlusSquare className="h-4 w-4" aria-hidden="true" /> Cómo agregarla</>}
              </Button>
            ))}
          {step(showInstall ? 2 : 1, notifyOn, notifyOn ? `Te aviso todos los días a las ${time}` : 'Elige a qué hora te aviso', (
            avail === 'needs-install' && !notifyOn
              ? <p className="mt-1 text-sm text-soi-muted">En iPhone se activa al abrir SOI desde tu pantalla de inicio.</p>
              : avail === 'unsupported' && !notifyOn
                ? <p className="mt-1 text-sm text-soi-muted">Este navegador no permite avisos.</p>
                : (
                  <div className="mt-2 flex flex-wrap items-center gap-2">
                    <label className="sr-only" htmlFor={`rt-${where}`}>Hora del recordatorio</label>
                    <input id={`rt-${where}`} type="time" value={time} onChange={(e) => void changeTime(e.target.value)}
                      className="nums h-9 rounded-lg bg-soi-sidebar px-2 text-sm text-soi-ink shadow-ring" />
                    {notifyOn ? (
                      variant === 'settings' && <Button size="sm" variant="ghost" onClick={turnOff} disabled={busy}><BellOff className="h-4 w-4" aria-hidden="true" /> Desactivar</Button>
                    ) : (
                      <Button size="sm" onClick={notify} disabled={busy}><Bell className="h-4 w-4" aria-hidden="true" /> {busy ? 'Activando…' : 'Avísame'}</Button>
                    )}
                  </div>
                )
          ))}
        </ol>
        {variant === 'settings' && (
          <div className="mt-4 flex flex-wrap items-center gap-2 border-t border-black/5 pt-4">
            <Button size="sm" variant="outline" onClick={() => { const v = !sound; setSound(v); setSoundEnabled(v); if (v) void playChime(1); }} aria-pressed={sound}>
              {sound ? <Volume2 className="h-4 w-4" aria-hidden="true" /> : <VolumeX className="h-4 w-4" aria-hidden="true" />} Sonido de alarma: {sound ? 'activado' : 'apagado'}
            </Button>
            <Button size="sm" variant="ghost" onClick={() => void playChime()}>Probar sonido</Button>
            <p className="w-full text-xs text-soi-muted">El sonido suena con SOI abierta. Con SOI cerrada, el aviso usa el sonido y la vibración de tu teléfono; los de tus Moments se quedan en pantalla hasta que los tocas.</p>
          </div>
        )}
        {variant === 'card' && <button type="button" onClick={dismiss} className="press mt-3 text-sm text-soi-muted">Ahora no</button>}
      </div>

      <Dialog open={howTo} onOpenChange={setHowTo} title="Agrega SOI a tu inicio" description="En iPhone se hace desde Safari, en tres toques.">
        <ol className="flex flex-col gap-3 text-[15px]">
          <li className="flex items-center gap-3"><span className="nums flex h-7 w-7 shrink-0 items-center justify-center rounded-full bg-soi-tray text-sm">1</span><span>Toca <Share className="mx-1 inline h-4 w-4 align-[-2px]" aria-label="Compartir" /> <strong>Compartir</strong> en la barra de Safari.</span></li>
          <li className="flex items-center gap-3"><span className="nums flex h-7 w-7 shrink-0 items-center justify-center rounded-full bg-soi-tray text-sm">2</span><span>Elige <PlusSquare className="mx-1 inline h-4 w-4 align-[-2px]" aria-hidden="true" /> <strong>Agregar a inicio</strong>.</span></li>
          <li className="flex items-center gap-3"><span className="nums flex h-7 w-7 shrink-0 items-center justify-center rounded-full bg-soi-tray text-sm">3</span><span>Abre SOI desde tu pantalla de inicio y activa los avisos.</span></li>
        </ol>
        <Button className="mt-5 w-full" onClick={() => setHowTo(false)}>Entendido</Button>
      </Dialog>
    </section>
  );
}
