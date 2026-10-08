import { describe, expect, it } from 'vitest';
import { buildPortrait, CAPACITY_TRAIT } from '@/lib/identity/portrait';
import { CAPACITIES } from '@/config/capacities';

const base = { identities: [], capacities: [], evidence: [], vision: { aim: null, target: null, goals: [] } };

describe('Tu historia como retrato', () => {
  it('todas las capacidades tienen su rasgo', () => {
    for (const c of CAPACITIES) expect(CAPACITY_TRAIT[c]).toBeTruthy();
  });

  it('muestra en quién se convierte y sus rasgos, sin fechas', () => {
    const p = buildPortrait({
      identities: [{ name: 'Una persona serena', evidenceCount: 2 }, { name: 'Una líder', evidenceCount: 5 }],
      capacities: [{ name: 'Calma', xp: 6 }, { name: 'Enfoque', xp: 1 }],
      evidence: [
        { kind: 'regreso', title: 'Volviste después de 3 días', note: null },
        { kind: 'reflexion', title: 'Respira', note: 'Me di cuenta de que puedo parar antes de explotar' },
        { kind: 'reflexion', title: 'Respira', note: 'Me di cuenta de que puedo parar antes de explotar' },
        { kind: 'logro', title: 'Hablé en la junta', note: 'Hablé en la junta sin temblar la voz' },
      ],
      vision: { aim: 'Dirigir mi propio estudio de diseño', target: null, goals: [] },
    });
    expect(p.becoming).toEqual(['Una líder', 'Una persona serena']);
    expect(p.traits[0]).toBe(CAPACITY_TRAIT.Constancia);
    expect(p.traits).toContain(CAPACITY_TRAIT.Calma);
    expect(p.traits).not.toContain(CAPACITY_TRAIT.Enfoque); // poca evidencia todavía
    expect(p.traits).toContain('se detiene a escucharse y pone en palabras lo que siente');
    expect(p.future).toBe('Dirigir mi propio estudio de diseño');
    expect(JSON.stringify(p)).not.toMatch(/\d{4}-\d{2}-\d{2}|lunes|martes|enero|oct/i);
  });

  it('sin propósito usa sus metas; sin nada, vacío', () => {
    expect(buildPortrait({ ...base, vision: { aim: null, target: null, goals: ['Correr 10 km', 'Leer 12 libros', 'Otra'] } }).future).toBe('Correr 10 km · Leer 12 libros');
    expect(buildPortrait(base)).toEqual({ becoming: [], traits: [], future: null });
  });
});
