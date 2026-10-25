import { requireAdmin } from '@/lib/admin/auth';
import { hablame } from '@/lib/admin/data';
import type { Rate } from '@/lib/admin/hablame';

const n = (v: number) => new Intl.NumberFormat('es').format(v);
const pct = (r: Rate) => (r.pct === null ? '—' : `${r.pct} %`);
const of = (r: Rate) => (r.den ? `${r.num} de ${r.den}` : 'aún sin personas con edad suficiente');
const signed = (v: number | null, unit = '') => (v === null ? '—' : `${v > 0 ? '+' : ''}${v}${unit}`);

type Tile = { k: string; v: string; d?: string };

function Tiles({ tiles }: { tiles: Tile[] }) {
  return (
    <dl className="nums mt-3 grid grid-cols-2 gap-2 sm:grid-cols-4">
      {tiles.map((t) => (
        <div key={t.k} className="rounded-[14px] bg-white p-4 shadow-ring">
          <dt className="text-xs text-soi-muted">{t.k}</dt>
          <dd className="mt-1 text-2xl font-semibold">{t.v}</dd>
          {t.d && <dd className="text-xs text-soi-muted">{t.d}</dd>}
        </div>
      ))}
    </dl>
  );
}

function Section({ title, note, children }: { title: string; note?: string; children: React.ReactNode }) {
  return (
    <section className="mt-7">
      <h2 className="text-lg font-semibold">{title}</h2>
      {note && <p className="text-xs text-soi-muted">{note}</p>}
      {children}
    </section>
  );
}

/**
 * ¿Háblame de verdad ayuda? De dónde llegan (SOI vs. /persons/entrar), si practican, si vuelven y si conversan mejor
 * (habilidades del coach y señales en sus propios mensajes). Sin demo, sin administración y sin el texto de nadie.
 */
export default async function HablamePanel() {
  await requireAdmin();
  const r = await hablame();
  const tone = r.verdict.tone === 'good' ? 'bg-[#E7F3EF] text-[#0B3B1E]' : r.verdict.tone === 'bad' ? 'bg-[#FDECEC] text-[#7A1F1F]' : 'bg-white text-soi-ink';
  const before = (b: number | null, a: number | null, unit = ' %') => `${b ?? '—'}${unit} → ${a ?? '—'}${unit}`;

  return (
    <>
      <h1 className="text-2xl font-semibold">Háblame</h1>
      <p className="mt-1 text-sm text-soi-muted">Últimos 120 días. Cuentas de /persons, separadas de SOI. Solo eventos y emociones calculados por reglas: nunca el texto de los mensajes.</p>

      <section className={`mt-5 rounded-[18px] p-5 shadow-ring ${tone}`} aria-label="Veredicto">
        <p className="text-xs font-semibold uppercase tracking-wide opacity-70">¿Les ayuda?</p>
        <p className="mt-1 text-xl font-semibold">{r.verdict.label}</p>
        <p className="mt-1 text-sm opacity-80">{r.verdict.detail}</p>
      </section>

      <Section title="De dónde llegan" note="Visitantes únicos (cookie anónima). La landing de SOI lleva a SOI; /persons/entrar crea cuentas de Háblame. Una cuenta de SOI que entra por /persons sigue siendo de SOI.">
        <div className="mt-3 grid gap-2 sm:grid-cols-2">
          {[
            { t: 'SOI (landing → /login)', rows: [['Vieron la landing', r.acquisition.soi.landing], ['Llegaron a /login', r.acquisition.soi.login], ['Se registraron', r.acquisition.soi.signups], ['Cuentas nuevas', r.acquisition.soi.accounts]] },
            { t: 'Háblame (/persons/entrar)', rows: [['Llegaron a /persons/entrar', r.acquisition.persons.login], ['Se registraron', r.acquisition.persons.signups], ['Cuentas nuevas', r.acquisition.persons.accounts], ['Llegaron por invitación', r.acquisition.persons.referred]] },
          ].map((c) => (
            <div key={c.t} className="rounded-[14px] bg-white p-4 shadow-ring">
              <h3 className="text-sm font-semibold">{c.t}</h3>
              <dl className="nums mt-2 grid gap-1 text-sm">
                {c.rows.map(([k, v]) => <div key={k as string} className="flex justify-between gap-3"><dt className="text-soi-muted">{k}</dt><dd className="font-medium">{n(v as number)}</dd></div>)}
              </dl>
            </div>
          ))}
        </div>
      </Section>

      <Section title="Activación" note="Cuentas de Háblame con 2+ días. Practicó = 3+ mensajes; plática completa = 5+ mensajes seguidos (sin pausas de 25 min).">
        <Tiles tiles={[
          { k: 'Creó o agregó a alguien', v: pct(r.activation.createdPersona), d: of(r.activation.createdPersona) },
          { k: 'Mandó su primer mensaje', v: pct(r.activation.firstMessage), d: of(r.activation.firstMessage) },
          { k: 'Practicó (3+ mensajes)', v: pct(r.activation.practiced), d: of(r.activation.practiced) },
          { k: 'Tuvo una plática completa', v: pct(r.activation.fullSession), d: of(r.activation.fullSession) },
        ]} />
      </Section>

      <Section title="Retención" note="Volver = practicar otro día.">
        <Tiles tiles={[
          { k: 'Día 1 (volvió al día siguiente)', v: pct(r.retention.d1), d: of(r.retention.d1) },
          { k: 'Semana 2 (días 7 a 13)', v: pct(r.retention.w2), d: of(r.retention.w2) },
          { k: 'Días que practica (promedio)', v: r.retention.daysPracticed === null ? '—' : String(r.retention.daysPracticed) },
          { k: 'Pláticas por persona', v: r.retention.sessionsPerUser === null ? '—' : String(r.retention.sessionsPerUser), d: r.retention.messagesPerSession === null ? undefined : `${r.retention.messagesPerSession} mensajes por plática` },
        ]} />
      </Section>

      <Section title="¿Conversan mejor? Habilidades del coach" note={`Primer feedback de Ale vs. el último (1–5, promedio de las 6 habilidades). Personas con 2+ feedbacks: ${r.skills.people}. Bajaron 0.5+: ${r.skills.worsened}.`}>
        <Tiles tiles={[
          { k: 'Primer feedback → último', v: `${r.skills.first ?? '—'} → ${r.skills.last ?? '—'}`, d: `cambio ${signed(r.skills.change)}` },
          { k: 'Mejoraron 0.5+ puntos', v: pct(r.skills.improved), d: of(r.skills.improved) },
        ]} />
        <div className="mt-2 overflow-x-auto rounded-[14px] bg-white p-4 shadow-ring">
          <table className="nums w-full min-w-[22rem] text-sm">
            <thead><tr className="text-left text-xs text-soi-muted"><th className="pb-1 font-medium">Habilidad</th><th className="pb-1 text-right font-medium">Cambio promedio</th></tr></thead>
            <tbody>
              {r.skills.perSkill.map((s) => (
                <tr key={s.id} className="border-t border-black/[0.05]">
                  <td className="py-1.5">{s.label}</td>
                  <td className={`py-1.5 text-right font-medium ${s.change === null ? 'text-soi-muted' : s.change > 0 ? 'text-[#117A3E]' : s.change < 0 ? 'text-soi-danger' : ''}`}>{signed(s.change)}</td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </Section>

      <Section title="¿Conversan mejor? Señales en sus mensajes" note={`Sus primeros 10 mensajes vs. los últimos 10 (personas con 20+ mensajes: ${r.signals.people}). Aciertos = preguntar por la otra persona, contar algo propio, humor. Tropiezos = hablar solo de sí, genérico, cumplido físico pronto, mensajes muy largos, cruzar o insistir tras un límite.`}>
        <Tiles tiles={[
          { k: 'Preguntan por la otra persona', v: before(r.signals.curiosity.before, r.signals.curiosity.after) },
          { k: 'Mensajes con aciertos', v: before(r.signals.good.before, r.signals.good.after) },
          { k: 'Mensajes con tropiezos', v: before(r.signals.bad.before, r.signals.bad.after) },
          { k: 'Mejoró su balance', v: pct(r.signals.improved), d: of(r.signals.improved) },
        ]} />
        <p className="mt-2 text-xs text-soi-muted">Apertura del personaje al leerlos (0–100): {before(r.signals.openness.before, r.signals.openness.after, '')}. Si sube, la otra persona se abre más con cómo escriben.</p>
      </Section>

      <Section title="Coach (Ale) y funciones">
        <Tiles tiles={[
          { k: 'Recibieron feedback', v: pct(r.coach.withFeedback), d: `${n(r.coach.feedbacks)} feedbacks · ${pct(r.coach.aiShare)} con IA` },
          { k: 'Le preguntaron algo a Ale', v: pct(r.coach.askedAle), d: of(r.coach.askedAle) },
          { k: 'Reacciones a mensajes', v: n(r.features.reactions), d: `${n(r.features.reactors)} personas` },
          { k: 'Notas de voz escuchadas', v: n(r.features.voiceHeard) },
        ]} />
      </Section>

      <Section title="Planes e invitaciones" note="Conversión = Plus entre quienes ya terminaron la prueba.">
        <Tiles tiles={[
          { k: 'En prueba · Free · Plus', v: `${n(r.money.trial)} · ${n(r.money.free)} · ${n(r.money.plus)}` },
          { k: 'Conversión a Plus', v: pct(r.money.conversion), d: of(r.money.conversion) },
          { k: 'Invitaciones', v: n(r.referrals.signups), d: `${n(r.referrals.inviters)} personas invitaron` },
          { k: 'Invitados que practicaron', v: pct(r.referrals.activated), d: `${n(r.referrals.days)} días regalados` },
        ]} />
      </Section>

      <Section title="Seguridad">
        <Tiles tiles={[
          { k: 'Señales de crisis', v: n(r.safety.crisis), d: 'en chats y con Ale' },
          { k: 'Descripciones bloqueadas', v: n(r.safety.blockedDescriptions), d: 'persona real, menor o sexual' },
          { k: 'Mensajes bloqueados', v: n(r.safety.blockedTurns), d: 'no llegaron al personaje' },
        ]} />
      </Section>
    </>
  );
}
