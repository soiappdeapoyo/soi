import type { Eslabon } from './agents';

/** 8 espejos emocionales (Onboarding Brian Tracy + principio SOI). */
export const MIRROR_CARDS = [
  { id: 'estancada', emoji: '🪨', title: 'Me siento estancada/o', hint: 'Hago lo mismo y nada cambia.', eslabon: 'accion' },
  { id: 'ansiedad', emoji: '🌪️', title: 'Vivo con ansiedad', hint: 'Mi mente no se apaga.', eslabon: 'emocion' },
  { id: 'no_suficiente', emoji: '🪞', title: 'No me siento suficiente', hint: 'Me comparo todo el tiempo.', eslabon: 'pensamiento' },
  { id: 'dinero', emoji: '💸', title: 'El dinero no me alcanza', hint: 'Siento escasez constante.', eslabon: 'pensamiento' },
  { id: 'proposito', emoji: '🧭', title: 'Busco mi propósito', hint: 'Sé que hay algo más para mí.', eslabon: 'pensamiento' },
  { id: 'disciplina', emoji: '⏳', title: 'Empiezo y no termino', hint: 'Me falta constancia.', eslabon: 'accion' },
  { id: 'relaciones', emoji: '💞', title: 'Mis relaciones me pesan', hint: 'Doy más de lo que recibo.', eslabon: 'emocion' },
  { id: 'sin_pruebas', emoji: '🔍', title: 'No veo resultados', hint: 'Practico, pero no noto cambios.', eslabon: 'resultado' },
] as const satisfies readonly { id: string; emoji: string; title: string; hint: string; eslabon: Eslabon }[];

export type MirrorCardId = (typeof MIRROR_CARDS)[number]['id'];

export const TIME_OPTIONS = [5, 15, 35, 60] as const;

export const SOI_PRINCIPLE_LINE =
  'Lo que piensas se vuelve lo que sientes; lo que sientes se vuelve lo que haces; lo que haces se vuelve tu resultado.';
