// POST /api/reservations
// Crea la reserva en Last.app. El body debe incluir:
// { name, surname, phoneNumber, email?, diners, dateTime, zone, customerComments? }
const { callLastApp, LASTAPP_LOCATION_ID } = require('./_lastapp');

module.exports = async function handler(req, res) {
  res.setHeader('Access-Control-Allow-Origin', '*');
  res.setHeader('Access-Control-Allow-Methods', 'POST, OPTIONS');
  res.setHeader('Access-Control-Allow-Headers', 'Content-Type');

  if (req.method === 'OPTIONS') return res.status(200).end();
  if (req.method !== 'POST') return res.status(405).json({ error: 'Method not allowed' });

  const { name, surname, phoneNumber, email, diners, dateTime, zone, customerComments } = req.body || {};

  if (!name || !surname || !phoneNumber || !diners || !dateTime || !zone) {
    return res.status(400).json({ error: 'Faltan campos obligatorios: name, surname, phoneNumber, diners, dateTime, zone' });
  }

  try {
    const data = await callLastApp('/reservations', {
      method: 'POST',
      body: JSON.stringify({
        name,
        surname,
        locationId: LASTAPP_LOCATION_ID,
        phoneNumber,
        diners: Number(diners),
        email: email || '',
        dateTime,
        zone,
        source: 'Folgao',
        customerComments: customerComments || null,
        externalId: null,
      }),
    });
    return res.status(201).json(data);
  } catch (err) {
    console.error('[reservations]', err.message);
    return res.status(500).json({ error: err.message });
  }
};
