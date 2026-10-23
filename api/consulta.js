// POST /api/consulta — una consulta de actividad desde la web. A la vez, la web abre WhatsApp.
import { procesarConsulta } from '../lib/consulta.js';
import { cuerpoDe } from '../lib/http.js';

export default async function handler(req, res) {
  res.setHeader('Cache-Control', 'no-store');
  if (req.method !== 'POST') return res.status(405).json({ ok: false });
  const out = await procesarConsulta({ body: cuerpoDe(req), env: process.env, fetch, log: (...a) => console.warn('[consulta]', ...a) });
  return res.status(out.status).json(out.body);
}
