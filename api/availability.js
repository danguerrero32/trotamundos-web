// GET /api/availability?date=YYYY-MM&diners=N
// Devuelve los días disponibles del mes para el número de comensales dado.
const { callLastApp, LASTAPP_LOCATION_ID } = require('./_lastapp');

module.exports = async function handler(req, res) {
  res.setHeader('Access-Control-Allow-Origin', '*');
  res.setHeader('Access-Control-Allow-Methods', 'GET, OPTIONS');

  if (req.method === 'OPTIONS') return res.status(200).end();
  if (req.method !== 'GET') return res.status(405).json({ error: 'Method not allowed' });

  const { date, diners } = req.query;
  if (!date || !diners) {
    return res.status(400).json({ error: 'Parámetros requeridos: date (YYYY-MM) y diners' });
  }

  try {
    const data = await callLastApp(
      `/reservations/availability/month?locationId=${LASTAPP_LOCATION_ID}&diners=${diners}&date=${date}`
    );
    res.setHeader('Cache-Control', 's-maxage=120, stale-while-revalidate');
    return res.status(200).json(data);
  } catch (err) {
    console.error('[availability]', err.message);
    return res.status(500).json({ error: err.message });
  }
};
