import { describe, expect, it } from 'vitest';
import { USER_TABLES, deleteConfirmed, exportFileName, mergeRows, sanitizeRow } from '@/lib/account/rules';

describe('exportar y borrar la cuenta', () => {
  it('la exportación no lleva vectores ni llaves del aviso push', () => {
    expect(sanitizeRow({ id: 1, content: 'hola', embedding: [0.1], push_subscription: { keys: {} } })).toEqual({ id: 1, content: 'hola' });
  });

  it('une las filas de varias columnas sin repetir', () => {
    const rows = mergeRows([[{ id: 'a' }, { id: 'b' }], [{ id: 'b' }, { id: 'c' }], [{ user_id: 'x', day: 1 }, { user_id: 'x', day: 1 }]]);
    expect(rows).toEqual([{ id: 'a' }, { id: 'b' }, { id: 'c' }, { user_id: 'x', day: 1 }]);
  });

  it('confirma solo con BORRAR', () => {
    expect(deleteConfirmed(' borrar ')).toBe(true);
    expect(deleteConfirmed('BORRAR')).toBe(true);
    expect(deleteConfirmed('borra')).toBe(false);
    expect(deleteConfirmed(null)).toBe(false);
  });

  it('nombre del archivo con la fecha y sin tablas de administración', () => {
    expect(exportFileName(new Date('2026-10-23T12:00:00Z'))).toBe('soi-mis-datos-2026-10-23.json');
    for (const t of ['admin_audit', 'admin_analyses', 'app_settings', 'legal_documents']) expect(USER_TABLES[t]).toBeUndefined();
    expect(USER_TABLES.messages).toEqual(['user_id']);
  });
});
