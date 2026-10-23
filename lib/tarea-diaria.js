// Tarea diaria (cron de Vercel → /api/latido): latido, traducciones pendientes (solo si se enciende la
// traducción), anonimizado de consultas cerradas hace más de 12 meses y limpieza de sesiones caducadas.
// Un fallo en una tarea no detiene las demás.
import { rest, rpc } from './supa.js';
import { traducirSiToca } from './traducir.js';

const MAX_TRADUCCIONES = 40;
const DIA = 86400000;

async function intentar(fn, porDefecto, nombre) {
  try { return await fn(); } catch (e) { console.warn(`[tarea diaria] ${nombre}:`, e.message); return porDefecto; }
}

export async function tareaDiaria({ s, fetch, client, ahora = Date.now() }) {
  const latido = await intentar(async () => { await rpc(s, fetch, 'latir', { p_origen: 'vercel' }); return true; }, false, 'latido');

  const traducidas = await intentar(async () => {
    const aj = Object.fromEntries(((await rest(s, fetch, 'ajustes?select=clave,valor&clave=eq.traduccion_automatica')) || []).map((r) => [r.clave, r.valor]));
    if (aj.traduccion_automatica !== true || !client) return 0;
    let hechas = 0;
    for (const tabla of ['platos', 'categorias', 'actividades']) {
      if (hechas >= MAX_TRADUCCIONES) break;
      const filas = await rest(s, fetch, `${tabla}?select=*&traduccion->>pendiente=eq.true&limit=${MAX_TRADUCCIONES - hechas}`);
      hechas += (await traducirSiToca({ s, fetch, client, ajustes: aj, tabla, filas })).traducidas;
    }
    return hechas;
  }, 0, 'traducciones');

  const limite = encodeURIComponent(new Date(ahora - 365 * DIA).toISOString());
  const anonimizadas = await intentar(async () => ((await rest(s, fetch,
    `consultas?estado=in.(contestada,confirmada,descartada)&actualizado_en=lt.${limite}&anonimizada_en=is.null&select=id`,
    { method: 'PATCH', prefer: 'return=representation', body: { nombre: 'Datos borrados', telefono: '', notas: null, anonimizada_en: new Date(ahora).toISOString() } })) || []).length, 0, 'anonimizado');

  const caducadas = encodeURIComponent(new Date(ahora - 7 * DIA).toISOString());
  const sesiones_borradas = await intentar(async () => ((await rest(s, fetch, `sesiones_panel?caduca_en=lt.${caducadas}&select=id`,
    { method: 'DELETE', prefer: 'return=representation' })) || []).length, 0, 'sesiones');

  return { latido, traducidas, anonimizadas, sesiones_borradas };
}
