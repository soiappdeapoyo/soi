import { describe, expect, it } from 'vitest';
import { splitTitle, wordHtmlToMarkdown } from '@/lib/legal';

describe('wordHtmlToMarkdown', () => {
  it('convierte encabezados, párrafos, énfasis y enlaces', () => {
    const md = wordHtmlToMarkdown('<h1>Términos</h1><p>Hola <strong>mundo</strong> y <em>tú</em> &amp; <a href="https://soi.app">SOI</a></p><h2>Uso</h2><p>Texto</p>');
    expect(md).toBe('# Términos\n\nHola **mundo** y *tú* & [SOI](https://soi.app)\n\n## Uso\n\nTexto');
  });

  it('convierte listas numeradas y anidadas', () => {
    const md = wordHtmlToMarkdown('<ol><li>Uno<ul><li>a</li><li>b</li></ul></li><li>Dos</li></ol><p>Fin</p>');
    expect(md).toBe('1. Uno\n   - a\n   - b\n2. Dos\n\nFin');
  });

  it('quita etiquetas desconocidas e imágenes', () => {
    expect(wordHtmlToMarkdown('<p><img src="x.png" />Solo <span>texto</span></p>')).toBe('Solo texto');
  });
});

describe('splitTitle', () => {
  it('usa el primer H1 como título', () => {
    expect(splitTitle('# Aviso de **privacidad**\n\nCuerpo')).toEqual({ title: 'Aviso de privacidad', body: 'Cuerpo' });
  });
  it('sin H1 no hay título', () => {
    expect(splitTitle('## Sección\n\nCuerpo')).toEqual({ title: null, body: '## Sección\n\nCuerpo' });
  });
});
