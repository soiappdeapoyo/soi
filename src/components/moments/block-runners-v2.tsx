'use client';

import { useEffect, useRef, useState } from 'react';
import { Camera, Check, Circle, Download, Eraser, Mic, Square, Upload } from 'lucide-react';
import { Input, Label, Textarea } from '@/components/ui/input';
import { Button } from '@/components/ui/button';
import { SoiPlayer } from '@/components/media/soi-player';
import { GuideVideo } from '@/components/media/guide-video';
import { ExerciseAnimation } from '@/components/library/exercise-animation';
import { compressImage, signedUrl, uploadMedia } from '@/lib/media/upload';
import type { ActionBlock } from '@/config/actions';
import type { BlockOutput } from './block-runners';
import { cn } from '@/lib/utils';

export type V2Props = {
  block: ActionBlock;
  output: BlockOutput;
  setOutput: (o: BlockOutput) => void;
  next: () => void;
  running: boolean;
  /** Segundos transcurridos del bloque (pomodoro y estiramiento siguen el reloj del reproductor). */
  elapsed: number;
  runId: string | null;
  cue?: (text: string, style?: 'guide' | 'calm' | 'breath' | 'energy' | 'chat') => void;
};

const lead = 'text-[17px] leading-relaxed text-soi-ink text-pretty';

function cfg<T>(b: ActionBlock) {
  return b.config as T;
}

function fmt(s: number) {
  const m = Math.floor(Math.max(0, s) / 60);
  return `${m}:${String(Math.max(0, Math.floor(s)) % 60).padStart(2, '0')}`;
}

/** Vista previa de un archivo privado propio (run-media) mediante URL temporal. */
function useSigned(path?: string) {
  const [url, setUrl] = useState<string | null>(null);
  useEffect(() => {
    let alive = true;
    if (path) signedUrl(path).then((u) => alive && setUrl(u));
    return () => { alive = false; };
  }, [path]);
  return url;
}

export function V2Runner(p: V2Props) {
  switch (p.block.type) {
    case 'canvas': return <CanvasRunner {...p} />;
    case 'mind_map': return <MindMapRunner {...p} />;
    case 'quiz': return <QuizRunner {...p} />;
    case 'music': return <MusicRunner {...p} />;
    case 'audio': return <AudioRunner {...p} />;
    case 'photo': return <PhotoRunner {...p} />;
    case 'agenda': return <AgendaRunner {...p} />;
    case 'pomodoro': return <PomodoroRunner {...p} />;
    case 'contract': return <ContractRunner {...p} />;
    case 'weekly_review': return <WeeklyReviewRunner {...p} />;
    case 'tracking': return <TrackingRunner {...p} />;
    case 'stretching': return <StretchingRunner {...p} />;
    default: return null;
  }
}

/* ---------------- Canvas ---------------- */
const INKS = ['#0B0B0B', '#184F95', '#D4AF37', '#B93535', '#2E7D5B'];

function CanvasRunner({ block, output, setOutput, runId }: V2Props) {
  const ref = useRef<HTMLCanvasElement>(null);
  const drawing = useRef<number | null>(null); // pointerId activo (ignora un segundo dedo)
  const last = useRef<{ x: number; y: number } | null>(null);
  const [ink, setInk] = useState(INKS[0]!);
  const [dirty, setDirty] = useState(false);
  const [busy, setBusy] = useState(false);
  const saved = useSigned(output.media);

  useEffect(() => {
    const c = ref.current!;
    const ratio = window.devicePixelRatio || 1;
    const rect = c.getBoundingClientRect();
    c.width = rect.width * ratio;
    c.height = rect.height * ratio;
    const ctx = c.getContext('2d')!;
    ctx.scale(ratio, ratio);
    ctx.fillStyle = '#FFFFFF';
    ctx.fillRect(0, 0, rect.width, rect.height);
    ctx.lineCap = 'round';
    ctx.lineJoin = 'round';
  }, []);

  function point(e: React.PointerEvent<HTMLCanvasElement>) {
    const r = e.currentTarget.getBoundingClientRect();
    return { x: e.clientX - r.left, y: e.clientY - r.top };
  }
  function down(e: React.PointerEvent<HTMLCanvasElement>) {
    if (drawing.current !== null) return;
    drawing.current = e.pointerId;
    e.currentTarget.setPointerCapture(e.pointerId);
    last.current = point(e);
  }
  function move(e: React.PointerEvent<HTMLCanvasElement>) {
    if (drawing.current !== e.pointerId || !last.current) return;
    const ctx = e.currentTarget.getContext('2d')!;
    const pt = point(e);
    ctx.strokeStyle = ink;
    ctx.lineWidth = e.pressure > 0 && e.pointerType === 'pen' ? 2 + e.pressure * 6 : 4;
    ctx.beginPath();
    ctx.moveTo(last.current.x, last.current.y);
    ctx.lineTo(pt.x, pt.y);
    ctx.stroke();
    last.current = pt;
    setDirty(true);
  }
  function up(e: React.PointerEvent<HTMLCanvasElement>) {
    if (drawing.current === e.pointerId) { drawing.current = null; last.current = null; }
  }
  function clear() {
    const c = ref.current!;
    const ctx = c.getContext('2d')!;
    ctx.fillStyle = '#FFFFFF';
    ctx.fillRect(0, 0, c.width, c.height);
    setDirty(false);
  }
  async function save() {
    setBusy(true);
    const blob = await new Promise<Blob | null>((r) => ref.current!.toBlob(r, 'image/webp', 0.85));
    if (blob) {
      try {
        const { path } = await uploadMedia('run-media', blob, `runs/${runId ?? 'sin-run'}`);
        setOutput({ ...output, type: block.type, media: path, done: true });
        setDirty(false);
      } catch { /* el mensaje queda en el botón */ }
    }
    setBusy(false);
  }

  return (
    <div className="flex flex-col gap-3">
      <p className={cn(lead, 'text-center')}>{cfg<{ prompt: string }>(block).prompt}</p>
      <canvas ref={ref} aria-label="Lienzo para dibujar" onPointerDown={down} onPointerMove={move} onPointerUp={up} onPointerCancel={up}
        className="h-72 w-full touch-none rounded-[14px] bg-white shadow-ring" />
      <div className="flex flex-wrap items-center gap-2">
        <div role="radiogroup" aria-label="Color" className="flex gap-1.5">
          {INKS.map((c) => (
            <button key={c} type="button" role="radio" aria-checked={ink === c} aria-label={`Color ${c}`} onClick={() => setInk(c)}
              className={cn('press-deep h-8 w-8 rounded-full', ink === c ? 'shadow-[0_0_0_2px_white,0_0_0_4px_var(--color-soi-ink)]' : 'shadow-ring')} style={{ background: c }} />
          ))}
        </div>
        <button type="button" onClick={clear} className="press ml-auto inline-flex h-9 items-center gap-1.5 rounded-lg px-3 text-sm shadow-ring"><Eraser className="h-4 w-4" aria-hidden="true" /> Borrar</button>
        <Button size="sm" onClick={save} disabled={busy || !dirty}>{busy ? 'Guardando…' : output.media && !dirty ? 'Guardado' : 'Guardar dibujo'}</Button>
      </div>
      {saved && !dirty && <p className="flex items-center gap-1.5 text-xs text-soi-muted"><Check className="h-3.5 w-3.5 text-soi-accent" aria-hidden="true" /> Tu dibujo quedó guardado en este Moment.</p>}
    </div>
  );
}

/* ---------------- Mapa mental ---------------- */
function MindMapRunner({ block, output, setOutput }: V2Props) {
  const c = cfg<{ center: string; branches: number }>(block);
  const branches = output.items ?? Array.from({ length: c.branches }, () => '');
  const set = (i: number, v: string) => { const n = [...branches]; n[i] = v; setOutput({ ...output, type: block.type, text: c.center, items: n }); };
  const R = 110;
  return (
    <div className="flex flex-col gap-4">
      <svg viewBox="-160 -140 320 280" className="mx-auto h-56 w-full max-w-sm" role="img" aria-label={`Mapa mental: ${c.center}`}>
        {branches.map((b, i) => {
          const a = (i / branches.length) * Math.PI * 2 - Math.PI / 2;
          const x = Math.cos(a) * R, y = Math.sin(a) * R;
          return (
            <g key={i}>
              <line x1={0} y1={0} x2={x} y2={y} stroke="var(--color-soi-accent)" strokeOpacity={b.trim() ? 0.6 : 0.15} strokeWidth={1.5} />
              <circle cx={x} cy={y} r={5} fill={b.trim() ? 'var(--color-soi-accent)' : 'rgb(11 11 11 / 0.12)'} />
              <text x={x} y={y + (y >= 0 ? 20 : -12)} textAnchor="middle" fontSize="11" fill="var(--color-soi-ink)">{(b || `Rama ${i + 1}`).slice(0, 22)}</text>
            </g>
          );
        })}
        <circle r={34} fill="var(--color-soi-accent-soft)" />
        <text textAnchor="middle" dy="4" fontSize="12" fontWeight="600" fill="var(--color-soi-accent)">{c.center.slice(0, 16)}</text>
      </svg>
      <div className="grid gap-2 sm:grid-cols-2">
        {branches.map((b, i) => <Input key={i} aria-label={`Rama ${i + 1}`} placeholder={`Rama ${i + 1}`} value={b} maxLength={80} onChange={(e) => set(i, e.target.value)} />)}
      </div>
    </div>
  );
}

/* ---------------- Quiz ---------------- */
type QuizQ = { q: string; options: string[]; answer: number; explain?: string };
function QuizRunner({ block, output, setOutput }: V2Props) {
  const qs = cfg<{ questions: QuizQ[] }>(block).questions;
  const answers = output.answers ?? qs.map(() => -1);
  const score = answers.filter((a, i) => a === qs[i]!.answer).length;
  function choose(i: number, k: number) {
    if (answers[i] !== -1) return;
    const n = [...answers]; n[i] = k;
    setOutput({ ...output, type: block.type, answers: n, score: n.filter((a, j) => a === qs[j]!.answer).length, done: n.every((a) => a !== -1) });
  }
  return (
    <div className="flex flex-col gap-4">
      {qs.map((q, i) => (
        <fieldset key={i} className="rounded-[14px] bg-white p-3 shadow-ring">
          <legend className="sr-only">Pregunta {i + 1}</legend>
          <p className="text-[15px] font-medium">{q.q}</p>
          <div className="mt-2 flex flex-col gap-1.5">
            {q.options.map((o, k) => {
              const picked = answers[i] === k;
              const answered = answers[i] !== -1;
              const correct = k === q.answer;
              return (
                <button key={k} type="button" disabled={answered} onClick={() => choose(i, k)} aria-pressed={picked}
                  className={cn('press flex min-h-10 items-center gap-2 rounded-lg px-3 text-left text-sm',
                    !answered ? 'bg-soi-sidebar hover:bg-soi-tray' : correct ? 'bg-emerald-50 text-emerald-800' : picked ? 'bg-red-50 text-red-800' : 'bg-soi-sidebar text-soi-muted')}>
                  {answered && correct && <Check className="h-4 w-4 shrink-0" aria-hidden="true" />}
                  {o}
                </button>
              );
            })}
          </div>
          {answers[i] !== -1 && q.explain && <p className="mt-2 text-sm text-soi-muted">{q.explain}</p>}
        </fieldset>
      ))}
      {answers.every((a) => a !== -1) && <p className="nums text-center text-[15px]" aria-live="polite">{score} de {qs.length} correctas</p>}
    </div>
  );
}

/* ---------------- Música ---------------- */
function MusicRunner({ block, output, setOutput, next }: V2Props) {
  const c = cfg<{ audioUrl?: string; videoId?: string; title?: string; channel?: string; thumbnail?: string }>(block);
  if (c.audioUrl) return <audio controls autoPlay src={c.audioUrl} className="w-full" onEnded={() => setOutput({ ...output, type: block.type, done: true })} />;
  if (c.videoId) {
    return <SoiPlayer video={{ id: c.videoId, title: c.title ?? block.title, channel: c.channel ?? '', thumbnail: c.thumbnail ?? '' }}
      onEnded={() => { setOutput({ ...output, type: block.type, done: true }); next(); }} />;
  }
  return <p className={cn(lead, 'text-center text-soi-muted')}>Pon tu música favorita para este momento y continúa cuando quieras.</p>;
}

/* ---------------- Audio (escuchar o grabarse) ---------------- */
function AudioRunner({ block, output, setOutput, runId }: V2Props) {
  const c = cfg<{ mode: 'listen' | 'record'; audioUrl?: string; prompt: string }>(block);
  const [rec, setRec] = useState<MediaRecorder | null>(null);
  const [secs, setSecs] = useState(0);
  const [local, setLocal] = useState<string | null>(null);
  const [busy, setBusy] = useState(false);
  const [msg, setMsg] = useState<string | null>(null);
  const chunks = useRef<Blob[]>([]);

  useEffect(() => {
    if (!rec) return;
    const t = setInterval(() => setSecs((s) => s + 1), 1000);
    return () => clearInterval(t);
  }, [rec]);

  if (c.mode === 'listen' && c.audioUrl) {
    return (
      <div className="flex flex-col gap-3">
        <p className={cn(lead, 'text-center')}>{c.prompt}</p>
        <audio controls src={c.audioUrl} className="w-full" onEnded={() => setOutput({ ...output, type: block.type, done: true })} />
      </div>
    );
  }

  async function start() {
    setMsg(null);
    try {
      const stream = await navigator.mediaDevices.getUserMedia({ audio: true });
      const mr = new MediaRecorder(stream);
      chunks.current = [];
      mr.ondataavailable = (e) => e.data.size && chunks.current.push(e.data);
      mr.onstop = async () => {
        stream.getTracks().forEach((t) => t.stop());
        const blob = new Blob(chunks.current, { type: mr.mimeType.split(';')[0] || 'audio/webm' });
        setLocal(URL.createObjectURL(blob));
        setBusy(true);
        try {
          const { path } = await uploadMedia('run-media', blob, `runs/${runId ?? 'sin-run'}`);
          setOutput({ ...output, type: block.type, media: path, done: true });
        } catch (e) { setMsg((e as Error).message); }
        setBusy(false);
      };
      mr.start();
      setSecs(0);
      setRec(mr);
    } catch {
      setMsg('No pudimos usar el micrófono. Revisa los permisos del navegador.');
    }
  }
  function stop() {
    rec?.stop();
    setRec(null);
  }

  return (
    <div className="flex flex-col items-center gap-4 text-center">
      <p className={lead}>{c.prompt}</p>
      {rec ? (
        <button type="button" onClick={stop} className="press inline-flex h-14 items-center gap-2 rounded-full bg-soi-danger px-6 text-white">
          <Square className="h-4 w-4 fill-current" aria-hidden="true" /> <span className="nums">Detener · {fmt(secs)}</span>
        </button>
      ) : (
        <button type="button" onClick={start} disabled={busy} className="press inline-flex h-14 items-center gap-2 rounded-full bg-soi-ink px-6 text-white disabled:opacity-50">
          <Mic className="h-5 w-5" aria-hidden="true" /> {local ? 'Grabar de nuevo' : 'Grabar'}
        </button>
      )}
      {rec && <span className="inline-flex items-center gap-1.5 text-xs text-soi-muted"><Circle className="h-2.5 w-2.5 animate-thinking fill-soi-danger text-soi-danger" aria-hidden="true" /> Grabando</span>}
      {local && <audio controls src={local} className="w-full" />}
      {busy && <p className="text-xs text-soi-muted">Guardando tu audio…</p>}
      {output.media && !busy && <p className="flex items-center gap-1.5 text-xs text-soi-muted"><Check className="h-3.5 w-3.5 text-soi-accent" aria-hidden="true" /> Guardado (solo tú puedes escucharlo).</p>}
      {msg && <p role="alert" className="text-sm text-soi-danger">{msg}</p>}
    </div>
  );
}

/* ---------------- Fotografía ---------------- */
function PhotoRunner({ block, output, setOutput, runId }: V2Props) {
  const [busy, setBusy] = useState(false);
  const [msg, setMsg] = useState<string | null>(null);
  const [preview, setPreview] = useState<string | null>(null);
  const saved = useSigned(output.media);
  async function pick(file?: File) {
    if (!file) return;
    setBusy(true); setMsg(null);
    try {
      const blob = await compressImage(file);
      setPreview(URL.createObjectURL(blob));
      const { path } = await uploadMedia('run-media', blob, `runs/${runId ?? 'sin-run'}`);
      setOutput({ ...output, type: block.type, media: path, done: true });
    } catch (e) { setMsg((e as Error).message); }
    setBusy(false);
  }
  const src = preview ?? saved;
  return (
    <div className="flex flex-col items-center gap-4 text-center">
      <p className={lead}>{cfg<{ prompt: string }>(block).prompt}</p>
      {src && (
        // eslint-disable-next-line @next/next/no-img-element
        <img src={src} alt="Tu foto" className="max-h-72 w-auto rounded-[14px] object-contain" />
      )}
      <div className="flex gap-2">
        <label className={cn('press inline-flex h-11 cursor-pointer items-center gap-2 rounded-lg bg-soi-ink px-4 text-sm text-white', busy && 'opacity-60')}>
          <Camera className="h-4 w-4" aria-hidden="true" /> {busy ? 'Guardando…' : src ? 'Otra foto' : 'Tomar foto'}
          <input type="file" accept="image/*" capture="environment" className="sr-only" disabled={busy} onChange={(e) => pick(e.target.files?.[0])} />
        </label>
        <label className={cn('press inline-flex h-11 cursor-pointer items-center gap-2 rounded-lg px-4 text-sm shadow-ring', busy && 'opacity-60')}>
          <Upload className="h-4 w-4" aria-hidden="true" /> Galería
          <input type="file" accept="image/*" className="sr-only" disabled={busy} onChange={(e) => pick(e.target.files?.[0])} />
        </label>
      </div>
      {output.media && !busy && <p className="text-xs text-soi-muted">Solo tú puedes verla. Puedes compartirla después en Impulso.</p>}
      {msg && <p role="alert" className="text-sm text-soi-danger">{msg}</p>}
    </div>
  );
}

/* ---------------- Agenda ---------------- */
function tomorrow() {
  const d = new Date(Date.now() + 86_400_000);
  return `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}-${String(d.getDate()).padStart(2, '0')}`;
}
function icsFor(title: string, whenLocal: string) {
  const start = new Date(whenLocal);
  const end = new Date(start.getTime() + 30 * 60_000);
  const z = (d: Date) => d.toISOString().replace(/[-:]/g, '').replace(/\.\d{3}/, '');
  const body = ['BEGIN:VCALENDAR', 'VERSION:2.0', 'PRODID:-//SOI//ES', 'BEGIN:VEVENT', `UID:${crypto.randomUUID()}@soi.app`, `DTSTAMP:${z(new Date())}`,
    `DTSTART:${z(start)}`, `DTEND:${z(end)}`, `SUMMARY:${title.replace(/[,;\\]/g, ' ')}`, 'END:VEVENT', 'END:VCALENDAR'].join('\r\n');
  return `data:text/calendar;charset=utf-8,${encodeURIComponent(body)}`;
}
function AgendaRunner({ block, output, setOutput }: V2Props) {
  const c = cfg<{ prompt: string; defaultTime: string }>(block);
  const [date, setDate] = useState(output.date ?? tomorrow());
  const [time, setTime] = useState(output.time ?? c.defaultTime);
  const [title, setTitle] = useState(output.text ?? '');
  useEffect(() => {
    setOutput({ ...output, type: block.type, text: title, date, time, when: new Date(`${date}T${time}`).toISOString(), done: Boolean(title.trim()) });
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [date, time, title]);
  return (
    <div className="flex flex-col gap-3">
      <Label htmlFor={`ag-${block.id}`} className={lead}>{c.prompt}</Label>
      <Input id={`ag-${block.id}`} value={title} onChange={(e) => setTitle(e.target.value)} placeholder="Qué vas a hacer" maxLength={160} />
      <div className="grid grid-cols-2 gap-2">
        <Input aria-label="Día" type="date" value={date} onChange={(e) => setDate(e.target.value)} className="nums" />
        <Input aria-label="Hora" type="time" value={time} onChange={(e) => setTime(e.target.value)} className="nums" />
      </div>
      <p className="text-xs text-soi-muted">SOI te lo recordará. También puedes llevarlo a tu calendario.</p>
      {title.trim() && (
        <a href={icsFor(title, `${date}T${time}`)} download="soi.ics" className="press inline-flex h-9 w-fit items-center gap-1.5 rounded-lg px-3 text-sm shadow-ring">
          <Download className="h-4 w-4" aria-hidden="true" /> Agregar a mi calendario
        </a>
      )}
    </div>
  );
}

/* ---------------- Pomodoro ---------------- */
export function pomodoroPhase(elapsed: number, focus: number, rest: number, cycles: number) {
  const f = focus * 60, r = rest * 60;
  let t = elapsed;
  for (let i = 0; i < cycles; i++) {
    if (t < f) return { phase: 'focus' as const, cycle: i + 1, left: f - t };
    t -= f;
    if (i < cycles - 1) { if (t < r) return { phase: 'rest' as const, cycle: i + 1, left: r - t }; t -= r; } // descanso solo entre ciclos
  }
  return { phase: 'done' as const, cycle: cycles, left: 0 };
}
function PomodoroRunner({ block, elapsed, cue }: V2Props) {
  const c = cfg<{ focus: number; rest: number; cycles: number }>(block);
  const s = pomodoroPhase(elapsed, c.focus, c.rest, c.cycles);
  const prev = useRef(s.phase);
  useEffect(() => {
    if (prev.current === s.phase) return;
    prev.current = s.phase;
    if (s.phase === 'rest') cue?.('Descanso. Levántate, respira y mira lejos.', 'guide');
    else if (s.phase === 'focus') cue?.(`Ciclo ${s.cycle}. De vuelta al foco, una sola tarea.`, 'energy');
    else cue?.('Listo. Terminaste tu bloque de foco.', 'energy');
  }, [s.phase, s.cycle, cue]);
  return (
    <div className="flex flex-col items-center gap-2 text-center" aria-live="polite">
      <span className={cn('rounded-full px-3 py-1 text-sm font-medium', s.phase === 'focus' ? 'bg-soi-ink text-white' : 'bg-soi-accent-soft text-soi-accent')}>
        {s.phase === 'focus' ? 'Foco' : s.phase === 'rest' ? 'Descanso' : 'Listo'}
      </span>
      <p className="nums text-6xl font-light tracking-tight">{fmt(s.left)}</p>
      <p className="nums text-sm text-soi-muted">Ciclo {s.cycle} de {c.cycles} · {c.focus}/{c.rest} min</p>
      <p className="text-sm text-soi-muted">{s.phase === 'focus' ? 'Una sola tarea. Notificaciones fuera.' : 'Levántate, respira, mira lejos.'}</p>
    </div>
  );
}

/* ---------------- Contrato ---------------- */
function ContractRunner({ block, output, setOutput }: V2Props) {
  const c = cfg<{ commitment: string; consequence?: string }>(block);
  const [name, setName] = useState(output.text ?? '');
  const [agree, setAgree] = useState(Boolean(output.done));
  const today = new Date().toLocaleDateString('es', { day: 'numeric', month: 'long', year: 'numeric' });
  useEffect(() => {
    setOutput({ ...output, type: block.type, text: name, fields: { commitment: c.commitment, consequence: c.consequence ?? '' }, done: agree && name.trim().length >= 2, signedAt: agree ? new Date().toISOString() : undefined });
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [name, agree]);
  return (
    <div className="flex flex-col gap-4 rounded-[14px] bg-white p-5 shadow-ring">
      <p className="text-xs uppercase tracking-wide text-soi-muted">Contrato conmigo</p>
      <p className="text-balance text-xl font-medium leading-snug">{c.commitment}</p>
      {c.consequence && <p className="text-sm text-soi-muted">Si no lo cumplo: {c.consequence}</p>}
      <div>
        <Label htmlFor={`sig-${block.id}`}>Firma con tu nombre</Label>
        <Input id={`sig-${block.id}`} value={name} onChange={(e) => setName(e.target.value)} maxLength={80} className="font-[cursive] text-lg" />
      </div>
      <label className="flex items-center gap-2 text-sm">
        <input type="checkbox" checked={agree} onChange={(e) => setAgree(e.target.checked)} className="h-4 w-4 accent-soi-accent" /> Me comprometo · {today}
      </label>
    </div>
  );
}

/* ---------------- Revisión semanal ---------------- */
const REVIEW = [
  { key: 'wins', label: '¿Qué victorias tuviste esta semana, aunque sean pequeñas?' },
  { key: 'lessons', label: '¿Qué aprendiste?' },
  { key: 'letgo', label: '¿Qué vas a dejar ir?' },
] as const;
function WeeklyReviewRunner({ block, output, setOutput }: V2Props) {
  const c = cfg<{ focus?: string }>(block);
  const fields = output.fields ?? {};
  const prios = output.items ?? ['', '', ''];
  const update = (f: Record<string, string>, p: string[]) => setOutput({ ...output, type: block.type, fields: f, items: p, done: p.some((x) => x.trim()) });
  return (
    <div className="flex flex-col gap-4">
      {c.focus && <p className="text-sm text-soi-muted">Enfoque: {c.focus}</p>}
      {REVIEW.map((r) => (
        <div key={r.key}>
          <Label htmlFor={`wr-${r.key}`}>{r.label}</Label>
          <Textarea id={`wr-${r.key}`} rows={2} maxLength={800} value={fields[r.key] ?? ''} onChange={(e) => update({ ...fields, [r.key]: e.target.value }, prios)} />
        </div>
      ))}
      <fieldset>
        <legend className="mb-1 text-sm font-medium">Tus 3 prioridades para la próxima semana</legend>
        <div className="flex flex-col gap-1.5">
          {prios.map((v, i) => <Input key={i} aria-label={`Prioridad ${i + 1}`} value={v} maxLength={120} onChange={(e) => update(fields, prios.map((x, j) => (j === i ? e.target.value : x)))} />)}
        </div>
      </fieldset>
    </div>
  );
}

/* ---------------- Seguimiento ---------------- */
function TrackingRunner({ block, output, setOutput }: V2Props) {
  const c = cfg<{ metric: string; unit: string; target?: number }>(block);
  const v = output.value;
  return (
    <div className="flex flex-col items-center gap-3 text-center">
      <p className={lead}>{c.metric}</p>
      <div className="flex items-center gap-2">
        <Input aria-label={c.metric} type="number" inputMode="decimal" min={0} value={v ?? ''} className="nums w-32 text-center text-2xl"
          onChange={(e) => setOutput({ ...output, type: block.type, text: c.metric, fields: { unit: c.unit }, value: e.target.value === '' ? undefined : Number(e.target.value), done: e.target.value !== '' })} />
        {c.unit && <span className="text-soi-muted">{c.unit}</span>}
      </div>
      {c.target !== undefined && (
        <div className="w-full max-w-xs">
          <div className="h-1.5 overflow-hidden rounded-full bg-soi-tray">
            <div className="h-full origin-left rounded-full bg-soi-accent transition-transform duration-(--dur-base) ease-out-strong" style={{ transform: `scaleX(${Math.min(1, (v ?? 0) / (c.target || 1))})` }} />
          </div>
          <p className="nums mt-1 text-xs text-soi-muted">Meta: {c.target} {c.unit}</p>
        </div>
      )}
    </div>
  );
}

/* ---------------- Estiramiento ---------------- */
function StretchingRunner({ block, elapsed, cue }: V2Props) {
  const c = cfg<{ sequence: string[]; secondsEach: number; guides?: { frames?: string[]; videoId?: string }[] }>(block);
  const i = Math.min(c.sequence.length - 1, Math.floor(elapsed / c.secondsEach));
  const guide = c.guides?.[i];
  const left = c.secondsEach - (elapsed % c.secondsEach);
  const prev = useRef(i);
  useEffect(() => {
    if (prev.current === i) return;
    prev.current = i;
    cue?.(`Ahora: ${c.sequence[i]}.`, 'calm');
  }, [i, c.sequence, cue]);
  return (
    <div className="flex flex-col items-center gap-3 text-center" aria-live="polite">
      <p className="nums text-sm text-soi-muted">{i + 1} de {c.sequence.length}</p>
      {guide?.frames?.length ? (
        <ExerciseAnimation key={`f${i}`} frames={guide.frames} name={c.sequence[i]!} className="aspect-[4/3] w-full max-w-xs rounded-[20px] shadow-ring" />
      ) : guide?.videoId ? (
        <GuideVideo key={`v${i}`} id={guide.videoId} title={c.sequence[i]!} />
      ) : null}
      <p key={i} className="animate-step-in text-balance text-2xl font-medium">{c.sequence[i]}</p>
      <p className="nums text-4xl font-light">{fmt(left)}</p>
      {c.sequence[i + 1] && <p className="text-sm text-soi-muted">Después: {c.sequence[i + 1]}</p>}
    </div>
  );
}
