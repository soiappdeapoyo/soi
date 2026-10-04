/**
 * IDs de modelo configurables por entorno. Los proveedores retiran modelos con frecuencia
 * (gemini-2.0-flash, deepseek-chat y llama-3.3-70b-versatile se apagaron en 2026):
 * cambiar de modelo no debe requerir un deploy de código, solo una variable.
 */
export const MODELS = {
  gemini: process.env.AI_MODEL_GEMINI || 'gemini-3.8-flash',
  groq: process.env.AI_MODEL_GROQ || 'openai/gpt-oss-120b',
  deepseek: process.env.AI_MODEL_DEEPSEEK || 'deepseek-v4-flash',
  embedding: process.env.AI_MODEL_EMBEDDING || 'gemini-embedding-2',
} as const;

/** Dimensión de la columna `agent_knowledge.embedding` (VECTOR(768)). */
export const EMBEDDING_DIMENSIONS = 768;

/** Un proveedor solo entra en la cascada si su clave está configurada. */
export function hasKey(provider: 'gemini' | 'groq' | 'deepseek', env: Record<string, string | undefined> = process.env) {
  const key = { gemini: env.GOOGLE_GENERATIVE_AI_API_KEY, groq: env.GROQ_API_KEY, deepseek: env.DEEPSEEK_API_KEY }[provider];
  return Boolean(key && key.trim());
}
