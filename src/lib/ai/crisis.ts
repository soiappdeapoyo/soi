const CRISIS_PATTERNS = [
  /no quiero (seguir )?vivir/i, /me quiero (morir|matar)/i, /suicid/i,
  /autolesi/i, /cortarme/i, /no vale la pena (vivir|seguir)/i,
  /desaparecer para siempre/i,
];

/** Siempre activa, incluso en Free sin consultas. La seguridad está por encima del paywall. */
export function detectCrisis(text: string): boolean {
  return CRISIS_PATTERNS.some((p) => p.test(text));
}
