// Manejadores del panel privado. En Vercel van todos en una sola función (api/panel/[ruta].js),
// porque el plan gratuito admite como mucho 12 funciones por despliegue.
import { conSesion, cuerpoDe, origenDe } from './http.js';
import { procesarImportacion } from './importacion.js';
import { accion as ejecutarAccion, datosPanel } from './panel.js';
import { canjearEnlace, cerrarSesion, cookieSesion, pedirEnlace } from './sesiones.js';
import { supa } from './supa.js';

async function entrar(req, res) {
  res.setHeader('Cache-Control', 'no-store');
  if (req.method !== 'POST') return res.status(405).json({ ok: false });
  const s = supa(process.env);
  if (!s) return res.status(500).json({ ok: false, error: 'Sin base de datos.' });
  try {
    const out = await pedirEnlace({ s, fetch, env: process.env, email: cuerpoDe(req).email, origen: origenDe(req), log: (...a) => console.warn('[panel]', ...a) });
    return res.status(out.ok ? 200 : 400).json(out);
  } catch (e) { console.error('[panel/entrar]', e); return res.status(500).json({ ok: false, error: 'No se ha podido enviar el enlace.' }); }
}

async function sesion(req, res) {
  res.setHeader('Cache-Control', 'no-store');
  const s = supa(process.env);
  const t = (req.query && req.query.t) || new URL(req.url, 'http://x').searchParams.get('t');
  const ses = s ? await canjearEnlace({ s, fetch, token: t, agente: req.headers['user-agent'] }).catch((e) => { console.error('[panel/sesion]', e); return null; }) : null;
  if (!ses) { res.statusCode = 302; res.setHeader('Location', '/panel#enlace-caducado'); return res.end(); }
  res.setHeader('Set-Cookie', cookieSesion(ses));
  res.statusCode = 302; res.setHeader('Location', '/panel#inicio'); return res.end();
}

async function salir(req, res) {
  res.setHeader('Cache-Control', 'no-store');
  const s = supa(process.env);
  if (s) await cerrarSesion({ s, fetch, cookieHeader: req.headers.cookie });
  res.setHeader('Set-Cookie', cookieSesion('', { borrar: true }));
  return res.status(200).json({ ok: true });
}

async function datos(req, res) {
  const ctx = await conSesion(req, res); if (!ctx) return;
  try { return res.status(200).json(await datosPanel({ s: ctx.s, fetch, quien: ctx.quien })); }
  catch (e) { console.error('[panel/datos]', e); return res.status(502).json({ ok: false, error: 'La base de datos no responde.' }); }
}

async function accion(req, res) {
  if (req.method !== 'POST') return res.status(405).json({ ok: false });
  const ctx = await conSesion(req, res); if (!ctx) return;
  try {
    const out = await ejecutarAccion({ s: ctx.s, fetch, quien: ctx.quien, cuerpo: cuerpoDe(req) });
    return res.status(out.ok === false ? 400 : 200).json(out);
  } catch (e) { console.error('[panel/accion]', e); return res.status(400).json({ ok: false, error: String(e.message) }); }
}

// Da una URL firmada para subir la foto de una actividad directamente al bucket "fotos" desde el navegador
// (así no pasa por la función, que tiene límite de tamaño). Devuelve también la URL pública final.
async function foto(req, res) {
  if (req.method !== 'POST') return res.status(405).json({ ok: false });
  const ctx = await conSesion(req, res); if (!ctx) return;
  const { id, nombre, tipo } = cuerpoDe(req);
  const ext = ({ 'image/jpeg': 'jpg', 'image/png': 'png', 'image/webp': 'webp' })[tipo] || 'jpg';
  const limpio = String(nombre || 'foto').replace(/\.[a-z0-9]+$/i, '').replace(/[^a-z0-9-]/gi, '').slice(0, 40) || 'foto';
  const ruta = `actividades/${String(id || 'sin-id').replace(/[^a-z0-9-]/gi, '')}/${Date.now().toString(36)}-${limpio}.${ext}`;
  const r = await fetch(`${ctx.s.base}/storage/v1/object/upload/sign/fotos/${ruta}`, { method: 'POST', headers: ctx.s.headers, body: '{}' });
  if (!r.ok) { console.error('[panel/foto]', r.status, await r.text()); return res.status(502).json({ ok: false, error: 'No se ha podido preparar la subida.' }); }
  const j = await r.json();
  const subir = `${ctx.s.base}/storage/v1${j.url.startsWith('/') ? j.url : '/' + j.url}`;
  return res.status(200).json({ ok: true, subir, publica: `${ctx.s.base}/storage/v1/object/public/fotos/${ruta}` });
}

// POST /api/panel/importar — vista previa, aplicar o descartar una importación del Excel de LastApp.
async function importar(req, res) {
  if (req.method !== 'POST') return res.status(405).json({ ok: false });
  const ctx = await conSesion(req, res); if (!ctx) return;
  try {
    const out = await procesarImportacion({ s: ctx.s, fetch, quien: ctx.quien, cuerpo: cuerpoDe(req) });
    return res.status(out.status).json(out.body);
  } catch (e) { console.error('[panel/importar]', e); return res.status(502).json({ ok: false, error: 'No se ha podido completar la importación. Inténtalo de nuevo.' }); }
}

export const RUTAS = { entrar, sesion, salir, datos, accion, foto, importar };
