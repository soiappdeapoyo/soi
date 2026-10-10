import webpush from 'web-push';

let configured = false;
function configure() {
  if (configured) return true;
  const pub = process.env.NEXT_PUBLIC_VAPID_PUBLIC_KEY;
  const priv = process.env.VAPID_PRIVATE_KEY;
  if (!pub || !priv) return false;
  webpush.setVapidDetails(process.env.VAPID_SUBJECT ?? 'https://yosoi.app', pub, priv);
  configured = true;
  return true;
}

export type PushPayload = {
  title: string; body: string; url?: string;
  /** Agrupa avisos: uno nuevo con el mismo tag reemplaza al anterior (y vuelve a sonar). */
  tag?: string;
  /** Alarma: vibra más y se queda en pantalla hasta que la persona la toca. */
  alarm?: boolean;
};

/** 'sent' | 'gone' (la suscripción ya no existe: hay que borrarla) | 'failed' (reintentar otro día) | 'disabled' (sin claves). */
export type PushResult = 'sent' | 'gone' | 'failed' | 'disabled';

export async function sendPushResult(subscription: webpush.PushSubscription, payload: PushPayload): Promise<PushResult> {
  if (!configure()) return 'disabled';
  try {
    // urgency high: el sistema la entrega aunque el teléfono ahorre batería (es una hora que la persona eligió).
    await webpush.sendNotification(subscription, JSON.stringify(payload), { TTL: 60 * 30, urgency: payload.alarm ? 'high' : 'normal' });
    return 'sent';
  } catch (e) {
    const status = (e as { statusCode?: number }).statusCode;
    if (status === 404 || status === 410) return 'gone';
    console.error('[push]', status ?? '', e instanceof Error ? e.message : e);
    return 'failed';
  }
}

export async function sendPush(subscription: webpush.PushSubscription, payload: PushPayload) {
  return (await sendPushResult(subscription, payload)) === 'sent';
}
