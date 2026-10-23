// Servidor local para probar la web con sus funciones de /api (Vercel no hace falta).
// Uso: node tools/servidor-local.mjs   → http://localhost:4324
// Las claves se leen de las variables de entorno. Sin SUPABASE_URL va en modo demo:
// /api/panel/* sirve los JSON de muestra de uploads/ y registra las acciones sin guardarlas.
import http from 'node:http';
import { readFile, stat } from 'node:fs/promises';
import path from 'node:path';
import { fileURLToPath, pathToFileURL } from 'node:url';
import { componerCarta } from '../lib/carta.js';
import { actividadAWeb } from '../lib/actividades.js';

const RAIZ = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '..');
const PUERTO = Number(process.env.PORT || 4324);
const MIME = { '.html': 'text/html; charset=utf-8', '.js': 'text/javascript', '.mjs': 'text/javascript', '.css': 'text/css', '.json': 'application/json', '.png': 'image/png', '.jpg': 'image/jpeg', '.jpeg': 'image/jpeg', '.mp4': 'video/mp4', '.svg': 'image/svg+xml', '.webp': 'image/webp', '.txt': 'text/plain; charset=utf-8' };
const REESCRITURAS = { '/panel': '/Trotamundos Panel.dc.html', '/privacidad': '/privacidad.html' };

function respuesta(res) {
  // Imita lo justo de la respuesta de Vercel que usan nuestros manejadores.
  res.status = (c) => { res.statusCode = c; return res; };
  res.json = (o) => { res.setHeader('Content-Type', 'application/json'); res.end(JSON.stringify(o)); return res; };
  return res;
}

async function leerCuerpo(req) {
  let cuerpo = ''; for await (const c of req) cuerpo += c;
  try { return JSON.parse(cuerpo); } catch { return cuerpo; }
}

const leerJson = async (ruta) => JSON.parse(await readFile(ruta, 'utf8'));

const DEMO = !process.env.SUPABASE_URL;
if (DEMO) console.log('Modo demo: /api/panel/* sirve uploads/*.json y registra las acciones sin guardarlas.');

async function panelDemo(que, body, r) {
  if (que === 'datos') return r.json(await leerJson(process.env.DEMO_DATOS || path.join(RAIZ, 'uploads/panel-demo.json')));
  console.log('[demo]', que, JSON.stringify(body).slice(0, 300));
  if (que === 'importar' && body && body.paso === 'vista_previa') return r.json(await leerJson(path.join(RAIZ, 'uploads/importacion-demo.json')));
  if (que === 'importar' && body && body.paso === 'aplicar') return r.json({ ok: true, resumen: { nuevos: 0, precios: 0, ocultados: 0, no_web: 0, vinculados: 0 } });
  const id = body && body.datos && body.datos.id;
  if (que === 'accion' && body && body.datos && (id == null || /^nuevo-/.test(id))) return r.json({ ok: true, id: 'demo-' + Date.now().toString(36) });
  return r.json({ ok: true });
}

http.createServer(async (req, res) => {
  const url = new URL(req.url, 'http://x');
  if (REESCRITURAS[url.pathname]) url.pathname = REESCRITURAS[url.pathname];
  if (url.pathname.startsWith('/api/')) {
    const r = respuesta(res);
    const nombre = url.pathname.slice(5).replace(/[^a-z0-9_/-]/gi, '').replace(/\.\./g, '');
    try {
      req.body = await leerCuerpo(req);
      req.query = Object.fromEntries(url.searchParams);
      if (DEMO && nombre.startsWith('panel/')) return await panelDemo(nombre.slice(6), req.body, r);
      if (DEMO && nombre === 'carta') {
        // La carta pública sale de los mismos datos de muestra que el panel.
        const d = await leerJson(process.env.DEMO_DATOS || path.join(RAIZ, 'uploads/panel-demo.json'));
        return r.json(componerCarta({ categorias: d.categorias, platos: d.platos.map((p) => ({ ...p, categoria_id: p.categoria })) }));
      }
      if (DEMO && nombre === 'actividades') {
        const d = await leerJson(process.env.DEMO_DATOS || path.join(RAIZ, 'uploads/panel-demo.json'));
        return r.json({ origen: 'bd', whatsapp: '34858893777', actividades: d.actividades.filter((a) => a.visible && !a.archivada).map(actividadAWeb) });
      }
      const { default: handler } = await import(pathToFileURL(path.join(RAIZ, 'api', nombre + '.js')).href + '?t=' + Date.now());
      await handler(req, r);
    } catch (e) { console.error(e); r.status(500).json({ ok: false, error: String(e.message) }); }
    return;
  }
  let f = path.join(RAIZ, decodeURIComponent(url.pathname === '/' ? '/index.html' : url.pathname));
  if (!f.startsWith(RAIZ)) { res.statusCode = 403; return res.end(); }
  try {
    if ((await stat(f)).isDirectory()) f = path.join(f, 'index.html');
    res.setHeader('Content-Type', MIME[path.extname(f).toLowerCase()] || 'application/octet-stream');
    res.setHeader('Cache-Control', 'no-store');
    res.end(await readFile(f));
  } catch { res.statusCode = 404; res.end('No encontrado'); }
}).listen(PUERTO, () => console.log(`Los Trotamundos en http://localhost:${PUERTO}`));
