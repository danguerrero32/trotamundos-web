import { datosPanel } from '../../lib/panel.js';
import { conSesion } from '../../lib/http.js';

export default async function handler(req, res) {
  const ctx = await conSesion(req, res); if (!ctx) return;
  try { return res.status(200).json(await datosPanel({ s: ctx.s, fetch, quien: ctx.quien })); }
  catch (e) { console.error('[panel/datos]', e); return res.status(502).json({ ok: false, error: 'La base de datos no responde.' }); }
}
