// Idiomas de la web y limpieza de textos que escribe Daniel o que vienen de LastApp.
export const IDIOMAS = ['es', 'en', 'fr', 'ca'];
export const OTROS = ['en', 'fr', 'ca'];

export function limpiarTexto(s, max) {
  return String(s ?? '').replace(/[\u0000-\u001f\u007f]/g, '').trim().slice(0, max);
}

/** Las claves de un texto multilingüe que se publican: sin las vacías y, si está pendiente de traducir, solo el español. */
export const idiomasPublicables = (fila) => (fila && fila.traduccion && fila.traduccion.pendiente ? ['es'] : IDIOMAS);
