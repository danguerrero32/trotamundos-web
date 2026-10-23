// Lectura del Excel que exporta LastApp. Módulo puro: lo usa el servidor y lo carga también el navegador
// (/lib/lastapp.js) para avisar pronto si el archivo no vale. Acepta el export de productos
// (Id, Name, Price, Description, Image URL) y el de catálogo (ID del producto en la organización, Categoría, Nombre, Precio…).

export const normalizarTexto = (s) => String(s ?? '').toLowerCase().normalize('NFD').replace(/[̀-ͯ]/g, '')
  .replace(/[^a-z0-9]+/g, ' ').trim();

/** '19,00 €' | '1.234,50 €' | '€19.00' | 19 → número; vacío o sin número → null. */
export function parsePrecio(v) {
  if (typeof v === 'number') return Number.isFinite(v) ? Math.round(v * 100) / 100 : null;
  let t = String(v ?? '').replace(/[^\d,.-]/g, '');
  if (!/\d/.test(t)) return null;
  const coma = t.lastIndexOf(','), punto = t.lastIndexOf('.');
  if (coma >= 0 && punto >= 0) t = coma > punto ? t.replace(/\./g, '').replace(',', '.') : t.replace(/,/g, '');
  else if (coma >= 0) t = t.replace(',', '.');
  const n = parseFloat(t);
  return Number.isFinite(n) ? Math.round(n * 100) / 100 : null;
}

const ERROR_COLUMNAS = 'No reconozco este archivo. Esperaba las columnas Id, Name y Price (export de productos) o ID del producto en la organización, Nombre y Precio (export de catálogo).';

// Columnas reconocidas, ya normalizadas.
const COL = {
  idOrg: ['id del producto en la organizacion'],
  id: ['id'],
  nombre: ['name', 'nombre'],
  precio: ['price', 'precio'],
  descripcion: ['description', 'descripcion'],
  categoria: ['category', 'categoria'],
  imagen: ['image url', 'imagen', 'url de la imagen'],
};

function partirPuntoYComa(linea) {
  const out = []; let actual = '', comillas = false;
  for (const c of String(linea)) {
    if (c === '"') comillas = !comillas;
    else if (c === ';' && !comillas) { out.push(actual); actual = ''; }
    else actual += c;
  }
  out.push(actual);
  return out.map((x) => x.trim());
}

function indice(cabecera, nombres) {
  return cabecera.findIndex((c) => nombres.includes(c));
}

/** filas: lista de listas de celdas (como las da SheetJS con header:1). */
export function normalizarExport(filas, archivo = '') {
  let tabla = (Array.isArray(filas) ? filas : []).map((f) => (Array.isArray(f) ? f : [f]).map((c) => (c == null ? '' : c)));
  // CSV de Excel en español: cada fila llega como una sola celda separada por ";".
  if (tabla.slice(0, 10).some((f) => f.filter((c) => String(c).trim()).length === 1 && String(f[0]).includes(';'))) {
    tabla = tabla.map((f) => (f.length === 1 || f.slice(1).every((c) => String(c).trim() === '') ? partirPuntoYComa(f[0]) : f));
  }
  let formato = null, cab = -1, cols = null;
  for (let i = 0; i < Math.min(10, tabla.length) && !formato; i++) {
    const c = tabla[i].map(normalizarTexto);
    const nombre = indice(c, COL.nombre), precio = indice(c, COL.precio);
    if (nombre < 0 || precio < 0) continue;
    const idOrg = indice(c, COL.idOrg), id = indice(c, COL.id);
    if (idOrg >= 0) formato = 'catalogo';
    else if (id >= 0) formato = 'productos';
    else continue;
    cab = i;
    cols = { id: idOrg >= 0 ? idOrg : id, nombre, precio, descripcion: indice(c, COL.descripcion), categoria: indice(c, COL.categoria), imagen: indice(c, COL.imagen) };
  }
  if (!formato) return { ok: false, error: ERROR_COLUMNAS };
  const celda = (f, i) => (i >= 0 && f[i] != null ? String(f[i]).trim() : '');
  const vistos = new Set(), avisos = [], salida = [];
  for (const f of tabla.slice(cab + 1)) {
    const id = celda(f, cols.id), nombre = celda(f, cols.nombre);
    if (!id || !nombre) continue;
    if (vistos.has(id)) { avisos.push(`El producto ${nombre} (Id ${id}) aparece dos veces; se usa la primera.`); continue; }
    vistos.add(id);
    salida.push({
      id, nombre, precio: parsePrecio(cols.precio >= 0 ? f[cols.precio] : ''),
      descripcion: celda(f, cols.descripcion), categoria: celda(f, cols.categoria) || null, imagen: celda(f, cols.imagen),
    });
  }
  if (!salida.length) return { ok: false, error: 'El archivo no trae ningún producto.' };
  const m = String(archivo).match(/^catalog\.(.+?)-\d{2}-\d{2}-\d{4}\.(csv|xlsx?)$/i);
  return { ok: true, formato, catalogo: formato === 'catalogo' && m ? m[1] : null, filas: salida, avisos };
}
