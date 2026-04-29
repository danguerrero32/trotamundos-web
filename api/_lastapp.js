// Helper compartido para llamadas a la API de Last.app.
// El token NUNCA sale al frontend — todas las llamadas pasan por aquí.
const LASTAPP_TOKEN = process.env.LASTAPP_TOKEN;
const LASTAPP_LOCATION_ID = process.env.LASTAPP_LOCATION_ID;
const BASE_URL = 'https://api.last.app/v2';

async function callLastApp(path, options = {}) {
  const url = `${BASE_URL}${path}`;
  const response = await fetch(url, {
    ...options,
    headers: {
      'Authorization': `Bearer ${LASTAPP_TOKEN}`,
      'LocationId': LASTAPP_LOCATION_ID,
      'Content-Type': 'application/json',
      ...(options.headers || {}),
    },
  });

  if (!response.ok) {
    const text = await response.text();
    throw new Error(`Last.app ${response.status}: ${text}`);
  }

  return response.json();
}

module.exports = { callLastApp, LASTAPP_LOCATION_ID };
