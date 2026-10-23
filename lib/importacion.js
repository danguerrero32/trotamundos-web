// Importación del Excel de LastApp: vista previa por grupos (la forma de uploads/importacion-demo.json)
// y aplicación en una sola operación con la función aplicar_importacion() de la base de datos. Sin IA.
import { rest, rpc } from './supa.js';
import { normalizarExport, normalizarTexto } from './lastapp.js';
import { precioWeb } from './carta.js';

export const UMBRAL_INCOMPLETO = 0.5;
const UMBRAL_PARECIDO = 0.5;

function bigramas(s) {
  const t = normalizarTexto(s).replace(/ /g, '');
  const b = [];
  for (let i = 0; i < t.length - 1; i++) b.push(t.slice(i, i + 2));
  return b;
}

/** Coeficiente de Dice sobre bigramas: 1 = iguales, 0 = nada en común. */
function dice(a, b) {
  const x = bigramas(a), y = bigramas(b);
  if (!x.length || !y.length) return 0;
  const resto = [...y]; let comunes = 0;
  for (const g of x) { const i = resto.indexOf(g); if (i >= 0) { comunes++; resto.splice(i, 1); } }
  return (2 * comunes) / (x.length + y.length);
}

const mismoPrecio = (a, b) => (a == null && b == null) || (a != null && b != null && Math.round(Number(a) * 100) === Math.round(Number(b) * 100));
const fuente = (formato, catalogo) => (formato === 'catalogo' ? `catálogo «${catalogo || 'sin nombre'}»` : 'export de productos');

export function vistaPrevia({ filas, formato, catalogo, platos, productos, ultima }) {
  const lista = platos || [];
  const vinculados = new Map(lista.filter((p) => p.lastapp_id).map((p) => [p.lastapp_id, p]));
  const sinVincular = lista.filter((p) => !p.lastapp_id && !p.archivado);
  const prod = new Map((productos || []).map((p) => [p.id, p]));
  const g = { nuevos: [], precio: [], nombre: [], desaparecidos: [], sin_cambios: [], no_web: [] };

  for (const f of filas || []) {
    const p = vinculados.get(f.id);
    if (p) {
      const nombre = p.nombre && p.nombre.es;
      let cambia = false;
      // El precio de un plato vinculado lo manda LastApp, siempre. Un plato cuyo precio
      // lo pone Daniel no está vinculado, así que no pasa por aquí.
      if (!mismoPrecio(p.precio, f.precio) && f.precio != null) {
        cambia = true;
        g.precio.push({ plato_id: p.id, nombre, antes: precioWeb(p.precio), despues: precioWeb(f.precio) });
      }
      if ((p.lastapp_nombre || '') !== f.nombre) { cambia = true; g.nombre.push({ plato_id: p.id, nombre_web: nombre, antes: p.lastapp_nombre || '', despues: f.nombre }); }
      if (!cambia) g.sin_cambios.push({ plato_id: p.id, nombre });
      continue;
    }
    if (prod.get(f.id) && prod.get(f.id).no_web) { g.no_web.push({ lastapp_id: f.id, nombre: f.nombre }); continue; }
    const igual = sinVincular.find((s) => normalizarTexto(s.nombre && s.nombre.es) === normalizarTexto(f.nombre));
    const parecidos = sinVincular.filter((s) => s !== igual)
      .map((s) => ({ plato_id: s.id, nombre: s.nombre.es, d: dice(s.nombre.es, f.nombre) }))
      .filter((x) => x.d >= UMBRAL_PARECIDO).sort((a, b) => b.d - a.d).slice(0, 3)
      .map(({ plato_id, nombre }) => ({ plato_id, nombre }));
    g.nuevos.push({ lastapp_id: f.id, nombre: f.nombre, precio: precioWeb(f.precio), categoria_lastapp: f.categoria || null,
      sugerencia: igual ? { destino: 'mismo', plato_id: igual.id } : null, parecidos });
  }

  const enArchivo = new Set((filas || []).map((f) => f.id));
  const activos = [...vinculados.values()].filter((p) => !p.archivado);
  for (const p of activos) if (!enArchivo.has(p.lastapp_id)) g.desaparecidos.push({ plato_id: p.id, nombre: p.nombre.es, lastapp_nombre: p.lastapp_nombre || '' });
  const aviso_incompleto = activos.length > 0 && g.desaparecidos.length / activos.length > UMBRAL_INCOMPLETO;
  const cambiaFuente = ultima && (ultima.formato !== formato || (ultima.catalogo || null) !== (catalogo || null));

  return {
    formato, catalogo: catalogo || null,
    aviso_fuente: cambiaFuente ? `La última importación fue del ${fuente(ultima.formato, ultima.catalogo)}; este es del ${fuente(formato, catalogo)}. Los precios pueden cambiar de uno a otro.` : null,
    aviso_incompleto, ocultar_desaparecidos_por_defecto: !aviso_incompleto,
    totales: { filas: (filas || []).length, ...Object.fromEntries(Object.entries(g).map(([k, v]) => [k, v.length])) },
    grupos: g,
  };
}

export function resumenAplicado(vista, decisiones) {
  const destinos = Object.values((decisiones && decisiones.nuevos) || {}).map((d) => d && d.destino);
  const grupos = (vista && vista.grupos) || {};
  return {
    nuevos: destinos.filter((d) => d === 'plato').length,
    precios: (grupos.precio || []).length,
    ocultados: decisiones && decisiones.ocultar_desaparecidos ? (grupos.desaparecidos || []).length : 0,
    no_web: destinos.filter((d) => d === 'no_web').length,
    vinculados: destinos.filter((d) => d === 'mismo').length,
  };
}

const ERRORES_RPC = {
  ya_aplicada: 'Esta importación ya se aplicó.',
  vista_caducada: 'Desde que subiste este archivo se ha aplicado otra importación. Vuelve a subirlo.',
  no_encontrada: 'No encuentro esta importación. Vuelve a subir el archivo.',
};

/** Orquesta los tres pasos que manda el panel: vista_previa, aplicar y descartar. Devuelve {status, body}. */
export async function procesarImportacion({ s, fetch, quien, cuerpo }) {
  const c = cuerpo || {};
  if (c.paso === 'vista_previa') {
    const norm = normalizarExport(c.filas, c.archivo);
    if (!norm.ok) return { status: 400, body: { ok: false, error: norm.error } };
    const [platos, productos, ultimas] = await Promise.all([
      rest(s, fetch, 'platos?select=id,nombre,precio,lastapp_id,lastapp_nombre,archivado,categoria_id'),
      rest(s, fetch, 'productos_lastapp?select=id,no_web'),
      rest(s, fetch, 'importaciones?select=formato,catalogo&estado=eq.aplicada&order=aplicada_en.desc&limit=1'),
    ]);
    const vista = vistaPrevia({ filas: norm.filas, formato: norm.formato, catalogo: norm.catalogo, platos, productos, ultima: ultimas && ultimas[0] });
    const archivo = String(c.archivo || '').slice(0, 200);
    const [imp] = await rest(s, fetch, 'importaciones?select=id', { method: 'POST', prefer: 'return=representation', body: {
      quien: quien.email, archivo, formato: norm.formato, catalogo: norm.catalogo, filas: norm.filas, vista,
    } });
    return { status: 200, body: { id: imp.id, archivo, ...vista, avisos: norm.avisos } };
  }
  if (c.paso === 'aplicar') {
    const [imp] = await rest(s, fetch, `importaciones?select=id,vista&id=eq.${encodeURIComponent(c.id)}`) || [];
    if (!imp) return { status: 404, body: { ok: false, error: ERRORES_RPC.no_encontrada } };
    const decisiones = c.decisiones || {};
    const categorias = new Set(((await rest(s, fetch, 'categorias?select=id')) || []).map((x) => x.id));
    const nombres = Object.fromEntries((((imp.vista || {}).grupos || {}).nuevos || []).map((n) => [n.lastapp_id, n.nombre]));
    for (const [id, d] of Object.entries(decisiones.nuevos || {})) {
      if (d && d.destino === 'plato' && !categorias.has(d.categoria)) return { status: 400, body: { ok: false, error: `Elige una categoría de la web para ${nombres[id] || id}.` } };
    }
    try {
      const out = await rpc(s, fetch, 'aplicar_importacion', { p_id: c.id, p_decisiones: decisiones, p_quien: quien.email, p_resumen: resumenAplicado(imp.vista, decisiones) });
      return { status: 200, body: { ok: true, resumen: out && out.resumen } };
    } catch (e) {
      const clave = Object.keys(ERRORES_RPC).find((k) => String(e.message).includes(k));
      if (clave) return { status: clave === 'no_encontrada' ? 404 : 409, body: { ok: false, error: ERRORES_RPC[clave] } };
      throw e;
    }
  }
  if (c.paso === 'descartar') {
    await rest(s, fetch, `importaciones?id=eq.${encodeURIComponent(c.id)}&estado=eq.vista_previa`, { method: 'PATCH', prefer: 'return=minimal', body: { estado: 'descartada' } });
    return { status: 200, body: { ok: true } };
  }
  return { status: 400, body: { ok: false, error: 'paso desconocido' } };
}
