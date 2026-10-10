import { createAdminClient } from '@/lib/supabase/server';
import { loadDayPlan, playHref } from '@/lib/day-plan';
import { loadJourney } from '@/lib/journey-server';
import { nextStep } from '@/lib/journey';
import { evaluateAccess, type AccessProfile } from '@/lib/billing/access-rules';
import { DEFAULT_REMINDER_TIME, dueReminders, inWindow, localMinutesIn, scheduledDue, toMinutes } from '@/lib/reminders';
import { sendPushResult } from '@/lib/push/send';
import { startOfTodayISO, todayISO } from '@/lib/utils';
import type { PushSubscription } from 'web-push';

export const maxDuration = 60;

type Row = AccessProfile & {
  user_id: string; timezone: string | null; reminder_time: string | null; streak_current: number | null;
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
    .select('user_id, timezone, reminder_time, streak_current, push_subscription, plan, trial_ends_at, free_queries_remaining, is_paywalled')
    .eq('reminders_enabled', true).not('push_subscription', 'is', null).limit(2000);
  if (error) return Response.json({ ok: false, error: error.message }, { status: 500 });

  // Recordatorios pedidos en el chat (scheduleReminder), de todos a la vez.
  const { data: asked } = await db.from('agent_knowledge').select('id, user_id, content, metadata')
    .eq('category', 'accion').contains('tags', ['recordatorio']).eq('status', 'en_progreso')
    .gte('created_at', new Date(now.getTime() - 30 * 86_400_000).toISOString()).limit(2000);

  let sent = 0;
  let gone = 0;
  for (const p of (profiles ?? []) as Row[]) {
    try {
      const tz = p.timezone ?? 'America/Mexico_City';
      const local = localMinutesIn(tz, now);
      const scheduled = (asked ?? []).filter((a) => a.user_id === p.user_id && scheduledDue(String((a.metadata as { remind_at?: string } | null)?.remind_at ?? ''), tz, now))
        .map((a) => ({ id: a.id as string, title: String(a.content).slice(0, 160) }));
      const plan = await loadDayPlan(db, p.user_id, tz);
      const nudgeNow = inWindow(local, toMinutes(p.reminder_time) ?? toMinutes(DEFAULT_REMINDER_TIME)!);
      const momentNow = plan.items.some((i) => !i.done && toMinutes(i.time) != null && inWindow(local, toMinutes(i.time)!));
      if (!nudgeNow && !momentNow && !scheduled.length) continue;

      const localDate = todayISO(tz);
      const since = startOfTodayISO(tz);
      const [{ data: log }, runsToday, msgsToday, journey] = await Promise.all([
        db.from('notification_log').select('kind, ref').eq('user_id', p.user_id).eq('local_date', localDate),
        nudgeNow ? db.from('moment_runs').select('id', { count: 'exact', head: true }).eq('user_id', p.user_id).gte('completed_at', since) : Promise.resolve({ count: 0 }),
        nudgeNow ? db.from('messages').select('id', { count: 'exact', head: true }).eq('user_id', p.user_id).eq('role', 'user').gte('created_at', since) : Promise.resolve({ count: 0 }),
        nudgeNow ? loadJourney(db, p.user_id, evaluateAccess(p, 'routine_execution', now).allowed) : Promise.resolve(null),
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
      });

      for (const n of notices) {
        // Primero se anota (único por día): si dos ejecuciones se cruzan, solo una envía.
        const { data: claimed } = await db.from('notification_log')
          .upsert({ user_id: p.user_id, kind: n.kind, ref: n.ref.slice(0, 80), local_date: localDate }, { onConflict: 'user_id,kind,ref,local_date', ignoreDuplicates: true })
          .select('id');
        if (!claimed?.length) continue;
        const url = `${n.url}${n.url.includes('?') ? '&' : '?'}from=push`;
        const result = await sendPushResult(p.push_subscription, { title: n.title, body: n.body, url, tag: `soi-${n.kind}-${n.ref}`, alarm: n.alarm });
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
