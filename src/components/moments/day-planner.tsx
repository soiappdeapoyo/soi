'use client';

import { useEffect, useMemo, useRef, useState } from 'react';
import Link from 'next/link';
import { toast } from 'sonner';
import { Check, GripVertical, Play, Plus, Search, X } from 'lucide-react';
import { DndContext, KeyboardSensor, PointerSensor, TouchSensor, closestCenter, useSensor, useSensors, type DragEndEvent } from '@dnd-kit/core';
import { SortableContext, arrayMove, sortableKeyboardCoordinates, useSortable, verticalListSortingStrategy } from '@dnd-kit/sortable';
import { CSS } from '@dnd-kit/utilities';
import { Dialog } from '@/components/ui/dialog';
import { Button, buttonClass } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Icon } from '@/components/ui/icon';
import { ACTIONS } from '@/config/actions';
import { nextPending, partOfDay, PART_LABEL, PART_SUGGEST, refOf, type DayItemView } from '@/lib/day-plan';
import type { MomentFlow } from '@/lib/moments/types';
import { cn } from '@/lib/utils';

type Props = { initial: DayItemView[]; options: MomentFlow[]; suggestions: MomentFlow[] };

const newId = () => Math.random().toString(36).slice(2, 10);

/**
 * Mi día: los Moments que quieres vivir hoy, en el orden que elijas (arrastrar o flechas de teclado),
 * con hora opcional. Lo hecho hoy se marca solo; "Ahora" señala el siguiente según tu hora local.
 */
export function DayPlanner({ initial, options, suggestions }: Props) {
  const [items, setItems] = useState(initial);
  const [picker, setPicker] = useState(false);
  const [q, setQ] = useState('');
  const [now, setNow] = useState(() => new Date());
  const first = useRef(true);
  const timer = useRef<ReturnType<typeof setTimeout>>(undefined);

  // Hora local del dispositivo (se actualiza cada minuto): decide "Ahora" y la parte del día.
  useEffect(() => { const t = setInterval(() => setNow(new Date()), 60_000); return () => clearInterval(t); }, []);
  const part = partOfDay(now.getHours());
  const next = useMemo(() => nextPending(items, now.getHours(), now.getMinutes()), [items, now]);
  const doneCount = items.filter((i) => i.done).length;

  // Guardado automático (orden, horas, altas y bajas).
  useEffect(() => {
    if (first.current) { first.current = false; return; }
    clearTimeout(timer.current);
    timer.current = setTimeout(async () => {
      const res = await fetch('/api/day-plan', {
        method: 'PUT', headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ items: items.map(({ id, ref, time }) => ({ id, ref, ...(time ? { time } : {}) })) }),
      });
      if (!res.ok) toast('No se pudo guardar tu día.');
    }, 500);
    return () => clearTimeout(timer.current);
  }, [items]);

  const sensors = useSensors(
    useSensor(PointerSensor, { activationConstraint: { distance: 6 } }),
    useSensor(TouchSensor, { activationConstraint: { delay: 180, tolerance: 6 } }),
    useSensor(KeyboardSensor, { coordinateGetter: sortableKeyboardCoordinates }),
  );
  function onDragEnd(e: DragEndEvent) {
    const { active, over } = e;
    if (!over || active.id === over.id) return;
    setItems((xs) => arrayMove(xs, xs.findIndex((x) => x.id === active.id), xs.findIndex((x) => x.id === over.id)));
  }

  function add(m: MomentFlow) {
    if (items.length >= 20) { toast('Tu día ya tiene 20 Moments.'); return; }
    setItems((xs) => [...xs, { id: newId(), ref: refOf(m), moment: m, done: false }]);
    toast(`«${m.title}» agregado a tu día`);
  }

  const inPlan = new Set(items.map((i) => i.ref));
  const filtered = options.filter((m) => !q.trim() || m.title.toLowerCase().includes(q.trim().toLowerCase()));
  const sugg = suggestions.filter((m) => !inPlan.has(refOf(m)));

  return (
    <div className="flex flex-col gap-6">
      <section aria-label="Tu progreso de hoy" className="rounded-[20px] bg-white p-4 shadow-ring">
        <div className="flex items-baseline justify-between gap-3">
          <p className="text-[15px] font-medium">
            {items.length === 0 ? 'Diseña tu día con los Moments que quieres vivir.'
              : doneCount === items.length ? '¡Viviste todo lo que planeaste hoy!'
              : doneCount === 0 ? `Buen${part === 'manana' ? 'os días' : part === 'tarde' ? 'as tardes' : 'as noches'}. Tu día te espera.`
              : 'Vas avanzando. Un Moment a la vez.'}
          </p>
          {items.length > 0 && <span className="nums shrink-0 text-sm text-soi-muted">{doneCount} de {items.length}</span>}
        </div>
        {items.length > 0 && (
          <div className="mt-3 h-2 overflow-hidden rounded-full bg-soi-tray" role="progressbar" aria-valuemin={0} aria-valuemax={items.length} aria-valuenow={doneCount} aria-label="Moments hechos hoy">
            <div className="h-full origin-left rounded-full bg-soi-accent-fill transition-transform duration-300 ease-out-strong" style={{ transform: `scaleX(${items.length ? doneCount / items.length : 0})` }} />
          </div>
        )}
      </section>

      <section aria-labelledby="dia-lista">
        <div className="mb-2 flex items-center justify-between gap-2">
          <h2 id="dia-lista" className="text-sm font-medium text-soi-muted">Mi día</h2>
          <Button size="sm" variant="outline" onClick={() => setPicker(true)}><Plus className="h-4 w-4" aria-hidden="true" /> Agregar Moment</Button>
        </div>
        {items.length ? (
          <DndContext sensors={sensors} collisionDetection={closestCenter} onDragEnd={onDragEnd}>
            <SortableContext items={items.map((i) => i.id)} strategy={verticalListSortingStrategy}>
              <ol className="flex flex-col gap-1.5 rounded-[20px] bg-soi-sidebar p-1.5">
                {items.map((it) => (
                  <Row key={it.id} item={it} isNext={it.id === next}
                    onTime={(time) => setItems((xs) => xs.map((x) => (x.id === it.id ? { ...x, time: time || undefined } : x)))}
                    onRemove={() => setItems((xs) => xs.filter((x) => x.id !== it.id))} />
                ))}
              </ol>
            </SortableContext>
          </DndContext>
        ) : (
          <p className="rounded-[14px] bg-soi-sidebar p-4 text-sm text-soi-muted">Agrega tus Moments en el orden en que quieres vivirlos: por ejemplo, el ritual al despertar, una pausa a media tarde y SATS antes de dormir.</p>
        )}
      </section>

      {sugg.length > 0 && (
        <section aria-labelledby="dia-sug">
          <h2 id="dia-sug" className="mb-2 text-sm font-medium text-soi-muted">Para esta {PART_LABEL[part]} · {PART_SUGGEST[part].why}</h2>
          <ul className="-mx-4 flex gap-3 overflow-x-auto px-4 pb-1 [scrollbar-width:none] sm:-mx-5 sm:px-5 [&::-webkit-scrollbar]:hidden">
            {sugg.map((m) => (
              <li key={refOf(m)} className="w-36 shrink-0">
                <button type="button" onClick={() => add(m)} className="press block w-full text-left" aria-label={`Agregar ${m.title} a mi día`}>
                  <Thumb m={m} className="aspect-[4/5] w-full rounded-[14px]" />
                  <span className="mt-1.5 line-clamp-2 block text-sm font-medium leading-snug">{m.title}</span>
                  <span className="nums inline-flex items-center gap-1 text-xs text-soi-accent"><Plus className="h-3 w-3" aria-hidden="true" /> {m.required_minutes} min</span>
                </button>
              </li>
            ))}
          </ul>
        </section>
      )}

      <Dialog open={picker} onOpenChange={setPicker} title="Agregar a mi día">
        <div className="relative">
          <Search className="pointer-events-none absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-soi-subtle" aria-hidden="true" />
          <label htmlFor="dia-q" className="sr-only">Buscar Moment</label>
          <Input id="dia-q" value={q} onChange={(e) => setQ(e.target.value)} placeholder="Buscar en tus Moments y los oficiales" className="pl-9" />
        </div>
        <ul className="mt-3 flex max-h-[55dvh] flex-col gap-1 overflow-y-auto">
          {filtered.map((m) => (
            <li key={refOf(m)}>
              <button type="button" onClick={() => add(m)} className="press flex w-full items-center gap-3 rounded-lg p-2 text-left hover:bg-soi-sidebar">
                <Thumb m={m} className="h-12 w-12 shrink-0 rounded-lg" />
                <span className="min-w-0 flex-1">
                  <span className="block truncate text-sm font-medium">{m.title}</span>
                  <span className="nums block text-xs text-soi-muted">{m.required_minutes} min{m.official ? ` · Oficial · ${m.author}` : ''}</span>
                </span>
                {inPlan.has(refOf(m)) ? <Check className="h-4 w-4 text-soi-accent" aria-label="Ya está en tu día" /> : <Plus className="h-4 w-4 text-soi-subtle" aria-hidden="true" />}
              </button>
            </li>
          ))}
          {!filtered.length && <li className="py-6 text-center text-sm text-soi-muted">Sin resultados.</li>}
        </ul>
      </Dialog>
    </div>
  );
}

function Thumb({ m, className }: { m: MomentFlow; className?: string }) {
  return m.cover
    // eslint-disable-next-line @next/next/no-img-element
    ? <img src={m.cover} alt="" loading="lazy" className={cn('object-cover', className)} />
    : <span aria-hidden="true" className={cn('flex items-center justify-center bg-soi-accent-soft text-soi-accent', className)}><Icon name={ACTIONS[m.blocks[0]?.type ?? 'timer']?.icon ?? 'Sparkles'} className="h-5 w-5" /></span>;
}

function Row({ item, isNext, onTime, onRemove }: { item: DayItemView; isNext: boolean; onTime: (t: string) => void; onRemove: () => void }) {
  const m = item.moment!;
  const { attributes, listeners, setNodeRef, setActivatorNodeRef, transform, transition, isDragging } = useSortable({
    id: item.id, transition: { duration: 200, easing: 'cubic-bezier(0.23, 1, 0.32, 1)' },
  });
  return (
    <li ref={setNodeRef} style={{ transform: CSS.Translate.toString(transform), transition }}
      className={cn('relative flex items-center gap-2 rounded-[14px] bg-white p-2 pr-2.5 shadow-ring', isDragging && 'z-10 shadow-raised', isNext && !item.done && 'shadow-[0_0_0_2px_var(--color-soi-accent)]')}>
      <button type="button" ref={setActivatorNodeRef} {...attributes} {...listeners} aria-label={`Mover ${m.title}`}
        className="flex h-11 w-6 shrink-0 cursor-grab touch-none items-center justify-center text-soi-subtle hover:text-soi-ink active:cursor-grabbing">
        <GripVertical className="h-4 w-4" aria-hidden="true" />
      </button>
      <Thumb m={m} className={cn('h-12 w-12 shrink-0 rounded-lg', item.done && 'opacity-60')} />
      <div className="min-w-0 flex-1">
        <p className={cn('truncate text-[15px] font-medium', item.done && 'text-soi-muted line-through decoration-soi-subtle')}>{m.title}</p>
        <p className="nums flex items-center gap-1.5 text-xs text-soi-muted">
          {item.done ? <span className="inline-flex items-center gap-0.5 font-medium text-soi-accent"><Check className="h-3.5 w-3.5" aria-hidden="true" /> Hecho hoy</span>
            : isNext ? <span className="font-medium text-soi-accent">Ahora</span> : null}
          <span>{m.required_minutes} min</span>
        </p>
      </div>
      <label className="sr-only" htmlFor={`t-${item.id}`}>Hora para {m.title}</label>
      <input id={`t-${item.id}`} type="time" value={item.time ?? ''} onChange={(e) => onTime(e.target.value)}
        className="nums h-9 w-[5.5rem] shrink-0 rounded-lg bg-soi-sidebar px-1.5 text-sm text-soi-ink" />
      {!item.done && (
        <Link href={`/m/${m.id}/play`} aria-label={`Comenzar ${m.title}`} className={buttonClass(isNext ? 'primary' : 'ghost', 'icon', 'h-9 w-9 shrink-0 rounded-lg')}>
          <Play className="h-4 w-4" aria-hidden="true" />
        </Link>
      )}
      <button type="button" onClick={onRemove} aria-label={`Quitar ${m.title} de mi día`} className="press flex h-9 w-7 shrink-0 items-center justify-center rounded-lg text-soi-subtle hover:text-soi-ink">
        <X className="h-4 w-4" aria-hidden="true" />
      </button>
    </li>
  );
}
