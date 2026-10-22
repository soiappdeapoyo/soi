import { detectCrisis, normalize } from '@/lib/ai/crisis';

/**
 * Lo que no les sirvió en el chat (puro y testeado), para /panel/analyticsAI: frases de la persona que dicen que
 * SOI no le ayudó ("esto no me sirve", "no me entiendes", "muy largo"…), con el agente y lo que SOI dijo justo antes.
 * Nunca se analizan conversaciones con señales de crisis. Los ejemplos se recortan y se les quitan correos,
 * teléfonos y enlaces: sirven para mejorar la app, no para identificar a nadie.
 */

export type ComplaintId = 'no_sirve' | 'no_entiende' | 'repetitivo' | 'largo' | 'generico' | 'no_propongas' | 'robotico' | 'tecnico';

export const COMPLAINTS: { id: ComplaintId; label: string; re: RegExp; fix: string }[] = [
  {
    id: 'no_sirve', label: 'No le sirve / no le ayuda',
    re: /\b(no me (sirve|sirvio|ayuda|ayudo|ayudaste|funciona|funciono|late|convence|aporta)|no me esta(s)? ayudando|(esto|eso|esta app|la app) no sirve|no sirve(s)? (de nada|para nada)|inutil)\b/,
    fix: 'Revisar qué propuso SOI justo antes (ejemplos) y ajustar el agente: src/lib/ai/prompts/agent-specs.ts y el ritmo escuchar → entender → proponer (src/lib/ai/proposal-gate.ts).',
  },
  {
    id: 'no_entiende', label: 'Siente que SOI no la entendió',
    re: /\b(no me (entiendes|entendiste|escuchas|estas escuchando)|no entendiste|no (es|era) (lo que|eso)|no te (pregunte|pedi) eso|no (dije|quise decir) eso|me malinterpret\w*)\b/,
    fix: 'Validar y reflejar con sus palabras antes de responder (bloque de escucha de src/lib/ai/prompts/template.ts) y usar lo entendido (src/lib/ai/understanding.ts).',
  },
  {
    id: 'repetitivo', label: 'Repetitivo',
    re: /\b(ya me (lo )?(dijiste|preguntaste|habias dicho)|otra vez (lo mismo|eso|con eso)|siempre (me )?(dices|preguntas) lo mismo|(te )?repites|lo mismo de siempre|me sigues preguntando)\b/,
    fix: 'Evitar repetir preguntas y propuestas: historial y continuidad (src/lib/ai/continuity.ts), reglas de no insistir (proposal-gate.ts) y ganchos del saludo sin repetir (src/lib/opener-hooks.ts).',
  },
  {
    id: 'largo', label: 'Respuestas demasiado largas',
    re: /\b((muy|demasiado|super) larg[oa]s?|(mas|algo) (corto|breve)|resumelo|resume(lo)? por favor|no voy a leer (todo )?eso|mucho texto)\b/,
    fix: 'Acortar: estilo conciso en src/lib/ai/prompts/template.ts y tope de tokens por respuesta (/panel/ajustes).',
  },
  {
    id: 'generico', label: 'Genérico o de manual',
    re: /\b(muy general|generic[oa]|de manual|cliche|eso lo dice cualquiera|frases? hechas?|consejo de libro)\b/,
    fix: 'Personalizar con su contexto (perfil, Norte, memoria): src/lib/ai/prompts/index.ts y el requisito `understanding` de createMoment (src/lib/ai/tools.ts).',
  },
  {
    id: 'no_propongas', label: 'No quería una propuesta',
    re: /\b(no quiero (un |una |otro |otra |mas )?(moment|ejercicio|meditacion|rutina|practica|video)s?|solo quiero (hablar|platicar|conversar|desahogarme|que me escuches)|deja de (proponer|mandarme|darme))\b/,
    fix: 'Respetar el modo conversar: modo `talk` y `isActionTopic` en src/lib/ai/proposal-gate.ts; no ofrecer propuestas sin permiso.',
  },
  {
    id: 'robotico', label: 'Suena a robot',
    re: /\b(pareces (un )?robot|suenas a (bot|robot|maquina)|hablas como (un |una )?(bot|robot|maquina)|eres (un )?bot)\b/,
    fix: 'Tono más humano y menos plantilla: estilo de src/lib/ai/prompts/template.ts y variar aperturas (opener-ai.ts).',
  },
  {
    id: 'tecnico', label: 'Falla técnica',
    re: /\b(no (carga|cargo|se escucha|suena|abre|se abre|funciona el (audio|video|boton|reproductor))|se (trabo|congelo|colgo|cerro)|(da|sale|marca|aparece) (un )?error|no me deja)\b/,
    fix: 'Revisar logs de Vercel y /api/ai/diagnostico; reproductor y voz (src/components/moments/moment-player.tsx, src/lib/voice/).',
  },
];

/** Las quejas que hay en un mensaje (vacío si no hay, o si es crisis). */
export function detectComplaints(text: string): ComplaintId[] {
  if (!text || detectCrisis(text)) return [];
  const t = normalize(text);
  return COMPLAINTS.filter((c) => c.re.test(t)).map((c) => c.id);
}

/** Recorte sin datos de contacto. */
export function redact(text: string, max = 220): string {
  const clean = text
    .replace(/[\w.+-]+@[\w-]+\.[\w.]+/g, '[correo]')
    .replace(/https?:\/\/\S+|www\.\S+/g, '[enlace]')
    .replace(/\+?\d[\d\s().-]{7,}\d/g, '[teléfono]')
    .replace(/\s+/g, ' ')
    .trim();
  return clean.length > max ? `${clean.slice(0, max - 1)}…` : clean;
}

export type UserMsg = { id: string; conversation_id: string; user_id: string; content: string; created_at: string; agent_category: string | null };
/** Lo que SOI dijo justo antes de la queja. */
export type PrevReply = { content: string; agent: string | null; provider: string | null; tools: string[] };

export type ConversationExample = {
  category: ComplaintId; said: string; before: string | null; agent: string | null; provider: string | null; tools: string[];
  /** Número de mensaje de la persona en la conversación (1 = el primero). */
  position: number;
  /** Fue su último mensaje en la conversación: se fue después de decirlo. */
  leftAfter: boolean;
  /** Para abrir la conversación en el panel (no viaja a la IA ni al texto copiado). */
  ref: { user: string; conversation: string };
};

export type ConversationInsights = {
  conversations: number;
  withComplaint: number;
  complaints: number;
  leftAfter: number;
  oneMessage: number;
  avgUserMessages: number;
  crisisExcluded: number;
  byCategory: { id: ComplaintId; label: string; count: number }[];
  byAgent: { agent: string; conversations: number; withComplaint: number }[];
  byProvider: { provider: string; complaints: number }[];
  examples: ConversationExample[];
};

/** Mensajes de la persona con queja (para pedir después lo que SOI dijo antes de cada uno). */
export function complaintHits(msgs: UserMsg[]) {
  const crisisConvs = new Set(msgs.filter((m) => detectCrisis(m.content)).map((m) => m.conversation_id));
  return msgs.filter((m) => !crisisConvs.has(m.conversation_id))
    .map((m) => ({ msg: m, categories: detectComplaints(m.content) }))
    .filter((h) => h.categories.length);
}

export function analyzeConversations(msgs: UserMsg[], prev: Map<string, PrevReply>, maxExamples = 14): ConversationInsights {
  const crisisConvs = new Set(msgs.filter((m) => detectCrisis(m.content)).map((m) => m.conversation_id));
  const byConv = new Map<string, UserMsg[]>();
  for (const m of msgs) {
    if (crisisConvs.has(m.conversation_id)) continue;
    byConv.set(m.conversation_id, [...(byConv.get(m.conversation_id) ?? []), m]);
  }
  for (const list of byConv.values()) list.sort((a, b) => Date.parse(a.created_at) - Date.parse(b.created_at));

  const cat = new Map<ComplaintId, number>();
  const agents = new Map<string, { conversations: Set<string>; withComplaint: Set<string> }>();
  const providers = new Map<string, number>();
  const complained = new Set<string>();
  const examples: ConversationExample[] = [];
  let complaints = 0, leftAfter = 0;

  for (const [conv, list] of byConv) {
    const convAgent = list.find((m) => m.agent_category)?.agent_category ?? 'sin agente';
    list.forEach((m, i) => {
      const found = detectComplaints(m.content);
      const p = prev.get(m.id);
      const agent = p?.agent ?? m.agent_category ?? convAgent;
      const a = agents.get(agent) ?? { conversations: new Set(), withComplaint: new Set() };
      a.conversations.add(conv);
      agents.set(agent, a);
      if (!found.length) return;
      complaints++;
      complained.add(conv);
      a.withComplaint.add(conv);
      const last = i === list.length - 1;
      if (last) leftAfter++;
      for (const c of found) cat.set(c, (cat.get(c) ?? 0) + 1);
      if (p?.provider) providers.set(p.provider, (providers.get(p.provider) ?? 0) + 1);
      examples.push({
        category: found[0]!, said: redact(m.content), before: p ? redact(p.content, 280) : null,
        agent, provider: p?.provider ?? null, tools: p?.tools ?? [], position: i + 1, leftAfter: last,
        ref: { user: m.user_id, conversation: conv },
      });
    });
  }

  // Ejemplos variados: primero uno por categoría (los que se fueron después, antes), luego el resto.
  examples.sort((x, y) => Number(y.leftAfter) - Number(x.leftAfter));
  const picked: ConversationExample[] = [];
  for (const c of COMPLAINTS) { const e = examples.find((x) => x.category === c.id); if (e) picked.push(e); }
  for (const e of examples) if (picked.length < maxExamples && !picked.includes(e)) picked.push(e);

  const convs = [...byConv.values()];
  return {
    conversations: convs.length,
    withComplaint: complained.size,
    complaints,
    leftAfter,
    oneMessage: convs.filter((l) => l.length === 1).length,
    avgUserMessages: convs.length ? Math.round((convs.reduce((s, l) => s + l.length, 0) / convs.length) * 10) / 10 : 0,
    crisisExcluded: crisisConvs.size,
    byCategory: COMPLAINTS.map((c) => ({ id: c.id, label: c.label, count: cat.get(c.id) ?? 0 })).filter((c) => c.count).sort((a, b) => b.count - a.count),
    byAgent: [...agents].map(([agent, a]) => ({ agent, conversations: a.conversations.size, withComplaint: a.withComplaint.size }))
      .sort((a, b) => b.withComplaint - a.withComplaint || b.conversations - a.conversations),
    byProvider: [...providers].map(([provider, n]) => ({ provider, complaints: n })).sort((a, b) => b.complaints - a.complaints),
    examples: picked.slice(0, maxExamples),
  };
}
