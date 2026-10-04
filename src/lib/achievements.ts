import { EVIDENCE_MILESTONES, STREAK_MILESTONES } from '@/config/navigation';

export type Achievement = { id: string; label: string; detail: string; unlocked: boolean };

export type AchievementInput = {
  streakLongest: number;
  evidences: number;
  moments: number;
  sharedMoments: number;
  implementations: number;
  completedImplementations: number;
  videoReflections: number;
  isCreator: boolean;
};

/** Logros derivados de lo que ya existe (sin tabla nueva). Lo no logrado se muestra como "por lograr", sin castigo. */
export function computeAchievements(i: AchievementInput): Achievement[] {
  return [
    ...STREAK_MILESTONES.map((m) => ({ id: `streak-${m}`, label: `Racha de ${m} días`, detail: 'Constancia sin castigo', unlocked: i.streakLongest >= m })),
    ...EVIDENCE_MILESTONES.map((m) => ({ id: `evidence-${m}`, label: `${m} evidencias`, detail: 'Pruebas de tu nueva identidad', unlocked: i.evidences >= m })),
    { id: 'first-moment', label: 'Primer momento', detail: 'Convertiste una idea en acción', unlocked: i.moments > 0 },
    { id: 'first-reflection', label: 'Inspiración que se volvió idea', detail: 'Reflexionaste después de un video', unlocked: i.videoReflections > 0 },
    { id: 'first-shared', label: 'Inspiraste a alguien', detail: 'Compartiste un momento', unlocked: i.sharedMoments > 0 },
    { id: 'first-blueprint', label: 'Primer sistema en práctica', detail: 'Implementaste un Blueprint', unlocked: i.implementations > 0 },
    { id: 'blueprint-done', label: 'Sistema completado', detail: 'Terminaste un Blueprint', unlocked: i.completedImplementations > 0 },
    { id: 'creator', label: 'Transformation Creator', detail: 'Compartes tu método', unlocked: i.isCreator },
  ];
}
