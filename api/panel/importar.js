// POST /api/panel/importar — vista previa, aplicar o descartar una importación del Excel de LastApp.
import { procesarImportacion } from '../../lib/importacion.js';
import { conSesion, cuerpoDe } from '../../lib/http.js';

export default async function handler(req, res) {
  if (req.method !== 'POST') return res.status(405).json({ ok: false });
  const ctx = await conSesion(req, res); if (!ctx) return;
  try {
    const out = await procesarImportacion({ s: ctx.s, fetch, quien: ctx.quien, cuerpo: cuerpoDe(req) });
    return res.status(out.status).json(out.body);
  } catch (e) { console.error('[panel/importar]', e); return res.status(502).json({ ok: false, error: 'No se ha podido completar la importación. Inténtalo de nuevo.' }); }
}
