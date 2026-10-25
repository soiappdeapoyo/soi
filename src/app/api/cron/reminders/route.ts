import { createAdminClient } from '@/lib/supabase/server';
import { loadDayPlan, playHref, resolveRefs } from '@/lib/day-plan';
import { loadJourney } from '@/lib/journey-server';
import { nextStep } from '@/lib/journey';
import { evaluateAccess, type AccessProfile } from '@/lib/billing/access-rules';
import { dueReminders, inWindow, localMinutesIn, nudgeAt, scheduledDue, toMinutes, type DayTwo } from '@/lib/reminders';
import { sendPushResult } from '@/lib/push/send';
import { firstName, reminderSpeech } from '@/lib/voice/greeting';
import { dateInTz, startOfTodayISO, todayISO } from '@/lib/utils';
import type { PushSubscription } from 'web-push';
import { reviewWeek } from '@/lib/life-plan';
import { loadOsToday } from '@/lib/life-plan-server';

export const maxDuration = 60;

type Row = AccessProfile & {
  user_id: string; display_name: string | null; timezone: string | null; reminder_time: string | null; streak_current: number | null;
  push_subscription: PushSubscription;
};

/**
 * Recordatorios para volver (src/lib/reminders.ts). Lo llama pg_cron cada 5 min (migración 0033) con el mismo
 * secreto que los crons de Vercel. Solo carga lo pesado (plan del día, loop) para quien tiene algo que avisar ahora.
 */
export async function GET(req: Request) {
  if (!process.env.CRON_SECRET || req.headers.get('authorization') !== `Bearer ${process.env.CRON_SECRET}`) {
    return new Response('No autorizado', { status: 401 });
  }
  const db = createAdminClient();
  const now = new Date();
  const { data: profiles, error } = await db.from('user_profiles')
    .select('user_id, display_name, timezone, reminder_time, streak_current, push_subscription, plan, trial_ends_at, free_queries_remaining, is_paywalled')
    .eq('reminders_enabled', true).not('push_subscription', 'is', null).neq('app_role', 'persons').limit(2000);
  if (error) return Response.json({ ok: false, error: error.message }, { status: 500 });

  // Recordatorios pedidos en el chat (scheduleReminder), de todos a la vez.
  const { data: asked } = await db.from('agent_knowledge').select('id, user_id, content, metadata')
    .eq('category', 'accion').contains('tags', ['recordatorio']).eq('status', 'en_progreso')
    .gte('created_at', new Date(now.getTime() - 30 * 86_400_000).toISOString()).limit(2000);

  const firsts = await firstMomentsYesterday(db, now);

  let sent = 0;
  let gone = 0;
  for (const p of (profiles ?? []) as Row[]) {
    try {
      const tz = p.timezone ?? 'America/Mexico_City';
      const local = localMinutesIn(tz, now);
      // Día 2: su primer Moment fue ayer (en su zona) → la invitación llega a la hora en que lo vivió.
      const first = firsts.get(p.user_id);
      const dayTwo: DayTwo | null = first && dateInTz(first.completedAt, tz) === dateInTz(now.getTime() - 86_400_000, tz)
        ? { title: first.title, href: first.href, at: localMinutesIn(tz, new Date(first.completedAt)) } : null;
      const scheduled = (asked ?? []).filter((a) => a.user_id === p.user_id && scheduledDue(String((a.metadata as { remind_at?: string } | null)?.remind_at ?? ''), tz, now))
        .map((a) => ({ id: a.id as string, title: String(a.content).slice(0, 160) }));
      const plan = await loadDayPlan(db, p.user_id, tz);
      const nudgeNow = inWindow(local, nudgeAt(p.reminder_time, dayTwo).at);
      const momentNow = plan.items.some((i) => !i.done && toMinutes(i.time) != null && inWindow(local, toMinutes(i.time)!));
      if (!nudgeNow && !momentNow && !scheduled.length) continue;

      const localDate = todayISO(tz);
      const since = startOfTodayISO(tz);
      const [{ data: log }, runsToday, msgsToday, journey, os] = await Promise.all([
        db.from('notification_log').select('kind, ref').eq('user_id', p.user_id).eq('local_date', localDate),
        nudgeNow ? db.from('moment_runs').select('id', { count: 'exact', head: true }).eq('user_id', p.user_id).gte('completed_at', since) : Promise.resolve({ count: 0 }),
        nudgeNow ? db.from('messages').select('id', { count: 'exact', head: true }).eq('user_id', p.user_id).eq('role', 'user').gte('created_at', since) : Promise.resolve({ count: 0 }),
        nudgeNow ? loadJourney(db, p.user_id, evaluateAccess(p, 'routine_execution', now).allowed) : Promise.resolve(null),
        nudgeNow && reviewWeek(tz, now).due ? loadOsToday(db, p.user_id, tz).catch(() => null) : Promise.resolve(null),
      ]);

      const notices = dueReminders({
        localMinutes: local,
        items: plan.items.filter((i) => i.moment).map((i) => ({ id: i.id, time: i.time, title: i.moment!.title, minutes: i.moment!.required_minutes, href: playHref(i.moment!), done: i.done })),
        reminderTime: p.reminder_time,
        activeToday: (runsToday.count ?? 0) > 0 || (msgsToday.count ?? 0) > 0,
        sent: new Set((log ?? []).map((l) => `${l.kind}:${l.ref}`)),
        step: journey ? nextStep(journey, now.getTime()) : { kind: 'routine', title: '', detail: '', cta: '', href: '/hoy' },
        streak: p.streak_current ?? 0,
        pendingToday: plan.items.filter((i) => !i.done).length,
        scheduled,
        reviewDue: Boolean(os?.reviewDue),
        dayTwo,
      });

      for (const n of notices) {
        // Primero se anota (único por día): si dos ejecuciones se cruzan, solo una envía.
        const { data: claimed } = await db.from('notification_log')
          .upsert({ user_id: p.user_id, kind: n.kind, ref: n.ref.slice(0, 80), local_date: localDate }, { onConflict: 'user_id,kind,ref,local_date', ignoreDuplicates: true })
          .select('id');
        if (!claimed?.length) continue;
        const url = `${n.url}${n.url.includes('?') ? '&' : '?'}from=push`;
        const speech = reminderSpeech({ name: firstName(p.display_name), kind: n.kind, title: n.title, body: n.body, localMinutes: local });
        const result = await sendPushResult(p.push_subscription, { title: n.title, body: n.body, url, tag: `soi-${n.kind}-${n.ref}`, alarm: n.alarm, speech });
        if (result === 'sent') sent++;
        if (result === 'gone') {
          // El teléfono ya no acepta avisos (desinstaló o revocó el permiso): se deja de intentar.
          await db.from('user_profiles').update({ push_subscription: null }).eq('user_id', p.user_id);
          gone++;
          break;
        }
      }
    } catch (e) {
      console.error('[reminders]', p.user_id, e instanceof Error ? e.message : e);
    }
  }
  return Response.json({ ok: true, users: profiles?.length ?? 0, sent, gone });
}

/**
 * Quién vivió su PRIMER Moment entre hace 49 h y hace 1 h (cubre "ayer" en cualquier zona): de todos a la vez, para
 * no consultar por persona. Devuelve cuándo lo terminó y su título.
 */
async function firstMomentsYesterday(db: ReturnType<typeof createAdminClient>, now: Date) {
  const out = new Map<string, { completedAt: string; title: string; href: string }>();
  const from = new Date(now.getTime() - 49 * 3_600_000).toISOString();
  const { data: recent } = await db.from('moment_runs').select('user_id, moment_id, moment_slug, completed_at')
    .not('completed_at', 'is', null).gte('completed_at', from).lte('completed_at', new Date(now.getTime() - 3_600_000).toISOString())
    .order('completed_at', { ascending: true }).limit(2000);
  const earliest = new Map<string, { completedAt: string; ref: string }>();
  for (const r of recent ?? []) {
    if (!earliest.has(r.user_id)) earliest.set(r.user_id, { completedAt: r.completed_at as string, ref: r.moment_id ? `m:${r.moment_id}` : `s:${r.moment_slug}` });
  }
  if (!earliest.size) return out;
  // Quien ya había terminado otro antes no está en su día 2.
  const { data: older } = await db.from('moment_runs').select('user_id')
    .in('user_id', [...earliest.keys()]).not('completed_at', 'is', null).lt('completed_at', from).limit(5000);
  for (const r of older ?? []) earliest.delete(r.user_id);
  const moments = await resolveRefs(db, [...new Set([...earliest.values()].map((e) => e.ref))]);
  for (const [userId, e] of earliest) {
    const m = moments.get(e.ref);
    if (m) out.set(userId, { completedAt: e.completedAt, title: m.title, href: `/m/${m.official ? m.slug : m.id}/play` });
  }
  return out;
}
