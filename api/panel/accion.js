import { accion } from '../../lib/panel.js';
import { clienteClaude } from '../../lib/claude.js';
import { conSesion, cuerpoDe } from '../../lib/http.js';

export default async function handler(req, res) {
  if (req.method !== 'POST') return res.status(405).json({ ok: false });
  const ctx = await conSesion(req, res); if (!ctx) return;
  try {
    const out = await accion({ s: ctx.s, fetch, client: clienteClaude(process.env), quien: ctx.quien, cuerpo: cuerpoDe(req) });
    return res.status(out.ok === false ? 400 : 200).json(out);
  } catch (e) { console.error('[panel/accion]', e); return res.status(400).json({ ok: false, error: String(e.message) }); }
}
