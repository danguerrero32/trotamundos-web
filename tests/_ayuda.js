// Utilidades de prueba compartidas: un fetch falso que imita PostgREST y Resend, como en Ascua.
export const S = { base: 'https://x.supabase.co', headers: { apikey: 'k', 'Content-Type': 'application/json' } };
export const AHORA = Date.parse('2026-10-23T10:00:00Z');

/** rutas: [[RegExp sobre "tabla?query", {json, status, method}]]. Guarda cada llamada en f.llamadas. */
export function fakeFetch(rutas = []) {
  const llamadas = [];
  const f = async (url, init = {}) => {
    const u = new URL(url); const path = u.pathname.replace('/rest/v1/', '') + u.search;
    const method = init.method || 'GET';
    llamadas.push({ url: String(url), path, method, body: init.body && typeof init.body === 'string' ? JSON.parse(init.body) : null, headers: init.headers || {} });
    const resp = (status, json) => ({ ok: status < 300, status, json: async () => json, text: async () => (json == null ? '' : JSON.stringify(json)) });
    if (u.hostname === 'api.resend.com') return resp(200, { id: 'm' });
    for (const [re, r] of rutas) {
      const m = path.match(re);
      if (m && (!r.method || r.method === method)) return resp(r.status || 200, typeof r.json === 'function' ? r.json(m, init) : r.json);
    }
    return resp(200, []);
  };
  f.llamadas = llamadas;
  return f;
}
