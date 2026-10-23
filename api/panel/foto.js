// Da una URL firmada para subir la foto de una actividad directamente al bucket "fotos" desde el navegador
// (así no pasa por la función, que tiene límite de tamaño). Devuelve también la URL pública final.
import { conSesion, cuerpoDe } from '../../lib/http.js';

export default async function handler(req, res) {
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
