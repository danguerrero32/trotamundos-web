// Lógica del panel privado: los datos con la forma exacta de uploads/panel-demo.json (el contrato con la
// maqueta de Claude Design) y las acciones que manda el puente. Los manejadores de api/panel/*.js solo llaman aquí.
import { rest } from './supa.js';
import { IDIOMAS, limpiarTexto } from './idiomas.js';
import { precioWeb } from './carta.js';
import { telefonoWa } from './telefono.js';
import { respuestaConsulta } from './mensajes.js';
import { CAMPOS, marcarManual, traducirSiToca } from './traducir.js';

export const ESTADOS_CONSULTA = ['nueva', 'contestada', 'confirmada', 'descartada'];
export const ETIQUETAS_CONSULTA = { nueva: 'Nueva', contestada: 'Contestada', confirmada: 'Confirmada', descartada: 'Descartada' };
const MAX_TEXTO = { nombre: 120, descripcion: 400, nota_precio: 60 };
const ENCUADRES = ['arriba', 'centro', 'abajo'];

export const slugify = (t) => String(t || '').toLowerCase().normalize('NFD').replace(/[̀-ͯ]/g, '').replace(/[^a-z0-9]+/g, '-').replace(/^-|-$/g, '') || 'nuevo';

/** '21,50' | '21.50 €' | 21.5 → 21.5; '' → null; texto sin número → error. */
export function aPrecio(v) {
  if (v === null || v === undefined || String(v).trim() === '') return null;
  if (typeof v === 'number') return v;
  const t = String(v).replace(/[^\d,.]/g, '');
  const n = parseFloat(t.includes(',') ? t.replace(/\./g, '').replace(',', '.') : t);
  if (!Number.isFinite(n)) throw new Error('precio no válido');
  return Math.round(n * 100) / 100;
}

const euros = (n) => `${Number(n).toFixed(2).replace('.', ',')} €`;
const multilingue = (v) => Object.fromEntries(IDIOMAS.map((l) => [l, (v && v[l]) || '']));
const ajustesAObjeto = (rows) => Object.fromEntries((rows || []).map((r) => [r.clave, r.valor]));
const cargarAjustes = async (s, fetch) => ajustesAObjeto(await rest(s, fetch, 'ajustes?select=clave,valor'));

// ---------- Datos ----------
export async function datosPanel({ s, fetch, quien }) {
  const [cats, platos, productos, acts, cons, imps, admins, hist, ajRows] = await Promise.all([
    rest(s, fetch, 'categorias?select=*&order=orden.asc'),
    rest(s, fetch, 'platos?select=*&order=categoria_id.asc,orden.asc'),
    rest(s, fetch, 'productos_lastapp?select=id,precio'),
    rest(s, fetch, 'actividades?select=*&order=orden.asc'),
    rest(s, fetch, 'consultas?select=*&anonimizada_en=is.null&order=recibida_en.desc'),
    rest(s, fetch, 'importaciones?select=archivo,resumen,aplicada_en&estado=eq.aplicada&order=aplicada_en.desc&limit=1'),
    rest(s, fetch, 'administradores?select=email,nombre&activo=eq.true&order=creado_en.asc'),
    rest(s, fetch, 'historial?select=en,quien,accion&order=en.desc&limit=10'),
    rest(s, fetch, 'ajustes?select=clave,valor'),
  ]);
  const aj = ajustesAObjeto(ajRows);
  const gestor = aj.nombre_gestor || quien.nombre;
  const precioLastApp = Object.fromEntries((productos || []).map((p) => [p.id, p.precio]));
  const actividades = acts || [];
  const nombreAct = Object.fromEntries(actividades.map((a) => [a.id, a.nombre || {}]));
  const nombres = Object.fromEntries((admins || []).map((a) => [a.email, a.nombre || a.email]));
  const ultima = imps && imps[0];
  const consultas = (cons || []).map((c) => {
    const wa = telefonoWa(c.telefono);
    const actividad = (nombreAct[c.actividad_id] && nombreAct[c.actividad_id][c.idioma]) || c.actividad_nombre || '';
    const texto = respuestaConsulta({ nombre: c.nombre, actividad, fecha: c.fecha, gestor }, c.idioma);
    return {
      id: c.id, recibida_en: c.recibida_en, actividad_id: c.actividad_id, actividad: c.actividad_nombre || '', nombre: c.nombre,
      telefono: c.telefono, fecha: c.fecha || '', personas: c.personas || '', idioma: c.idioma, estado: c.estado, notas: c.notas || '',
      aviso_enviado: !!c.aviso_enviado,
      whatsapp_url: wa ? `https://wa.me/${wa}?text=${encodeURIComponent(texto)}` : '',
      llamar_url: wa ? `tel:+${wa}` : '',
    };
  });
  return {
    gestor: { nombre: gestor, email: quien.email },
    resumen: {
      consultas_nuevas: consultas.filter((c) => c.estado === 'nueva').length,
      platos_ocultos: (platos || []).filter((p) => !p.visible && !p.archivado).length,
      ultima_importacion: ultima ? ultima.aplicada_en : null,
    },
    idiomas: IDIOMAS,
    categorias: (cats || []).map((c) => ({ id: c.id, nombre: multilingue(c.nombre), visible: !!c.visible, orden: c.orden, traduccion: c.traduccion })),
    platos: (platos || []).map((p) => ({
      id: p.id, categoria: p.categoria_id, orden: p.orden,
      nombre: multilingue(p.nombre), descripcion: multilingue(p.descripcion), nota_precio: multilingue(p.nota_precio),
      precio: precioWeb(p.precio), precio_fijo: !!p.precio_fijo, emoji: p.emoji || '', visible: !!p.visible, archivado: !!p.archivado,
      lastapp: p.lastapp_id ? { id: p.lastapp_id, nombre: p.lastapp_nombre || '', precio: precioWeb(precioLastApp[p.lastapp_id]) } : null,
      traduccion: p.traduccion,
    })),
    actividades: actividades.map((a) => ({
      id: a.id, emoji: a.emoji || '', nombre: multilingue(a.nombre), descripcion: multilingue(a.descripcion), foto: a.foto || '',
      encuadre: a.encuadre, visible: !!a.visible, archivada: !!a.archivada, orden: a.orden, traduccion: a.traduccion,
    })),
    consultas,
    estados_consulta: ESTADOS_CONSULTA,
    etiquetas_consulta: ETIQUETAS_CONSULTA,
    ajustes: {
      whatsapp: aj.whatsapp || '', correos_aviso: aj.correos_aviso || [], aviso_consultas_correo: aj.aviso_consultas_correo !== false,
      nombre_gestor: aj.nombre_gestor || '', traduccion_automatica: aj.traduccion_automatica === true,
      administradores: (admins || []).map((a) => ({ email: a.email, nombre: a.nombre || '', soy_yo: a.email === quien.email })),
    },
    ultima_importacion: ultima ? { en: ultima.aplicada_en, archivo: ultima.archivo, resumen: ultima.resumen } : null,
    historial: (hist || []).map((h) => ({ en: h.en, quien: nombres[h.quien] || h.quien, accion: h.accion })),
  };
}

// ---------- Acciones ----------
async function anotar(s, fetch, quien, accion, tabla, registro_id, detalle) {
  await rest(s, fetch, 'historial', { method: 'POST', prefer: 'return=minimal', body: { quien, accion, tabla, registro_id: registro_id == null ? null : String(registro_id), detalle: detalle || null } }).catch(() => {});
}

async function filaPorId(s, fetch, tabla, id) {
  const rows = await rest(s, fetch, `${tabla}?select=*&id=eq.${encodeURIComponent(id)}`);
  if (!rows || !rows[0]) throw new Error('no encontrado');
  return rows[0];
}

/** Mezcla los textos que llegan con los actuales; dice si ha cambiado algún español y qué idiomas se escribieron a mano. */
function textosNuevos(actual, datos, campos) {
  const patch = {}; let cambiaEs = false;
  for (const c of campos) {
    if (!datos[c] || typeof datos[c] !== 'object') continue;
    const limpio = Object.fromEntries(Object.entries(datos[c]).filter(([l]) => IDIOMAS.includes(l)).map(([l, t]) => [l, limpiarTexto(t, MAX_TEXTO[c] || 400)]));
    patch[c] = { ...((actual && actual[c]) || {}), ...limpio };
    if ('es' in limpio && limpio.es !== ((actual && actual[c] && actual[c].es) || '')) cambiaEs = true;
  }
  return { patch, cambiaEs };
}

async function siguienteOrden(s, fetch, tabla, filtro = '') {
  const rows = await rest(s, fetch, `${tabla}?select=orden${filtro}&order=orden.desc&limit=1`);
  return ((rows && rows[0] && rows[0].orden) || 0) + 1;
}

async function idLibre(s, fetch, tabla, base) {
  let id = base, n = 2;
  while (((await rest(s, fetch, `${tabla}?select=id&id=eq.${encodeURIComponent(id)}`)) || []).length) id = `${base}-${n++}`;
  return id;
}

async function traducirTrasGuardar({ s, fetch, client, tabla, id }) {
  const [fila, aj] = await Promise.all([filaPorId(s, fetch, tabla, id), cargarAjustes(s, fetch)]);
  await traducirSiToca({ s, fetch, client, ajustes: aj, tabla, filas: [fila] });
}

async function guardarPlato({ s, fetch, client, q, d }) {
  if (!d.id) {
    const { patch } = textosNuevos({}, d, CAMPOS.platos);
    if (!d.categoria || !patch.nombre || !patch.nombre.es) throw new Error('faltan la categoría o el nombre');
    const orden = await siguienteOrden(s, fetch, 'platos', `&categoria_id=eq.${encodeURIComponent(d.categoria)}`);
    const [fila] = await rest(s, fetch, 'platos?select=*', { method: 'POST', prefer: 'return=representation', body: {
      categoria_id: d.categoria, ...patch, precio: aPrecio(d.precio), emoji: limpiarTexto(d.emoji, 16), orden,
      visible: d.visible !== false, precio_fijo: !!d.precio_fijo, traduccion: { pendiente: true, manual: [] },
    } });
    await anotar(s, fetch, q, `Añadió el plato ${fila.nombre.es}`, 'platos', fila.id);
    await traducirTrasGuardar({ s, fetch, client, tabla: 'platos', id: fila.id });
    return { ok: true, id: fila.id };
  }
  const actual = await filaPorId(s, fetch, 'platos', d.id);
  const { patch, cambiaEs } = textosNuevos(actual, d, CAMPOS.platos);
  const manual = marcarManual(actual, d);
  if (manual.length !== ((actual.traduccion && actual.traduccion.manual) || []).length) patch.traduccion = { ...(actual.traduccion || {}), manual };
  const nombre = (patch.nombre && patch.nombre.es) || actual.nombre.es;
  const notas = [];
  if ('precio' in d) { patch.precio = aPrecio(d.precio); if (patch.precio !== actual.precio) notas.push(patch.precio == null ? `Quitó el precio de ${nombre}` : `Cambió el precio de ${nombre} a ${euros(patch.precio)}`); }
  if ('categoria' in d && d.categoria && d.categoria !== actual.categoria_id) { patch.categoria_id = d.categoria; notas.push(`Pasó ${nombre} a otra categoría`); }
  if ('emoji' in d) patch.emoji = limpiarTexto(d.emoji, 16);
  if ('visible' in d && !!d.visible !== actual.visible) { patch.visible = !!d.visible; notas.push(d.visible ? `Volvió a poner ${nombre} en la carta` : `Ocultó ${nombre}`); }
  if ('precio_fijo' in d && !!d.precio_fijo !== actual.precio_fijo) { patch.precio_fijo = !!d.precio_fijo; notas.push(d.precio_fijo ? `Fijó en la web el precio de ${nombre}` : `Dejó que LastApp mande en el precio de ${nombre}`); }
  if (Object.keys(patch).length) await rest(s, fetch, `platos?id=eq.${encodeURIComponent(d.id)}`, { method: 'PATCH', prefer: 'return=minimal', body: patch });
  for (const n of notas) await anotar(s, fetch, q, n, 'platos', d.id, patch);
  if (cambiaEs) await traducirTrasGuardar({ s, fetch, client, tabla: 'platos', id: d.id });
  return { ok: true, id: d.id };
}

async function guardarSimple({ s, fetch, client, q, d, tabla, etiqueta }) {
  const campos = CAMPOS[tabla];
  if (!d.id) {
    const { patch } = textosNuevos({}, d, campos);
    if (!patch.nombre || !patch.nombre.es) throw new Error('falta el nombre');
    const id = await idLibre(s, fetch, tabla, slugify(patch.nombre.es));
    const fila = { id, ...patch, orden: await siguienteOrden(s, fetch, tabla), visible: d.visible !== false, traduccion: { pendiente: true, manual: [] } };
    if (tabla === 'actividades') Object.assign(fila, { emoji: limpiarTexto(d.emoji, 16), foto: d.foto ? String(d.foto) : null, encuadre: ENCUADRES.includes(d.encuadre) ? d.encuadre : 'centro' });
    await rest(s, fetch, tabla, { method: 'POST', prefer: 'return=minimal', body: fila });
    await anotar(s, fetch, q, `Creó ${etiqueta} ${patch.nombre.es}`, tabla, id);
    await traducirTrasGuardar({ s, fetch, client, tabla, id });
    return { ok: true, id };
  }
  const actual = await filaPorId(s, fetch, tabla, d.id);
  const { patch, cambiaEs } = textosNuevos(actual, d, campos);
  const nombre = (patch.nombre && patch.nombre.es) || actual.nombre.es;
  const notas = [];
  if ('visible' in d && !!d.visible !== actual.visible) { patch.visible = !!d.visible; notas.push(`${d.visible ? 'Volvió a mostrar' : 'Ocultó'} ${etiqueta} ${nombre}`); }
  if (tabla === 'actividades') {
    if ('emoji' in d) patch.emoji = limpiarTexto(d.emoji, 16);
    if ('foto' in d && d.foto !== actual.foto) { patch.foto = d.foto ? String(d.foto) : null; notas.push(`Cambió la foto de ${nombre}`); }
    if ('encuadre' in d && ENCUADRES.includes(d.encuadre)) patch.encuadre = d.encuadre;
  }
  if (Object.keys(patch).length) await rest(s, fetch, `${tabla}?id=eq.${encodeURIComponent(d.id)}`, { method: 'PATCH', prefer: 'return=minimal', body: patch });
  for (const n of notas) await anotar(s, fetch, q, n, tabla, d.id);
  if (cambiaEs) await traducirTrasGuardar({ s, fetch, client, tabla, id: d.id });
  return { ok: true, id: d.id };
}

async function ordenar(s, fetch, tabla, ids) {
  for (const [i, id] of (ids || []).entries()) await rest(s, fetch, `${tabla}?id=eq.${encodeURIComponent(id)}`, { method: 'PATCH', prefer: 'return=minimal', body: { orden: i + 1 } });
  return { ok: true };
}

async function archivar(s, fetch, q, tabla, columna, id, valor, etiqueta) {
  const [fila] = await rest(s, fetch, `${tabla}?id=eq.${encodeURIComponent(id)}&select=nombre`, { method: 'PATCH', prefer: 'return=representation', body: { [columna]: !!valor } }) || [];
  const nombre = fila && fila.nombre ? fila.nombre.es : '';
  await anotar(s, fetch, q, valor ? `Quitó de la web ${etiqueta} ${nombre}` : `Recuperó ${etiqueta} ${nombre}`, tabla, id);
  return { ok: true };
}

function normalizaAjuste(k, v) {
  if (k === 'correos_aviso') return (Array.isArray(v) ? v : String(v || '').split(',')).map((x) => String(x).trim().toLowerCase()).filter(Boolean);
  if (k === 'aviso_consultas_correo') return v === true || v === 'true';
  return v == null ? null : limpiarTexto(v, 80);
}

export async function accion({ s, fetch, client, quien, cuerpo, ahora = Date.now() }) {
  const q = quien.email;
  const d = (cuerpo && cuerpo.datos) || {};
  switch (cuerpo && cuerpo.tipo) {
    case 'plato.guardar': return guardarPlato({ s, fetch, client, q, d });
    case 'plato.visible': return guardarPlato({ s, fetch, client, q, d: { id: d.id, visible: !!d.visible } });
    case 'plato.archivar': return archivar(s, fetch, q, 'platos', 'archivado', d.id, d.archivado, 'el plato');
    case 'plato.ordenar': return ordenar(s, fetch, 'platos', d.ids);
    case 'categoria.guardar': return guardarSimple({ s, fetch, client, q, d, tabla: 'categorias', etiqueta: 'la categoría' });
    case 'categoria.ordenar': return ordenar(s, fetch, 'categorias', d.ids);
    case 'actividad.guardar': return guardarSimple({ s, fetch, client, q, d, tabla: 'actividades', etiqueta: 'la actividad' });
    case 'actividad.archivar': return archivar(s, fetch, q, 'actividades', 'archivada', d.id, d.archivada, 'la actividad');
    case 'actividad.ordenar': return ordenar(s, fetch, 'actividades', d.ids);
    case 'consulta.estado': {
      if (!ESTADOS_CONSULTA.includes(d.estado)) throw new Error('estado no válido');
      const [fila] = await rest(s, fetch, `consultas?id=eq.${encodeURIComponent(d.id)}&select=nombre`, { method: 'PATCH', prefer: 'return=representation', body: { estado: d.estado } }) || [];
      await anotar(s, fetch, q, `Consulta de ${(fila && fila.nombre) || ''}: ${ETIQUETAS_CONSULTA[d.estado]}`, 'consultas', d.id);
      return { ok: true };
    }
    case 'consulta.notas':
      await rest(s, fetch, `consultas?id=eq.${encodeURIComponent(d.id)}`, { method: 'PATCH', prefer: 'return=minimal', body: { notas: limpiarTexto(d.notas, 2000) } });
      return { ok: true };
    case 'consulta.borrar':
      await rest(s, fetch, `consultas?id=eq.${encodeURIComponent(d.id)}&select=nombre`, { method: 'PATCH', prefer: 'return=representation', body: {
        nombre: 'Datos borrados', telefono: '', notas: null, anonimizada_en: new Date(ahora).toISOString(),
      } });
      await anotar(s, fetch, q, 'Borró los datos de una persona', 'consultas', d.id);
      return { ok: true };
    case 'ajustes.guardar': {
      const permitidos = ['whatsapp', 'correos_aviso', 'aviso_consultas_correo', 'nombre_gestor'];
      const filas = permitidos.filter((k) => k in d).map((k) => ({ clave: k, valor: normalizaAjuste(k, d[k]), actualizado_por: q, actualizado_en: new Date(ahora).toISOString() }));
      if (filas.length) await rest(s, fetch, 'ajustes?on_conflict=clave', { method: 'POST', prefer: 'resolution=merge-duplicates,return=minimal', body: filas });
      await anotar(s, fetch, q, 'Guardó los ajustes', 'ajustes', null, { claves: filas.map((f) => f.clave) });
      return { ok: true };
    }
    case 'acceso.anadir': {
      const email = String(d.email || '').trim().toLowerCase();
      if (!/^[^\s@]+@[^\s@]+\.[^\s@]{2,}$/.test(email)) return { ok: false, error: 'Ese correo no parece válido.' };
      await rest(s, fetch, 'administradores?on_conflict=email', { method: 'POST', prefer: 'resolution=merge-duplicates,return=minimal', body: { email, nombre: limpiarTexto(d.nombre, 80) || null, activo: true } });
      await anotar(s, fetch, q, `Dio acceso al panel a ${email}`, 'administradores', email);
      return { ok: true };
    }
    case 'acceso.quitar': {
      const email = String(d.email || '').trim().toLowerCase();
      if (email === String(q).toLowerCase()) return { ok: false, error: 'No puedes quitarte a ti mismo.' };
      await rest(s, fetch, `administradores?email=eq.${encodeURIComponent(email)}`, { method: 'PATCH', prefer: 'return=minimal', body: { activo: false } });
      await anotar(s, fetch, q, `Quitó el acceso al panel a ${email}`, 'administradores', email);
      return { ok: true };
    }
    default:
      throw new Error('acción desconocida');
  }
}
