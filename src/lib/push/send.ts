import webpush from 'web-push';

let configured = false;
function configure() {
  if (configured) return true;
  const pub = process.env.NEXT_PUBLIC_VAPID_PUBLIC_KEY;
  const priv = process.env.VAPID_PRIVATE_KEY;
  if (!pub || !priv) return false;
  webpush.setVapidDetails(process.env.VAPID_SUBJECT ?? 'mailto:hola@soi.app', pub, priv);
  configured = true;
  return true;
}

export async function sendPush(subscription: webpush.PushSubscription, payload: { title: string; body: string; url?: string }) {
  if (!configure()) return false;
  try {
    await webpush.sendNotification(subscription, JSON.stringify(payload));
    return true;
  } catch (e) {
    console.error('[push]', e);
    return false;
  }
}
