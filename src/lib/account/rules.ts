/**
 * Exportar y borrar una cuenta (puro y testeado). La lista sale de las llaves foráneas a `auth.users`:
 * borrar al usuario de Auth borra en cascada todo lo suyo (salvo lo que se conserva, ver `KEPT_AFTER_DELETE`).
 */

/** Tabla → columnas que la hacen de la persona. Sin tablas de administración (auditoría, ajustes, términos). */
export const USER_TABLES: Record<string, readonly string[]> = {
  user_profiles: ['user_id'],
  conversations: ['user_id'],
  messages: ['user_id'],
  agent_knowledge: ['user_id'],
  soi_openers: ['user_id'],
  moment_runs: ['user_id'],
  soi_blueprints: ['creator_id'],
  soi_moments: ['creator_id'],
  moment_interactions: ['user_id'],
  momentum_events: ['user_id'],
  blueprint_implementations: ['user_id'],
  blueprint_purchases: ['user_id', 'creator_id'],
  challenge_enrollments: ['user_id'],
  day_plans: ['user_id'],
  daily_routines: ['user_id'],
  ritual_logs: ['user_id'],
  library_items: ['user_id'],
  identities: ['user_id'],
  identity_links: ['user_id'],
  identity_stories: ['user_id'],
  enemy_events: ['user_id'],
  life_maps: ['user_id'],
  life_assessments: ['user_id'],
  life_reviews: ['user_id'],
  life_chapters: ['user_id'],
  wellbeing_observations: ['user_id'],
  wellbeing_estimates: ['user_id'],
  creator_profiles: ['user_id'],
  soi_posts: ['author_id'],
  post_likes: ['user_id'],
  post_saves: ['user_id'],
  post_reports: ['user_id'],
  community_posts: ['user_id'],
  community_reactions: ['user_id'],
  follows: ['follower_id', 'followee_id'],
  user_blocks: ['blocker_id'],
  dm_threads: ['user_a', 'user_b'],
  dm_messages: ['sender_id'],
  dm_reads: ['user_id'],
  dm_reports: ['reporter_id'],
  notifications: ['user_id'],
  notification_log: ['user_id'],
  tts_usage: ['user_id'],
  legal_acceptances: ['user_id'],
  moment_drafts: ['claimed_by'],
  nav_events: ['user_id'],
  funnel_events: ['user_id'],
};

/** Buckets de Storage con la carpeta `<user_id>/` de cada persona. */
export const USER_BUCKETS = ['post-media', 'moment-assets', 'run-media', 'library'] as const;

/** Lo técnico o secreto no viaja en la exportación: vectores de búsqueda y llaves del aviso push. */
const STRIP = new Set(['embedding', 'push_subscription']);

export function sanitizeRow(row: Record<string, unknown>): Record<string, unknown> {
  const out: Record<string, unknown> = {};
  for (const [k, v] of Object.entries(row)) if (!STRIP.has(k)) out[k] = v;
  return out;
}

/** Une filas de varias columnas (p. ej. `follows` como quien sigue y como seguido) sin repetir. */
export function mergeRows(groups: Record<string, unknown>[][]): Record<string, unknown>[] {
  const seen = new Set<string>();
  const out: Record<string, unknown>[] = [];
  for (const rows of groups) for (const r of rows) {
    const key = r.id !== undefined ? String(r.id) : JSON.stringify(r);
    if (seen.has(key)) continue;
    seen.add(key);
    out.push(r);
  }
  return out;
}

/**
 * Se conserva sin la cuenta (la llave queda en null): las constancias del consentimiento legal (prueba de qué aceptó y
 * cuándo) y el embudo anónimo. Los borradores del chat de la landing que reclamó se borran aparte (traen lo que escribió).
 */
export const KEPT_AFTER_DELETE = ['legal_acceptances', 'funnel_events'] as const;

/** La palabra que la persona escribe para confirmar el borrado. */
export const DELETE_WORD = 'BORRAR';

export function deleteConfirmed(text: string | null | undefined): boolean {
  return (text ?? '').trim().toUpperCase() === DELETE_WORD;
}

export function exportFileName(date: Date = new Date()): string {
  return `soi-mis-datos-${date.toISOString().slice(0, 10)}.json`;
}
