import { describe, expect, it } from 'vitest';
import { activeDoor, coachLine, dayNumberOf, DOOR_IDS, DOORS, doorPrompt, doorsOf, isDoorId } from '@/config/doors';
import { situationById } from '@/config/situations';
import { officialMoment } from '@/config/official-moments';
import { AGENTS } from '@/config/agents';
import { detectInApp, manualSteps, openInBrowserHref } from '@/lib/in-app-browser';
import { dueReminders, type ReminderInput } from '@/lib/reminders';
import type { NextStep } from '@/lib/journey';

describe('puertas', () => {
  it('cada puerta apunta a un agente, situaciones y un Moment de noche que existen', () => {
    for (const id of DOOR_IDS) {
      const d = DOORS[id];
      expect(AGENTS[d.agent]).toBeTruthy();
      expect(situationById(d.sos.situation)).toBeTruthy();
      expect(situationById(d.practice.situation)).toBeTruthy();
      expect(officialMoment(d.night.slug)).toBeTruthy();
      expect(d.coach.manana.length).toBeGreaterThan(0);
      expect(d.coach.noche.length).toBeGreaterThan(0);
    }
  });

  it('la app enfocada solo con ui_mode door y una puerta válida', () => {
    expect(activeDoor({ door: 'amor', ui_mode: 'door' })?.id).toBe('amor');
    expect(activeDoor({ door: 'amor', ui_mode: 'full' })).toBeNull();
    expect(activeDoor({ door: 'otra', ui_mode: 'door' })).toBeNull();
    expect(isDoorId('dinero')).toBe(true);
  });

  it('sus puertas: la principal primero y sin repetir', () => {
    expect(doorsOf({ door: 'amor', extra_doors: ['ansiedad', 'amor', 'x'] }).map((d) => d.id)).toEqual(['amor', 'ansiedad']);
  });

  it('el coach rota por día y nunca queda vacío', () => {
    const d = DOORS.amor;
    const n = dayNumberOf('2026-11-16');
    expect(coachLine(d, 'manana', n)).not.toBe(coachLine(d, 'manana', n + 1));
    expect(coachLine(d, 'noche', -7)).toBeTruthy();
  });

  it('el prompt de amor nunca promete que alguien vuelva', () => {
    const p = doorPrompt({ door: 'amor', ui_mode: 'door' });
    expect(p).toMatch(/Nunca prometas que alguien volverá/);
    expect(p).toMatch(/No menciones Mi Vida/);
    expect(doorPrompt({ door: null })).toBe('');
  });
});

describe('navegador dentro de apps', () => {
  const tiktokAndroid = 'Mozilla/5.0 (Linux; Android 13; SM-A135M Build/TP1A; wv) AppleWebKit/537.36 Chrome/120.0 Mobile Safari/537.36 trill_330201 BytedanceWebview/d8a21c6';
  const instaIos = 'Mozilla/5.0 (iPhone; CPU iPhone OS 17_4 like Mac OS X) AppleWebKit/605.1.15 (KHTML, like Gecko) Mobile/15E148 Instagram 330.0.0.0';
  const safari = 'Mozilla/5.0 (iPhone; CPU iPhone OS 17_4 like Mac OS X) AppleWebKit/605.1.15 (KHTML, like Gecko) Version/17.4 Mobile/15E148 Safari/604.1';

  it('reconoce TikTok, Instagram y no confunde Safari', () => {
    expect(detectInApp(tiktokAndroid)).toEqual({ app: 'tiktok', label: 'TikTok', os: 'android' });
    expect(detectInApp(instaIos)).toEqual({ app: 'instagram', label: 'Instagram', os: 'ios' });
    expect(detectInApp(safari)).toBeNull();
  });

  it('abre en Chrome con un intent o en Safari con x-safari', () => {
    const url = 'https://yosoi.app/login?puerta=amor';
    expect(openInBrowserHref(url, 'android')).toBe(`intent://yosoi.app/login?puerta=amor#Intent;scheme=https;package=com.android.chrome;S.browser_fallback_url=${encodeURIComponent(url)};end`);
    expect(openInBrowserHref(url, 'ios')).toBe('x-safari-https://yosoi.app/login?puerta=amor');
    expect(openInBrowserHref('javascript:alert(1)', 'ios')).toBeNull();
    expect(manualSteps({ app: 'tiktok', label: 'TikTok', os: 'ios' })).toMatch(/Abrir en el navegador/);
  });
});

describe('coach en los recordatorios', () => {
  const routine: NextStep = { kind: 'routine', title: '', detail: '', cta: 'Ir a Hoy', href: '/hoy' };
  const coach = {
    nightAt: 21 * 60,
    manana: { title: 'SOI Amor', body: 'mañana', url: '/chat?nueva=1&coach=manana' },
    noche: { title: 'SOI Amor', body: 'noche', url: '/chat?nueva=1&coach=noche' },
  };
  const base: ReminderInput = {
    localMinutes: 9 * 60 + 2, items: [], reminderTime: null, activeToday: false, sent: new Set(),
    step: routine, streak: 0, pendingToday: 0, scheduled: [], coach,
  };

  it('en la mañana, su mensaje en lugar de la invitación genérica', () => {
    expect(dueReminders(base)).toEqual([expect.objectContaining({ kind: 'nudge', ref: 'daily', body: 'mañana', url: coach.manana.url })]);
  });

  it('lo que dejó a medias manda sobre el coach', () => {
    const resume: NextStep = { kind: 'resume', title: 'Lo dejaste a medias: X', detail: '', cta: '', href: '/m/x/play' };
    expect(dueReminders({ ...base, step: resume })[0]?.url).toBe('/m/x/play');
  });

  it('en la noche, una vez, aunque hoy ya haya venido', () => {
    const night = { ...base, localMinutes: 21 * 60 + 3, activeToday: true };
    expect(dueReminders(night)).toEqual([expect.objectContaining({ ref: 'coach_noche', body: 'noche' })]);
    expect(dueReminders({ ...night, sent: new Set(['nudge:coach_noche']) })).toEqual([]);
    expect(dueReminders({ ...night, coach: null })).toEqual([]);
  });
});
