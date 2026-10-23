// Tarea diaria (cron de Vercel → /api/latido): latido para que el plan gratuito de Supabase no se
// pause, anonimizado de consultas cerradas hace más de 12 meses y limpieza de sesiones caducadas.
// Un fallo en una tarea no detiene las demás.
import { rest, rpc } from './supa.js';

const DIA = 86400000;

async function intentar(fn, porDefecto, nombre) {
  try { return await fn(); } catch (e) { console.warn(`[tarea diaria] ${nombre}:`, e.message); return porDefecto; }
}

export async function tareaDiaria({ s, fetch, ahora = Date.now() }) {
  const latido = await intentar(async () => { await rpc(s, fetch, 'latir', { p_origen: 'vercel' }); return true; }, false, 'latido');

  const limite = encodeURIComponent(new Date(ahora - 365 * DIA).toISOString());
  const anonimizadas = await intentar(async () => ((await rest(s, fetch,
    `consultas?estado=in.(contestada,confirmada,descartada)&actualizado_en=lt.${limite}&anonimizada_en=is.null&select=id`,
    { method: 'PATCH', prefer: 'return=representation', body: { nombre: 'Datos borrados', telefono: '', notas: null, anonimizada_en: new Date(ahora).toISOString() } })) || []).length, 0, 'anonimizado');

  const caducadas = encodeURIComponent(new Date(ahora - 7 * DIA).toISOString());
  const sesiones_borradas = await intentar(async () => ((await rest(s, fetch, `sesiones_panel?caduca_en=lt.${caducadas}&select=id`,
    { method: 'DELETE', prefer: 'return=representation' })) || []).length, 0, 'sesiones');

  return { latido, anonimizadas, sesiones_borradas };
}
