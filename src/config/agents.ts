export const AGENTS = {
  manifestacion: { id: 'manifestacion', label: 'Manifestaciones', icon: 'Sparkles', color: '#D4AF37', eslabon: 'pensamiento', sources: ['Neville Goddard', 'Joe Dispenza'] },
  afirmacion: { id: 'afirmacion', label: 'Afirmaciones', icon: 'Heart', color: '#E8A0BF', eslabon: 'pensamiento', sources: ['Napoleon Hill', 'Hal Elrod'] },
  meditacion: { id: 'meditacion', label: 'Meditaciones', icon: 'Brain', color: '#8FB8DE', eslabon: 'emocion', sources: ['Joe Dispenza', 'Hal Elrod'] },
  suenos: { id: 'suenos', label: 'Sueños', icon: 'Moon', color: '#7B6FB0', eslabon: 'emocion', sources: ['Neville Goddard', 'Carl Jung'] },
  riqueza: { id: 'riqueza', label: 'Riqueza', icon: 'TrendingUp', color: '#C9A227', eslabon: 'accion', sources: ['Napoleon Hill', 'Brian Tracy'] },
  rutinas: { id: 'rutinas', label: 'Rutinas', icon: 'Clock', color: '#5DADE2', eslabon: 'accion', sources: ['Brian Tracy', 'Hal Elrod', 'Robin Sharma', 'Joe Dispenza'] },
  napoleon_hill: { id: 'napoleon_hill', label: 'Napoleon Hill', icon: 'Crown', color: '#B8860B', eslabon: 'accion', sources: ['Napoleon Hill'] },
  brian_tracy: { id: 'brian_tracy', label: 'Brian Tracy', icon: 'Target', color: '#E67E22', eslabon: 'accion', sources: ['Brian Tracy'] },
  evidencias: { id: 'evidencias', label: 'Evidencias', icon: 'Star', color: '#F1C40F', eslabon: 'resultado', sources: [] },
  anti_sycophant: { id: 'anti_sycophant', label: 'Verdad', icon: 'Compass', color: '#8B8B8B', eslabon: 'pensamiento', sources: [] },
  crisis: { id: 'crisis', label: 'Apoyo', icon: 'LifeBuoy', color: '#E85C4A', eslabon: null, sources: [] },
} as const;

export type AgentId = keyof typeof AGENTS;
export type Eslabon = 'pensamiento' | 'emocion' | 'accion' | 'resultado';
export const AGENT_IDS = Object.keys(AGENTS) as [AgentId, ...AgentId[]];

/** Agentes visibles en el sidebar (sección PRÁCTICAS). */
export const PRACTICE_AGENTS: AgentId[] = [
  'napoleon_hill', 'manifestacion', 'afirmacion', 'meditacion', 'suenos', 'riqueza', 'rutinas', 'brian_tracy',
];

/** Eslabón roto → agente que interviene (Consecuencia arquitectónica). */
export const ESLABON_TO_AGENT: Record<Eslabon, AgentId> = {
  pensamiento: 'afirmacion',
  emocion: 'meditacion',
  accion: 'rutinas',
  resultado: 'evidencias',
};

export const ESLABON_LABEL: Record<Eslabon, string> = {
  pensamiento: 'Pensamientos',
  emocion: 'Emociones',
  accion: 'Acciones',
  resultado: 'Resultados',
};

export function isAgentId(v: unknown): v is AgentId {
  return typeof v === 'string' && v in AGENTS;
}
