import { supa } from '../../lib/supa.js';
import { pedirEnlace } from '../../lib/sesiones.js';
import { cuerpoDe, origenDe } from '../../lib/http.js';

export default async function handler(req, res) {
  res.setHeader('Cache-Control', 'no-store');
  if (req.method !== 'POST') return res.status(405).json({ ok: false });
  const s = supa(process.env);
  if (!s) return res.status(500).json({ ok: false, error: 'Sin base de datos.' });
  try {
    const out = await pedirEnlace({ s, fetch, env: process.env, email: cuerpoDe(req).email, origen: origenDe(req), log: (...a) => console.warn('[panel]', ...a) });
    return res.status(out.ok ? 200 : 400).json(out);
  } catch (e) { console.error('[panel/entrar]', e); return res.status(500).json({ ok: false, error: 'No se ha podido enviar el enlace.' }); }
}
