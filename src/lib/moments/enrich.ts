import type { SupabaseClient } from '@supabase/supabase-js';
import type { UserProfile } from '@/types/database';
import type { ActionBlock } from '@/config/actions';
import {
  blockConfigFor, generateAffirmations, generateManifestation, generateMeditation, personalContext, saveGuided,
} from '@/lib/ai/content-agents';

const MEDITATE = /medit|silencio|calma|coheren|escaneo|relaja/i;
const MANIFEST = /manifi?est|asun|sats|deseo cumplido|neville/i; // "manifiesta" y "manifestación"
const AFFIRM = /afirma|declara/i;

/** ¿Este bloque promete contenido guiado pero no lo tiene? (lo que hoy dice "medita" y solo da tiempo). */
export function needsContent(b: ActionBlock): 'meditation' | 'affirmations' | 'manifestation' | 'visualization' | null {
  const c = b.config as Record<string, unknown>;
  const len = (k: string) => String(c[k] ?? '').trim().length;
  if (b.type === 'meditation') return len('guide') < 280 ? 'meditation' : null;
  if (b.type === 'affirmation') return !Array.isArray(c.items) || (c.items as unknown[]).length < 3 ? 'affirmations' : null;
  if (b.type === 'manifestation') return len('scene') < 120 || /lo que deseo vivir/i.test(String(c.desire)) ? 'manifestation' : null;
  if (b.type === 'visualization') return len('scene') < 120 ? 'visualization' : null;
  // Pasos de solo tiempo que en realidad son guiados ("Medita", "Manifiesta tu deseo", "Afirma").
  if (b.type === 'timer' && len('instruction') < 140) {
    if (MANIFEST.test(b.title)) return 'manifestation';
    if (MEDITATE.test(b.title)) return 'meditation';
    if (AFFIRM.test(b.title)) return 'affirmations';
  }
  return null;
}

/**
 * Completa con los agentes generadores (Calma, Voz Interior, Asunción) los bloques sin contenido,
 * personalizados con lo que SOI sabe de la persona. Cada pieza se guarda también en su biblioteca.
 */
export async function enrichGuidedBlocks(
  supabase: SupabaseClient, userId: string, profile: UserProfile | null, blocks: ActionBlock[], intention: string,
): Promise<{ blocks: ActionBlock[]; changed: boolean }> {
  const todo = blocks.map((b) => needsContent(b));
  if (!todo.some(Boolean)) return { blocks, changed: false };
  const ctx = await personalContext(supabase, userId, profile, intention);

  const out = await Promise.all(blocks.map(async (b, i) => {
    const need = todo[i];
    if (!need) return b;
    const focus = `${intention}. Paso: ${b.title}`;
    try {
      if (need === 'meditation') {
        const content = await generateMeditation(ctx, focus, Math.max(2, b.minutes || 5));
        const g = { kind: 'meditation' as const, content };
        const itemId = await saveGuided(supabase, userId, g, focus, b.minutes);
        const cfg = blockConfigFor(g, itemId);
        return { ...b, type: 'meditation' as const, config: cfg.config, source: b.source ?? cfg.source };
      }
      if (need === 'affirmations') {
        const content = await generateAffirmations(ctx, focus);
        const g = { kind: 'affirmations' as const, content };
        const itemId = await saveGuided(supabase, userId, g, focus);
        const cfg = blockConfigFor(g, itemId);
        return { ...b, type: 'affirmation' as const, config: cfg.config, source: b.source ?? cfg.source };
      }
      const content = await generateManifestation(ctx, focus);
      if (need === 'visualization') return { ...b, config: { ...b.config, scene: content.scene } };
      const g = { kind: 'manifestation' as const, content };
      const itemId = await saveGuided(supabase, userId, g, focus);
      const cfg = blockConfigFor(g, itemId);
      return { ...b, type: 'manifestation' as const, config: cfg.config, source: b.source ?? cfg.source };
    } catch (error) {
      console.error('[enrich]', need, error instanceof Error ? error.message : error);
      return b; // si el agente no responde, el bloque queda como estaba (el Moment sigue funcionando)
    }
  }));
  return { blocks: out, changed: out.some((b, i) => b !== blocks[i]) };
}
