import Link from 'next/link';
import { Check, MessageCircle, Play } from 'lucide-react';
import { PlayLink } from '@/components/today/play-link';
import { FIRST_STEPS, type FirstStepId, type NextStep } from '@/lib/journey';
import { cn } from '@/lib/utils';

const CTA = 'press tap-target mt-4 flex w-full items-center justify-center gap-2 rounded-[14px] bg-white py-3.5 text-[17px] font-semibold text-soi-ink';

/**
 * El siguiente paso del loop principal, como UNA tarjeta con UN botón (Hoy). Mientras son los primeros pasos,
 * debajo se ve dónde va (hecho · ahora · después): la persona siempre sabe qué sigue y por qué.
 */
export function NextStepCard({ step, steps }: { step: NextStep; steps: { done: FirstStepId[]; current: FirstStepId } | null }) {
  const plays = step.kind === 'first_moment' || step.kind === 'resume';
  return (
    <section aria-labelledby="siguiente" className="rounded-[28px] bg-soi-ink p-2 text-white">
      <div className="px-4 pb-4 pt-4">
        <p className="text-xs font-medium text-white/60">Tu siguiente paso</p>
        <h2 id="siguiente" className="mt-1 text-balance text-[22px] font-semibold leading-snug">{step.title}</h2>
        <p className="mt-1 text-[15px] text-white/75">{step.detail}</p>
        {step.progress != null && (
          <div className="mt-3 h-1 overflow-hidden rounded-full bg-white/20" role="progressbar" aria-valuenow={step.progress} aria-valuemin={0} aria-valuemax={100} aria-label="Avance">
            <div className="h-full origin-left rounded-full bg-white" style={{ transform: `scaleX(${step.progress / 100})` }} />
          </div>
        )}
        {/* Reproducir: el toque habilita la voz en iOS (PlayLink); conversar: un enlace normal. */}
        {plays ? (
          <PlayLink href={step.href} prefetch label={step.cta} className={CTA}><Play className="h-5 w-5 fill-current" aria-hidden="true" /> {step.cta}</PlayLink>
        ) : (
          <Link href={step.href} prefetch className={CTA}><MessageCircle className="h-5 w-5" aria-hidden="true" /> {step.cta}</Link>
        )}
      </div>
      {steps && (
        <ol aria-label="Tus primeros pasos" className="flex flex-col gap-1 rounded-[20px] bg-white/[0.06] p-3">
          {FIRST_STEPS.map((f, i) => {
            const done = steps.done.includes(f.id);
            const now = steps.current === f.id;
            return (
              <li key={f.id} aria-current={now ? 'step' : undefined} className="flex items-center gap-2.5 text-sm">
                <span className={cn('nums flex h-6 w-6 shrink-0 items-center justify-center rounded-full text-xs',
                  done ? 'bg-soi-gold text-soi-ink' : now ? 'bg-white text-soi-ink' : 'bg-white/10 text-white/60')}>
                  {done ? <Check className="h-3.5 w-3.5" aria-label="Hecho" /> : i + 1}
                </span>
                <span className={cn(done ? 'text-white/55 line-through decoration-white/30' : now ? 'font-medium text-white' : 'text-white/60')}>{f.label}</span>
              </li>
            );
          })}
        </ol>
      )}
    </section>
  );
}
