// Tarea diaria (vercel.json → crons): latido para que el plan gratuito de Supabase no se pause,
// anonimizado de consultas a los 12 meses y limpieza de sesiones caducadas.
import { supa } from '../lib/supa.js';
import { tareaDiaria } from '../lib/tarea-diaria.js';

export default async function handler(req, res) {
  if (process.env.CRON_SECRET && req.headers.authorization !== `Bearer ${process.env.CRON_SECRET}`) return res.status(401).end();
  const s = supa(process.env);
  if (!s) return res.status(500).json({ ok: false, error: 'sin configuración' });
  const r = await tareaDiaria({ s, fetch });
  return res.status(r.latido ? 200 : 502).json({ ok: r.latido, ...r });
}
