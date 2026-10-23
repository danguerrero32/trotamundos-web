import { supa } from '../../lib/supa.js';
import { cerrarSesion, cookieSesion } from '../../lib/sesiones.js';

export default async function handler(req, res) {
  res.setHeader('Cache-Control', 'no-store');
  const s = supa(process.env);
  if (s) await cerrarSesion({ s, fetch, cookieHeader: req.headers.cookie });
  res.setHeader('Set-Cookie', cookieSesion('', { borrar: true }));
  return res.status(200).json({ ok: true });
}
