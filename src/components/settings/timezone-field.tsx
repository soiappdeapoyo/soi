'use client';

import { useState } from 'react';
import { useRouter } from 'next/navigation';
import { toast } from 'sonner';
import { Label, Select } from '@/components/ui/input';
import { COUNTRY_TIMEZONES, defaultTimezone } from '@/config/timezones';

/** Zona horaria: automática (del dispositivo) o elegida entre las de tu país. */
export function TimezoneField({ country, timezone, auto }: { country: string | null; timezone: string | null; auto: boolean }) {
  const router = useRouter();
  const zones = COUNTRY_TIMEZONES[country ?? 'MX'] ?? COUNTRY_TIMEZONES.MX!;
  const [value, setValue] = useState(auto ? 'auto' : (timezone ?? defaultTimezone(country)));
  const now = (tz: string) => { try { return new Intl.DateTimeFormat('es', { hour: 'numeric', minute: '2-digit', timeZone: tz }).format(new Date()); } catch { return ''; } };

  async function change(v: string) {
    setValue(v);
    const device = Intl.DateTimeFormat().resolvedOptions().timeZone;
    const body = v === 'auto' ? { timezone_auto: true, timezone: device } : { timezone_auto: false, timezone: v };
    const res = await fetch('/api/profile', { method: 'PATCH', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify(body) });
    toast(res.ok ? 'Zona horaria actualizada' : 'No se pudo guardar la zona horaria');
    if (res.ok) router.refresh();
  }

  return (
    <div>
      <Label htmlFor="st-tz">Zona horaria</Label>
      <Select id="st-tz" value={value} onChange={(e) => change(e.target.value)}>
        <option value="auto">Automática (la de tu teléfono)</option>
        {zones.map((z) => <option key={z.tz} value={z.tz}>{z.label} · {now(z.tz)}</option>)}
      </Select>
      <p className="mt-1 text-xs text-soi-muted">Define cuándo empieza tu día, tu racha y qué te sugiere SOI según la hora.</p>
    </div>
  );
}
