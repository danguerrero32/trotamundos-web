import { test } from 'node:test';
import assert from 'node:assert/strict';
import { supa, rest, rpc } from '../lib/supa.js';

test('supa: clave secreta nueva va solo en apikey', () => {
  const s = supa({ SUPABASE_URL: 'https://x.supabase.co/', SUPABASE_SERVICE_ROLE_KEY: 'sb_secret_abc' });
  assert.equal(s.base, 'https://x.supabase.co');
  assert.equal(s.headers.apikey, 'sb_secret_abc');
  assert.equal(s.headers.Authorization, undefined);
});

test('supa: clave JWT antigua va en apikey y en Authorization', () => {
  const s = supa({ SUPABASE_URL: 'https://x.supabase.co', SUPABASE_SERVICE_ROLE_KEY: 'eyJhbGciOiJIUzI1NiJ9.x.y' });
  assert.equal(s.headers.apikey, 'eyJhbGciOiJIUzI1NiJ9.x.y');
  assert.equal(s.headers.Authorization, 'Bearer eyJhbGciOiJIUzI1NiJ9.x.y');
});

test('supa: sin configuración devuelve null', () => {
  assert.equal(supa({}), null);
});

test('rpc llama a /rest/v1/rpc/<nombre> con POST y los argumentos', async () => {
  const llamadas = [];
  const fetch = async (url, init) => { llamadas.push({ url, init }); return { ok: true, status: 204, text: async () => '' }; };
  const s = supa({ SUPABASE_URL: 'https://x.supabase.co', SUPABASE_SERVICE_ROLE_KEY: 'sb_secret_abc' });
  await rpc(s, fetch, 'latir', { p_origen: 'vercel' });
  assert.equal(llamadas[0].url, 'https://x.supabase.co/rest/v1/rpc/latir');
  assert.equal(llamadas[0].init.method, 'POST');
  assert.equal(llamadas[0].init.body, '{"p_origen":"vercel"}');
});

test('rest lanza un error con método, ruta y estado si Supabase falla', async () => {
  const fetch = async () => ({ ok: false, status: 409, text: async () => 'duplicado' });
  const s = supa({ SUPABASE_URL: 'https://x.supabase.co', SUPABASE_SERVICE_ROLE_KEY: 'sb_secret_abc' });
  await assert.rejects(rest(s, fetch, 'platos?id=eq.1', { method: 'PATCH', body: {} }), /supabase PATCH platos 409 duplicado/);
});
