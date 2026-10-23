// Ayudas comunes de los manejadores de Vercel.
import { supa } from './supa.js';
import { sesionActual } from './sesiones.js';

export function origenDe(req) {
  const proto = req.headers['x-forwarded-proto'] || 'https';
  const host = req.headers['x-forwarded-host'] || req.headers.host;
  return `${proto}://${host}`;
}

export function cuerpoDe(req) {
  let b = req.body;
  if (typeof b === 'string') { try { b = JSON.parse(b); } catch { b = null; } }
  return b || {};
}

/** Devuelve { s, quien } o responde 401/500 y devuelve null. */
export async function conSesion(req, res) {
  res.setHeader('Cache-Control', 'no-store');
  const s = supa(process.env);
  if (!s) { res.status(500).json({ ok: false, error: 'El servidor no tiene configurada la base de datos.' }); return null; }
  const quien = await sesionActual({ s, fetch, cookieHeader: req.headers.cookie });
  if (!quien) { res.status(401).json({ ok: false, error: 'Hace falta entrar.' }); return null; }
  return { s, quien };
}
