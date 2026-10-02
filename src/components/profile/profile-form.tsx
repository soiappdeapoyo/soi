'use client';

import { useState } from 'react';
import { toast } from 'sonner';
import { useRouter } from 'next/navigation';
import { Button } from '@/components/ui/button';
import { Input, Textarea, Label, Select } from '@/components/ui/input';
import { ROUTINES } from '@/config/routines';
import { SUPPORTED_COUNTRIES } from '@/config/crisis-resources';
import type { UserProfile } from '@/types/database';

const COUNTRY_LABEL: Record<string, string> = { MX: 'México', AR: 'Argentina', CO: 'Colombia', CL: 'Chile', PE: 'Perú', ES: 'España', US: 'Estados Unidos' };

export function ProfileForm({ profile }: { profile: UserProfile }) {
  const router = useRouter();
  const [name, setName] = useState(profile.display_name ?? '');
  const [goals, setGoals] = useState((profile.goals ?? []).join('\n'));
  const [blockers, setBlockers] = useState((profile.blockers ?? []).join('\n'));
  const [routine, setRoutine] = useState(profile.preferred_routine ?? 'brian_tracy_5min');
  const [morning, setMorning] = useState((profile.morning_time ?? '07:00').slice(0, 5));
  const [evening, setEvening] = useState((profile.evening_time ?? '21:00').slice(0, 5));
  const [country, setCountry] = useState(profile.country ?? 'MX');
  const [status, setStatus] = useState<'idle' | 'saving' | 'saved' | 'error'>('idle');

  const lines = (s: string) => s.split('\n').map((x) => x.trim()).filter(Boolean).slice(0, 10);

  async function save(e: React.FormEvent) {
    e.preventDefault();
    setStatus('saving');
    const res = await fetch('/api/profile', {
      method: 'PATCH', headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        display_name: name, goals: lines(goals), blockers: lines(blockers), preferred_routine: routine,
        morning_time: morning, evening_time: evening, country,
        timezone: Intl.DateTimeFormat().resolvedOptions().timeZone,
      }),
    });
    setStatus(res.ok ? 'saved' : 'error');
    toast(res.ok ? 'Perfil actualizado' : 'No se pudo guardar el perfil');
    router.refresh();
  }

  return (
    <form onSubmit={save} className="flex flex-col gap-4">
      <div><Label htmlFor="pf-name">Nombre</Label><Input id="pf-name" value={name} onChange={(e) => setName(e.target.value)} maxLength={60} required /></div>
      <div><Label htmlFor="pf-goals">Mis metas (una por línea, en presente)</Label><Textarea id="pf-goals" value={goals} onChange={(e) => setGoals(e.target.value)} placeholder="Gano lo suficiente para vivir con calma" /></div>
      <div><Label htmlFor="pf-blockers">Lo que me frena (una por línea)</Label><Textarea id="pf-blockers" value={blockers} onChange={(e) => setBlockers(e.target.value)} /></div>
      <div className="grid gap-4 sm:grid-cols-2">
        <div>
          <Label htmlFor="pf-routine">Rutina preferida</Label>
          <Select id="pf-routine" value={routine} onChange={(e) => setRoutine(e.target.value)}>
            {Object.values(ROUTINES).map((r) => <option key={r.id} value={r.id}>{r.label} ({r.totalMinutes} min)</option>)}
          </Select>
        </div>
        <div>
          <Label htmlFor="pf-country">País (para líneas de ayuda)</Label>
          <Select id="pf-country" value={country} onChange={(e) => setCountry(e.target.value)}>
            {SUPPORTED_COUNTRIES.map((c) => <option key={c} value={c}>{COUNTRY_LABEL[c] ?? c}</option>)}
          </Select>
        </div>
        <div><Label htmlFor="pf-morning">Hora de mañana</Label><Input id="pf-morning" type="time" value={morning} onChange={(e) => setMorning(e.target.value)} /></div>
        <div><Label htmlFor="pf-evening">Hora de noche</Label><Input id="pf-evening" type="time" value={evening} onChange={(e) => setEvening(e.target.value)} /></div>
      </div>
      <Button type="submit" variant="primary" disabled={status === 'saving'}>{status === 'saving' ? 'Guardando…' : 'Guardar perfil'}</Button>
    </form>
  );
}
