// Supabase por HTTP (PostgREST), sin dependencias, como en Ascua.
// Las claves nuevas (sb_secret_…) van solo en la cabecera apikey; las JWT antiguas, también como Bearer.

export function supa(env) {
  const base = String(env.SUPABASE_URL || '').replace(/\/$/, '');
  const key = env.SUPABASE_SERVICE_ROLE_KEY;
  if (!base || !key) return null;
  const headers = { apikey: key, 'Content-Type': 'application/json' };
  if (!key.startsWith('sb_')) headers.Authorization = `Bearer ${key}`;
  return { base, headers };
}

export async function rest(s, fetch, ruta, { method = 'GET', body, prefer } = {}) {
  const headers = { ...s.headers };
  if (prefer) headers.Prefer = prefer;
  const res = await fetch(`${s.base}/rest/v1/${ruta}`, { method, headers, body: body === undefined ? undefined : JSON.stringify(body) });
  if (!res.ok) throw new Error(`supabase ${method} ${ruta.split('?')[0]} ${res.status} ${await res.text()}`);
  if (res.status === 204) return null;
  const txt = await res.text();
  return txt ? JSON.parse(txt) : null;
}

export const rpc = (s, fetch, nombre, args = {}) => rest(s, fetch, `rpc/${nombre}`, { method: 'POST', body: args });
