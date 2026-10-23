// GET /api/carta — la carta que pinta la web. Si falla, la web se queda con la carta de respaldo.
import { supa } from '../lib/supa.js';
import { cartaPublica } from '../lib/carta.js';

export default async function handler(req, res) {
  const s = supa(process.env);
  if (!s) return res.status(502).json({ ok: false });
  try {
    const carta = await cartaPublica({ s, fetch });
    res.setHeader('Cache-Control', 'public, s-maxage=60, stale-while-revalidate=300');
    return res.status(200).json(carta);
  } catch (e) {
    console.error('[carta]', e);
    return res.status(502).json({ ok: false });
  }
}
