import { asSchema, jsonSchema, type ToolSet } from 'ai';

const CONSTRAINTS = new Set(['minimum', 'maximum', 'exclusiveMinimum', 'exclusiveMaximum', 'minLength', 'maxLength', 'minItems', 'maxItems', 'pattern']);

/** Quita límites numéricos y de longitud de un JSON Schema (recursivo). La forma y los tipos se mantienen. */
export function stripConstraints<T>(schema: T): T {
  if (Array.isArray(schema)) return schema.map(stripConstraints) as T;
  if (!schema || typeof schema !== 'object') return schema;
  const out: Record<string, unknown> = {};
  for (const [k, v] of Object.entries(schema as Record<string, unknown>)) {
    if (CONSTRAINTS.has(k)) continue;
    out[k] = stripConstraints(v);
  }
  return out as T;
}

/**
 * Algunos proveedores (Groq) validan la llamada a la herramienta en su servidor y, si el modelo se sale de un
 * mínimo o máximo, cortan TODA la respuesta. Al modelo le enviamos el esquema sin límites y validamos con el
 * esquema estricto aquí: si falla, el modelo recibe el error como resultado de la herramienta y puede corregir.
 */
export function relaxTools<T extends ToolSet>(tools: T): T {
  const out: Record<string, unknown> = {};
  for (const [name, t] of Object.entries(tools)) {
    const strict = asSchema((t as { inputSchema: Parameters<typeof asSchema>[0] }).inputSchema);
    out[name] = {
      ...t,
      inputSchema: jsonSchema(async () => stripConstraints(await strict.jsonSchema), {
        validate: (value) => (strict.validate ? strict.validate(value) : { success: true, value }),
      }),
    };
  }
  return out as T;
}
