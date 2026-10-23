// Tarea diaria (vercel.json → crons). Hace el latido para que el plan gratuito de Supabase no se pause.
// La Tarea 13 del plan le añade: traducciones pendientes (solo si se encienden), anonimizado y limpieza.
import { supa, rpc } from '../lib/supa.js';

export default async function handler(req, res) {
  if (process.env.CRON_SECRET && req.headers.authorization !== `Bearer ${process.env.CRON_SECRET}`) return res.status(401).end();
  const s = supa(process.env);
  if (!s) return res.status(500).json({ ok: false, error: 'sin configuración' });
  try {
    await rpc(s, fetch, 'latir', { p_origen: 'vercel' });
    return res.status(200).json({ ok: true });
  } catch (e) {
    console.error('[latido]', e);
    return res.status(502).json({ ok: false });
  }
}
