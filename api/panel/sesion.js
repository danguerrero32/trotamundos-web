import { supa } from '../../lib/supa.js';
import { canjearEnlace, cookieSesion } from '../../lib/sesiones.js';

export default async function handler(req, res) {
  res.setHeader('Cache-Control', 'no-store');
  const s = supa(process.env);
  const t = (req.query && req.query.t) || new URL(req.url, 'http://x').searchParams.get('t');
  const ses = s ? await canjearEnlace({ s, fetch, token: t, agente: req.headers['user-agent'] }).catch((e) => { console.error('[panel/sesion]', e); return null; }) : null;
  if (!ses) { res.statusCode = 302; res.setHeader('Location', '/panel#enlace-caducado'); return res.end(); }
  res.setHeader('Set-Cookie', cookieSesion(ses));
  res.statusCode = 302; res.setHeader('Location', '/panel#inicio'); return res.end();
}
