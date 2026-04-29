// GET /api/availability-day?date=YYYY-MM-DD&diners=N
// Devuelve las franjas horarias disponibles por zona para un día concreto.
const { callLastApp, LASTAPP_LOCATION_ID } = require('./_lastapp');

module.exports = async function handler(req, res) {
  res.setHeader('Access-Control-Allow-Origin', '*');
  res.setHeader('Access-Control-Allow-Methods', 'GET, OPTIONS');

  if (req.method === 'OPTIONS') return res.status(200).end();
  if (req.method !== 'GET') return res.status(405).json({ error: 'Method not allowed' });

  const { date, diners } = req.query;
  if (!date || !diners) {
    return res.status(400).json({ error: 'Parámetros requeridos: date (YYYY-MM-DD) y diners' });
  }

  try {
    const data = await callLastApp(
      `/reservations/availability/day?locationId=${LASTAPP_LOCATION_ID}&diners=${diners}&date=${date}`
    );
    return res.status(200).json(data);
  } catch (err) {
    console.error('[availability-day]', err.message);
    return res.status(500).json({ error: err.message });
  }
};
