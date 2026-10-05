/** Contenido guiado (meditación, afirmaciones, manifestación): tipos y conversión a bloques. Puro, sirve en cliente y servidor. */
export type GuidedKind = 'meditation' | 'affirmations' | 'manifestation';
export type MeditationContent = { title: string; technique: string; script: string; source: string };
export type AffirmationsContent = { title: string; affirmations: string[]; source: string };
export type ManifestationContent = { title: string; desire: string; assumption: string; scene: string; feeling: string; action: string; source: string };
export type GuidedContent =
  | { kind: 'meditation'; content: MeditationContent }
  | { kind: 'affirmations'; content: AffirmationsContent }
  | { kind: 'manifestation'; content: ManifestationContent };

export const GUIDED_LABEL: Record<GuidedKind, string> = { meditation: 'Meditación', affirmations: 'Afirmaciones', manifestation: 'Manifestación' };

/** Contenido de un recurso guardado → config del bloque correspondiente. */
export function blockConfigFor(g: GuidedContent, itemId?: string | null): { type: 'meditation' | 'affirmation' | 'manifestation'; title: string; config: Record<string, unknown>; source: string } {
  const ref = itemId ? { itemId } : {};
  if (g.kind === 'meditation') return { type: 'meditation', title: g.content.title, source: g.content.source, config: { guide: g.content.script, ...ref } };
  if (g.kind === 'affirmations') {
    const [first, ...rest] = g.content.affirmations;
    return { type: 'affirmation', title: g.content.title, source: g.content.source, config: { text: first ?? g.content.title, items: [first, ...rest].filter(Boolean), repeat: 1, ...ref } };
  }
  return {
    type: 'manifestation', title: g.content.title, source: g.content.source,
    config: { desire: g.content.desire, assumption: g.content.assumption, scene: g.content.scene, feeling: g.content.feeling, action: g.content.action, ...ref },
  };
}
