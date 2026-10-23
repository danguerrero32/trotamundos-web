// Carta pública que lee la web: la misma forma que el objeto MD que tenía index.html,
// agrupada por categorías. Se cachea un minuto en el borde de Vercel.
import { rest } from './supa.js';
import { idiomasPublicables } from './idiomas.js';

export function precioWeb(n) {
  if (n === null || n === undefined || n === '') return '';
  const x = Number(n);
  return Number.isFinite(x) ? x.toFixed(2) : '';
}

function textos(destino, prefijo, valor, idiomas) {
  for (const l of idiomas) {
    const t = valor && valor[l];
    if (t) destino[prefijo + l] = t;
  }
}

export function platoAWeb(row) {
  const idiomas = idiomasPublicables(row);
  const w = {};
  textos(w, '', row.nombre, idiomas);
  textos(w, 'desc_', row.descripcion, idiomas);
  textos(w, 'pnote_', row.nota_precio, idiomas);
  w.p = precioWeb(row.precio);
  w.ico = row.emoji || '';
  return w;
}

const porOrden = (a, b) => (a.orden ?? 0) - (b.orden ?? 0);

export function componerCarta({ categorias, platos }) {
  const vivos = (platos || []).filter((p) => p.visible && !p.archivado).sort(porOrden);
  const out = [];
  for (const c of [...(categorias || [])].filter((x) => x.visible).sort(porOrden)) {
    const suyos = vivos.filter((p) => p.categoria_id === c.id).map(platoAWeb);
    if (!suyos.length) continue;
    const cat = { slug: c.id };
    textos(cat, '', c.nombre, idiomasPublicables(c));
    cat.platos = suyos;
    out.push(cat);
  }
  return { origen: 'bd', categorias: out };
}

export async function cartaPublica({ s, fetch }) {
  const [categorias, platos] = await Promise.all([
    rest(s, fetch, 'categorias?select=id,nombre,orden,visible,traduccion&visible=eq.true&order=orden.asc'),
    rest(s, fetch, 'platos?select=categoria_id,nombre,descripcion,nota_precio,precio,emoji,orden,visible,archivado,traduccion&visible=eq.true&archivado=eq.false&order=orden.asc,creado_en.asc'),
  ]);
  return componerCarta({ categorias, platos });
}
