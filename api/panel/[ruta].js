// /api/panel/<ruta>: entrar, sesion, salir, datos, accion, foto e importar, en una sola función de Vercel.
import { RUTAS } from '../../lib/rutas-panel.js';

export default async function handler(req, res) {
  const ruta = (req.query && req.query.ruta) || new URL(req.url, 'http://x').pathname.split('/').pop();
  const manejador = Object.hasOwn(RUTAS, ruta) ? RUTAS[ruta] : null;
  if (!manejador) return res.status(404).json({ ok: false });
  return manejador(req, res);
}
