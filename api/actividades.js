// GET /api/actividades — las tarjetas de actividades de la web y el WhatsApp del restaurante.
import { supa } from '../lib/supa.js';
import { actividadesPublicas } from '../lib/actividades.js';

export default async function handler(req, res) {
  const s = supa(process.env);
  if (!s) return res.status(502).json({ ok: false });
  try {
    const datos = await actividadesPublicas({ s, fetch });
    res.setHeader('Cache-Control', 'public, s-maxage=60, stale-while-revalidate=300');
    return res.status(200).json(datos);
  } catch (e) {
    console.error('[actividades]', e);
    return res.status(502).json({ ok: false });
  }
}
