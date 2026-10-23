// Idiomas de la web y limpieza de textos que escribe Daniel o que vienen de LastApp.
//
// El panel trabaja solo en español: de cada texto se edita la clave `es` y nada más.
// Las claves en, fr y ca existen en la base de datos porque la web pública sigue en cuatro
// idiomas y los 48 platos de hoy ya las traen escritas a mano: no se tocan ni se borran.
// Un plato nuevo o importado solo tiene `es`, y la web, al no encontrar su idioma, enseña
// el español. Las otras versiones son una fase aparte.
export const IDIOMAS = ['es', 'en', 'fr', 'ca'];
export const OTROS = ['en', 'fr', 'ca'];

/** Los textos multilingües de cada tabla. */
export const CAMPOS = {
  platos: ['nombre', 'descripcion', 'nota_precio'],
  categorias: ['nombre'],
  actividades: ['nombre', 'descripcion'],
};

export function limpiarTexto(s, max) {
  return String(s ?? '').replace(/[\u0000-\u001f\u007f]/g, '').trim().slice(0, max);
}
